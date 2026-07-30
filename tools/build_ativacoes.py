#!/usr/bin/env python3
"""
Gera data/ativacoes.json a partir dos exports de QR Code.

Uso:
    python3 tools/build_ativacoes.py

Coloque os exports (.csv ou .xlsx) em data/qr/ e rode. O script:
  - le todos os arquivos da pasta
  - remove leituras duplicadas entre arquivos (mesmo timestamp + mesmo QR)
  - converte UTC -> America/Sao_Paulo
  - agrupa por semana DOMINGO->SABADO (mesmo corte do BI da CWS)
  - escreve data/ativacoes.json

Para adicionar uma frente nova, inclua o nome do QR em FRENTES.
O "Nome do QR" precisa bater exatamente com o valor do export.
"""

import json
import os
import sys
import glob
import unicodedata
from datetime import datetime, timedelta, timezone

try:
    import pandas as pd
except ImportError:
    sys.exit("pandas nao instalado. Rode: pip install pandas openpyxl")

# ---------------------------------------------------------------- config
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QR_DIR = os.path.join(ROOT, "data", "qr")
OUT = os.path.join(ROOT, "data", "ativacoes.json")

# nome do QR no export -> rotulo exibido no dashboard
FRENTES = {
    "pilastra1_boulevard_cdcQ": {
        "label": "Pilastra Boulevard",
        "tipo": "Pilastra",
        "local": "Boulevard CDC",
        "instalacao": "2026-06-18",
    },
    "Adesivo": {
        "label": "Flyers",
        "tipo": "Flyer",
        "local": "Distribuição em campo",
        "instalacao": "2026-06-02",
    },
    "Entrada Sao Caetano": {
        "label": "Banner São Caetano",
        "tipo": "Banner",
        "local": "Entrada São Caetano",
        "instalacao": "2026-06-18",
    },
}

TZ = timezone(timedelta(hours=-3))  # America/Sao_Paulo


def semana_domingo(ts):
    """Retorna o domingo que inicia a semana do timestamp."""
    # weekday(): Mon=0 ... Sun=6  ->  deslocamento ate o domingo anterior
    return (ts - timedelta(days=(ts.weekday() + 1) % 7)).date()


def limpa_cidade(s):
    if not isinstance(s, str):
        return ""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return s.strip().title()


def carrega():
    arquivos = sorted(
        glob.glob(os.path.join(QR_DIR, "*.csv"))
        + glob.glob(os.path.join(QR_DIR, "*.xlsx"))
    )
    if not arquivos:
        sys.exit(f"Nenhum export encontrado em {QR_DIR}")

    frames = []
    for f in arquivos:
        d = pd.read_csv(f) if f.lower().endswith(".csv") else pd.read_excel(f)
        faltando = {"Data/Hora", "Nome do QR"} - set(d.columns)
        if faltando:
            print(f"  ! {os.path.basename(f)} ignorado (faltam colunas: {faltando})")
            continue
        frames.append(d)
        print(f"  + {os.path.basename(f)}: {len(d)} linhas")

    raw = pd.concat(frames, ignore_index=True)
    antes = len(raw)
    raw["_k"] = raw["Data/Hora"].astype(str) + "|" + raw["Nome do QR"].astype(str)
    df = raw.drop_duplicates("_k").copy()
    if antes != len(df):
        print(f"  = {antes - len(df)} leituras duplicadas entre arquivos removidas")

    desconhecidos = set(df["Nome do QR"].dropna().unique()) - set(FRENTES)
    if desconhecidos:
        print(f"  ! QR sem frente mapeada, ignorado: {desconhecidos}")
    df = df[df["Nome do QR"].isin(FRENTES)].copy()

    df["ts"] = pd.to_datetime(df["Data/Hora"], utc=True).dt.tz_convert(TZ)
    df["frente"] = df["Nome do QR"].map(lambda q: FRENTES[q]["label"])
    df["unico"] = (
        pd.to_numeric(df.get("Visitante único"), errors="coerce").fillna(0).astype(int)
    )
    df["semana"] = df["ts"].map(semana_domingo)
    df["cidade"] = df.get("Cidade", pd.Series(dtype=str)).map(limpa_cidade)
    return df


