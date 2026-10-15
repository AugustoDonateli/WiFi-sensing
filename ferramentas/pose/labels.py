"""Gabarito visual explícito: seis articulações, confiança e alinhamento temporal."""

import csv
import json
from pathlib import Path

import numpy as np

from . import JOINTS
from .data import sha256, validate_bundle

LABEL_COLUMNS = ["tempo_video_s", "pessoas"] + [f"{j}_{axis}" for j in JOINTS for axis in ("x", "y", "confianca")]


def read_labels(path):
    times, people, coords, confidences = [], [], [], []
    with Path(path).open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != LABEL_COLUMNS:
            raise ValueError("Cabeçalho do gabarito incompatível; consulte o modelo de CSV.")
        for line, row in enumerate(reader, 2):
            try:
                t, count = float(row["tempo_video_s"]), int(row["pessoas"])
                xy = np.array([[float(row[f"{j}_x"]), float(row[f"{j}_y"])] for j in JOINTS])
                confidence = np.array([float(row[f"{j}_confianca"]) for j in JOINTS])
                if count < 0 or t < 0 or not np.isfinite([t, *xy.ravel(), *confidence]).all():
                    raise ValueError("valores não finitos ou negativos")
                if np.any((xy < 0) | (xy > 1)) or np.any((confidence < 0) | (confidence > 1)):
                    raise ValueError("coordenadas e confiança devem estar em [0,1]")
            except (ValueError, TypeError) as error:
                raise ValueError(f"Gabarito, linha {line}: {error}") from error
            times.append(t)
            people.append(count)
            coords.append(xy)
            confidences.append(confidence)
    if len(times) < 2 or np.any(np.diff(times) <= 0):
        raise ValueError("Gabarito deve ter tempos estritamente crescentes, sem duplicatas.")
    return np.array(times), np.array(people), np.array(coords, np.float32), np.array(confidences)


def clock_fit(spec):
    """csi_s -> video_s por marcadores medidos; nunca por simples igualdade do início."""
    if spec.get("schema") != 1 or not spec.get("metodo") or not spec.get("observacoes"):
        raise ValueError("Descreva o método e a revisão da sincronização (schema 1).")
    anchors = np.array([[a["csi_s"], a["video_s"]] for a in spec.get("marcadores", [])], dtype=float)
    if anchors.ndim != 2 or anchors.shape[1:] != (2,) or len(anchors) < 2 or not np.isfinite(anchors).all():
        raise ValueError("São necessários pelo menos dois marcadores de sincronização finitos.")
    if np.any(anchors < 0) or np.any(np.diff(anchors, axis=0) <= 0) or np.ptp(anchors[:,0]) < 5:
        raise ValueError("Marcadores devem crescer nos dois relógios e cobrir pelo menos 5 s.")
    dimensions = np.array([spec["largura_imagem"], spec["altura_imagem"]], dtype=float)
    uncertainty = float(spec["incerteza_s"])
    if not np.isfinite(dimensions).all() or np.any(dimensions < 16) or np.any(dimensions != np.floor(dimensions)):
        raise ValueError("Dimensões da imagem inválidas.")
    if not np.isfinite(uncertainty) or not 0 < uncertainty <= .05:
        raise ValueError("Incerteza temporal deve ser informada e estar entre 0 e 50 ms.")
    slope, intercept = np.polyfit(anchors[:,0], anchors[:,1], 1)
    residual = float(np.abs(anchors[:,1]-(slope*anchors[:,0]+intercept)).max())
    if not .98 <= slope <= 1.02 or residual + uncertainty > .05:
        raise ValueError("Relógios incompatíveis ou sincronização acima de 50 ms; revisar marcadores.")
    return {"slope": float(slope), "intercept": float(intercept), "max_residual_s": residual,
            "uncertainty_s": uncertainty, "csi_start_s": float(anchors[0,0]),
            "csi_end_s": float(anchors[-1,0]), "image_size": dimensions.astype(int).tolist()}


