"""CSI bruto -> janelas causais. Não interpola falhas nem usa rótulos de atividade."""

import csv
from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path

import numpy as np

from ferramentas.csi_formato import COLUNAS, LinhaInvalida, ler_campos
from . import JOINTS, VERSION


@dataclass(frozen=True)
class Config:
    bin_s: float = 0.05
    bins: int = 20
    min_coverage: float = 0.8
    max_gap_s: float = 0.1
    min_packets: int = 10

    def validate(self):
        if type(self.bins) is not int or type(self.min_packets) is not int:
            raise ValueError("Quantidade de bins/pacotes precisa ser inteira.")
        if not np.isfinite([self.bin_s, self.min_coverage, self.max_gap_s]).all():
            raise ValueError("Configuração contém número não finito.")
        if not 0.01 <= self.bin_s <= 1 or not 2 <= self.bins <= 200:
            raise ValueError("Intervalo/janela fora dos limites suportados.")
        if not 0 < self.min_coverage <= 1 or self.max_gap_s <= 0 or self.min_packets < 2:
            raise ValueError("Critérios de qualidade inválidos.")


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def read_recording(path):
    """Exige perfil S0 conhecido; rejeita corrupção, mistura de links e reinícios.

    Um wrap de uint32 no relógio é diferente de um reinício. Ao dividir arquivos,
    conservar a sessão original para impedir vazamento entre treino e teste.
    """
    path = Path(path)
    sidecar = path.with_suffix(".json")
    if not sidecar.exists():
        raise ValueError(f"Faltam metadados de sessão: {sidecar}")
    meta = json.loads(sidecar.read_text(encoding="utf-8-sig"))
    if not isinstance(meta.get("sessao"), str) or not meta["sessao"].strip():
        raise ValueError("Informe sessao no JSON da coleta.")
    records, pc = [], []
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        if next(reader, None) != ["pc_tempo_s"] + COLUNAS:
            raise ValueError("Cabeçalho CSI diferente do capturar.py; não adivinhar colunas.")
        for line, fields in enumerate(reader, 2):
            try:
                if len(fields) != len(COLUNAS) + 1:
                    raise ValueError("quantidade incorreta de campos")
                r = ler_campos(fields[1:])
                time_pc = float(fields[0])
                if not np.isfinite(time_pc) or time_pc < 0:
                    raise ValueError("tempo do PC inválido")
                if len(r.valores) != 384 or any(v < -128 or v > 127 for v in r.valores):
                    raise ValueError("esperados 384 bytes CSI com sinal")
                if not 0 <= r.id < 2**32 or not -(2**31) <= r.local_timestamp < 2**32:
                    raise ValueError("contador/relógio fora de uint32/int32")
                if r.first_word not in (0, 1) or not -127 <= r.rssi <= 0:
                    raise ValueError("RSSI/first_word inválido")
                profile = {k: getattr(r, k) for k in ("mac", "channel", "secondary_channel", "len")}
                profile.update({k: r.extras[k] for k in ("sig_mode", "bandwidth", "stbc", "mcs", "ant")})
                if (profile["sig_mode"], profile["bandwidth"], profile["stbc"], profile["secondary_channel"]) != (1, 1, 0, 2):
                    raise ValueError("v0 suporta HT40, sem STBC, secundário abaixo (perfil S0)")
                if records and profile != expected_profile:
                    raise ValueError("perfil/link mudou; separe as coletas preservando a sessão")
                expected_profile = profile
            except (ValueError, KeyError, LinhaInvalida) as error:
                raise ValueError(f"{path.name}, linha {line}: {error}") from error
            records.append(r)
            pc.append(time_pc)
    if len(records) < 2:
        raise ValueError("Coleta precisa de pelo menos duas leituras.")
    if np.any(np.diff(pc) < 0):
        raise ValueError("Relógio do PC recuou; verifique a coleta.")
    ids = np.array([r.id for r in records], dtype=np.int64)
    if np.any(np.diff(ids) <= 0):
        raise ValueError("ID repetido, reinício ou wrap do contador: divida a coleta por boot.")
    stamps = np.array([r.local_timestamp % 2**32 for r in records], dtype=np.int64)
    delta = np.diff(stamps)
    wraps = (stamps[:-1] > 0.9 * 2**32) & (stamps[1:] < 0.1 * 2**32) & (delta < 0)
    delta[wraps] += 2**32
    if np.any(delta <= 0):
        raise ValueError("Relógio da placa repetiu/recuou; não ordenar nem unir boots diferentes.")
    if np.any(delta > 30_000_000):
        raise ValueError("Intervalo acima de 30 s: divida a coleta por segmento de aquisição.")
    t = np.r_[0, np.cumsum(delta)] / 1e6
    iq = np.array([r.valores for r in records], dtype=np.float32)
    # 384 bytes = 192 pares em LLTF/HT-LTF. Não são 192 frequências independentes.
    # Descarta sempre os dois primeiros pares para manter representação consistente.
    amplitude = np.hypot(iq[:, 0::2], iq[:, 1::2])[:, 2:]
    if np.any(amplitude.mean(axis=1) <= 0):
        raise ValueError("Pacote CSI inteiramente zerado; investigar antes do treinamento.")
    gain = amplitude.mean(axis=1, keepdims=True)
    # Perfil relativo + escala original auxiliar. Não fingir conhecer o AGC do chip.
    features = np.concatenate((np.log1p(amplitude / gain), np.log1p(gain),
                               np.array([r.rssi for r in records])[:, None] / 100), axis=1).astype(np.float32)
    missing = int((np.diff(ids) - 1).sum())
    return {
        "t": t, "features": features, "ids": ids,
        "meta": {"version": VERSION, "schema": 1, "source_name": path.name,
                 "source_sha256": sha256(path), "sidecar_sha256": sha256(sidecar),
                 "session": meta["sessao"].strip(), "source_metadata": meta,
                 "data_kind": "sintetico" if meta.get("sintetico") is True else "medido",
                 "profile": expected_profile, "joint_names": list(JOINTS),
                 "feature_layout": "log1p(amplitude[2:192]/mean), log1p(mean), RSSI/100",
                 "clock": "ESP32 local_timestamp, segundos desde o primeiro pacote salvo",
                 "recording_quality": {"packets": len(records), "missing_ids": missing,
                    "missing_fraction": missing/(missing+len(records)),
                    "duration_rx_s": float(t[-1]), "max_gap_s": float(delta.max()/1e6),
                    "clock_wraps": int(wraps.sum())}},
    }