def main():
    print("Lendo exports de QR Code...")
    df = carrega()

    labels = [FRENTES[k]["label"] for k in FRENTES]
    hoje = datetime.now(TZ).date()
    # ultima semana FECHADA (sabado ja passou)
    dom_atual = semana_domingo(datetime.now(TZ))
    sem_fechada = dom_atual - timedelta(days=7)

    # ---- serie semanal
    semanas = []
    for dom in sorted(df["semana"].unique()):
        sub = df[df["semana"] == dom]
        sab = dom + timedelta(days=6)
        semanas.append(
            {
                "inicio": dom.isoformat(),
                "fim": sab.isoformat(),
                "parcial": sab >= hoje,
                "scans": int(len(sub)),
                "unicos": int(sub["unico"].sum()),
                "por_frente": {
                    lb: int((sub["frente"] == lb).sum()) for lb in labels
                },
                "unicos_por_frente": {
                    lb: int(sub.loc[sub["frente"] == lb, "unico"].sum())
                    for lb in labels
                },
            }
        )

    # ---- totais por frente (acumulado, exclui semana parcial? nao: acumulado e tudo)
    frentes = []
    for qr, meta in FRENTES.items():
        lb = meta["label"]
        sub = df[df["frente"] == lb]
        sf = sub[sub["semana"] == sem_fechada]
        sa = sub[sub["semana"] == sem_fechada - timedelta(days=7)]
        frentes.append(
            {
                "label": lb,
                "qr": qr,
                "tipo": meta["tipo"],
                "local": meta["local"],
                "instalacao": meta["instalacao"],
                "scans_total": int(len(sub)),
                "unicos_total": int(sub["unico"].sum()),
                "scans_semana": int(len(sf)),
                "unicos_semana": int(sf["unico"].sum()),
                "scans_semana_anterior": int(len(sa)),
                "recorrencia": round(len(sub) / sub["unico"].sum(), 2)
                if sub["unico"].sum()
                else None,
                "primeiro_scan": sub["ts"].min().date().isoformat() if len(sub) else None,
                "ultimo_scan": sub["ts"].max().date().isoformat() if len(sub) else None,
            }
        )
    frentes.sort(key=lambda f: -f["scans_total"])

    sf_all = df[df["semana"] == sem_fechada]
    sa_all = df[df["semana"] == sem_fechada - timedelta(days=7)]

    so = df["Sistema operacional"].value_counts() if "Sistema operacional" in df else {}
    cid = df[df["cidade"] != ""]["cidade"].value_counts() if "cidade" in df else {}

    out = {
        "_gerado_em": datetime.now(TZ).isoformat(timespec="seconds"),
        "_fonte": "Exports de QR Code (data/qr/)",
        "_corte_semanal": "domingo a sabado (alinhado ao BI da CWS)",
        "semana_referencia": {
            "inicio": sem_fechada.isoformat(),
            "fim": (sem_fechada + timedelta(days=6)).isoformat(),
        },
        "totais": {
            "scans_total": int(len(df)),
            "unicos_total": int(df["unico"].sum()),
            "scans_semana": int(len(sf_all)),
            "unicos_semana": int(sf_all["unico"].sum()),
            "scans_semana_anterior": int(len(sa_all)),
            "unicos_semana_anterior": int(sa_all["unico"].sum()),
            "recorrencia": round(len(df) / df["unico"].sum(), 2)
            if df["unico"].sum()
            else None,
        },
        "frentes": frentes,
        "semanas": semanas,
        "sistema_operacional": {str(k): int(v) for k, v in dict(so).items()},
        "top_cidades": [
            {"cidade": str(k), "scans": int(v)} for k, v in list(dict(cid).items())[:10]
        ],
        "fora_da_capital_pct": round(
            100 * (df["cidade"] != "Sao Paulo").mean(), 1
        )
        if len(df)
        else 0,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

    t = out["totais"]
    print(f"\nOK -> {OUT}")
    print(f"  {t['scans_total']} scans / {t['unicos_total']} unicos ({len(frentes)} frentes)")
    print(f"  Semana de referencia {out['semana_referencia']['inicio']} a "
          f"{out['semana_referencia']['fim']}: {t['scans_semana']} scans "
          f"(anterior: {t['scans_semana_anterior']})")


if __name__ == "__main__":
    main()