def attach_labels(data, csv_path, sync_path, min_confidence=.5, max_delta_s=.03):
    validate_bundle(data)
    if not 0 < min_confidence <= 1 or not 0 < max_delta_s <= .05:
        raise ValueError("Limiares de confiança/tempo inválidos.")
    spec = json.loads(Path(sync_path).read_text(encoding="utf-8-sig"))
    mapping = clock_fit(spec)
    times, people, coords, confidence = read_labels(csv_path)
    wanted = mapping["slope"]*data["times"]+mapping["intercept"]
    right = np.clip(np.searchsorted(times, wanted), 0, len(times)-1)
    left = np.maximum(right-1, 0)
    index = np.where(np.abs(times[left]-wanted) <= np.abs(times[right]-wanted), left, right)
    delta = np.abs(times[index]-wanted)
    # Recusa extrapolação e frames com 0 ou múltiplas pessoas. Confiança é do professor,
    # nunca uma suposta confiança do modelo de rádio.
    matched = ((data["times"] >= mapping["csi_start_s"]) & (data["times"] <= mapping["csi_end_s"])
               & (wanted >= times[0]) & (wanted <= times[-1]) & (delta <= max_delta_s)
               & (delta+mapping["uncertainty_s"]+mapping["max_residual_s"] <= .05)
               & (people[index] == 1))
    mask = (confidence[index] >= min_confidence) & matched[:,None]
    # Sentinela zero nunca vira alvo válido: label_mask é obrigatória no loss/métricas.
    y = np.where(mask[:,:,None], coords[index], 0).astype(np.float32)
    result = dict(data, y=y, label_mask=mask)
    result["meta"] = dict(data["meta"], has_labels=True, label_source_sha256=sha256(csv_path),
                          sync_source_sha256=sha256(sync_path), image_size=mapping["image_size"],
                          synchronization=mapping, label_min_confidence=min_confidence,
                          label_max_delta_s=max_delta_s)
    validate_bundle(result)
    return result


def import_openpose(folder, timestamps, destination, width, height, scale):
    """Importa BODY_25 pronto, sem executar/baixar modelos de terceiros.

    CSV de tempos: arquivo,tempo_video_s; um nome JSON por quadro, timestamps reais.
    Não deduz tempos pelo FPS nominal nem escolhe uma pessoa entre várias.
    """
    if width < 16 or height < 16 or scale not in ("pixels", "normalizada"):
        raise ValueError("Informe dimensões e escala real da saída do OpenPose.")
    folder = Path(folder).resolve()
    output = []
    with Path(timestamps).open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != ["arquivo", "tempo_video_s"]:
            raise ValueError("Tempos devem ter cabeçalho arquivo,tempo_video_s.")
        previous, seen = -1., set()
        for row in reader:
            time = float(row["tempo_video_s"])
            path = (folder/row["arquivo"]).resolve()
            if not path.is_relative_to(folder) or path.suffix.lower() != ".json" or path in seen:
                raise ValueError("JSON fora da pasta, extensão incorreta ou quadro duplicado.")
            if not np.isfinite(time) or time < 0 or time <= previous:
                raise ValueError("Tempos dos quadros precisam ser crescentes e finitos.")
            seen.add(path)
            previous = time
            people = json.loads(path.read_text(encoding="utf-8"))["people"]
            values = np.zeros((6,3))
            if len(people) == 1:
                points = np.array(people[0]["pose_keypoints_2d"], dtype=float)
                if points.shape != (75,) or not np.isfinite(points).all():
                    raise ValueError("Esperado BODY_25 (75 valores x,y,confiança) finito.")
                values = points.reshape(25,3)[[5,6,7,2,3,4]].copy()
                if scale == "pixels":
                    values[:,:2] /= [width,height]
                if np.any((values < 0) | (values > 1)):
                    raise ValueError("Escala do OpenPose incompatível; não recortar coordenadas silenciosamente.")
            output.append([time,len(people),*values.ravel().tolist()])
    if len(output) < 2:
        raise ValueError("Não há quadros suficientes para importar.")
    dest = Path(destination)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w",newline="",encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(LABEL_COLUMNS)
        writer.writerows(output)
    return len(output)