def prepare(recording, config=Config()):
    """Médias em bins de tempo fixo, com máscara e recusa de buracos longos.

    Uma janela em t usa [t-contexto, t), sem ler o futuro. Zero em um bin vazio
    é acompanhado de observed=False; não é uma amostra interpolada.
    """
    config.validate()
    t, features = recording["t"], recording["features"]
    last_bin = int(np.floor(t[-1] / config.bin_s + 1e-10))
    if last_bin < config.bins:
        raise ValueError("Coleta mais curta que a janela temporal configurada.")
    means = np.zeros((last_bin, features.shape[1]), np.float32)
    counts = np.zeros(last_bin, np.int32)
    bounds = np.searchsorted(t, np.arange(last_bin + 1) * config.bin_s, side="left")
    for b, (lo, hi) in enumerate(zip(bounds[:-1], bounds[1:])):
        counts[b] = hi-lo
        if hi > lo:
            means[b] = features[lo:hi].mean(axis=0)
    anchors = np.arange(config.bins, last_bin+1)
    x = np.stack([means[e-config.bins:e] for e in anchors])
    observed = np.stack([counts[e-config.bins:e] > 0 for e in anchors])
    packet_count = np.array([counts[e-config.bins:e].sum() for e in anchors], np.int32)
    max_gap = []
    for e in anchors:
        start, end = (e-config.bins)*config.bin_s, e*config.bin_s
        selected = t[bounds[e-config.bins]:bounds[e]]
        max_gap.append(np.diff(np.r_[start, selected, end]).max())
    max_gap = np.array(max_gap)
    valid = (observed.mean(axis=1)+1e-9 >= config.min_coverage) & (max_gap <= config.max_gap_s+1e-9) & (packet_count >= config.min_packets)
    meta = dict(recording["meta"], config=asdict(config), has_labels=False)
    n = len(anchors)
    return {"x": x, "observed": observed, "times": anchors*config.bin_s,
            "valid": valid, "max_gap_s": max_gap, "packet_count": packet_count,
            "y": np.zeros((n, len(JOINTS), 2), np.float32),
            "label_mask": np.zeros((n, len(JOINTS)), bool), "meta": meta}


def validate_bundle(data):
    meta = data["meta"]
    cfg = Config(**meta["config"])
    cfg.validate()
    n = len(data["times"])
    shapes = {"x": (n,cfg.bins,192), "observed": (n,cfg.bins), "valid": (n,),
              "y": (n,6,2), "label_mask": (n,6), "max_gap_s": (n,), "packet_count": (n,)}
    if n == 0 or meta.get("schema") != 1 or meta.get("joint_names") != list(JOINTS):
        raise ValueError("Conjunto vazio ou schema de pose incompatível.")
    for key, shape in shapes.items():
        if data[key].shape != shape or not np.isfinite(data[key]).all():
            raise ValueError(f"Array inválido: {key}.")
    if data["times"].shape != (n,) or not np.isfinite(data["times"]).all() or np.any(np.diff(data["times"]) <= 0):
        raise ValueError("Tempos do conjunto inválidos.")
    for key in ("observed", "valid", "label_mask"):
        if data[key].dtype != np.dtype(bool):
            raise ValueError(f"Máscara {key} precisa ser booleana.")
    if np.any((data["y"] < 0) | (data["y"] > 1)):
        raise ValueError("Coordenadas devem estar entre 0 e 1.")
    if not meta.get("session") or meta.get("data_kind") not in ("medido", "sintetico"):
        raise ValueError("Sessão/proveniência ausente.")
    if not meta.get("has_labels") and data["label_mask"].any():
        raise ValueError("Rótulos sem metadados de alinhamento.")


def save_bundle(path, data):
    validate_bundle(data)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    # Abrir explicitamente impede que numpy altere o nome acrescentando .npz.
    with path.open("wb") as f:
        np.savez_compressed(f, **{k:v for k,v in data.items() if k != "meta"},
                            metadata_json=np.array(json.dumps(data["meta"], ensure_ascii=False, allow_nan=False)))


def load_bundle(path):
    with np.load(path, allow_pickle=False) as f:
        data = {k:f[k] for k in f.files if k != "metadata_json"}
        data["meta"] = json.loads(str(f["metadata_json"]))
    validate_bundle(data)
    return data


def summary(data):
    valid = data["valid"]
    return dict(data["meta"], window_quality={
        "total": len(valid), "accepted": int(valid.sum()), "rejected": int((~valid).sum()),
        "accepted_fraction": float(valid.mean()),
        "labeled_and_accepted": int((valid & (data["label_mask"].sum(axis=1) >= 4)).sum()),
        "note": "Qualidade da entrada; não é acurácia de pose. Janelas sobrepostas não são ensaios independentes.",
    })
