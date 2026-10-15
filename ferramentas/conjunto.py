"""Lista as coletas gravadas e separa sessões de ajuste e de teste. Só biblioteca padrão."""

import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_PADRAO = RAIZ / "dados" / "brutos"

# Verdade usada na avaliação binária (movimento sim/não).
COM_MOVIMENTO = {"andando", "sentar_levantar", "queda_simulada", "mao"}
SEM_MOVIMENTO = {"vazio", "parado"}


def listar(pasta=PASTA_PADRAO):
    """Devolve as coletas (.csv com .json ao lado), cada uma com caminho, rótulo e sessão.

    Coletas com "descartada": true no .json ficam de fora (o motivo fica escrito no "obs").
    """
    coletas = []
    for csv in sorted(Path(pasta).glob("*.csv")):
        js = csv.with_suffix(".json")
        if not js.exists():
            continue
        meta = json.loads(js.read_text(encoding="utf-8"))
        if meta.get("descartada"):
            continue
        sessao = meta.get("sessao") or _sessao_em(meta.get("obs", ""))
        coletas.append({"caminho": csv, "rotulo": meta.get("rotulo", "?"), "sessao": sessao or "?", "meta": meta})
    return coletas


def _sessao_em(texto):
    m = re.search(r"\bS\d+\b", texto or "")
    return m.group(0) if m else None


def _numero(sessao):
    m = re.search(r"\d+", sessao)
    return int(m.group(0)) if m else None


def dividir(coletas, ajuste=None, teste=None):
    """Separa por sessão. Padrão do protocolo: sessões ímpares ajustam, pares testam.

    S0 é só teste de montagem (por exemplo em casa) e nunca entra no padrão: nem no ajuste,
    nem no teste. Para usar, é preciso pedir pelo nome (--ajuste S0).
    """
    sessoes = sorted({c["sessao"] for c in coletas if _numero(c["sessao"]) != 0 or c["sessao"] in (ajuste or []) + (teste or [])})
    if ajuste is None and teste is None:
        ajuste = [s for s in sessoes if (_numero(s) or 0) % 2 == 1]
        teste = [s for s in sessoes if (_numero(s) or 1) % 2 == 0]
    elif ajuste is None:
        ajuste = [s for s in sessoes if s not in teste]
    elif teste is None:
        teste = [s for s in sessoes if s not in ajuste]
    comum = set(ajuste) & set(teste)
    if comum:
        raise ValueError(f"a mesma sessão não pode estar no ajuste e no teste: {sorted(comum)}")
    return [c for c in coletas if c["sessao"] in ajuste], [c for c in coletas if c["sessao"] in teste], sorted(ajuste), sorted(teste)
