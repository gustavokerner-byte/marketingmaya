#!/usr/bin/env python3
"""
Adiciona a semana fechada ao data/cadastros.json.

Rode toda segunda com os numeros do print do BI (recorte domingo a sabado).

Modo interativo (recomendado):
    python3 tools/add_semana.py

Modo direto:
    python3 tools/add_semana.py --inicio 2026-07-26 --cadastros 12 --primeiro-uso 9 \
        --ativos 44 --base 429 --produtos 55 --produtos-salvos 31 \
        --imagens 620 --imagens-salvas 210 --heavy 3

Tambem atualiza os blocos "acumulado" e "mes" se voce passar --acumulado-cadastros etc.
Se a semana informada ja existir, o script pergunta antes de sobrescrever.
"""

import argparse
import json
import os
import sys
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "cadastros.json")

CAMPOS = [
    ("cadastros", "Novos cadastros na semana", int),
    ("primeiro_uso", "Usuarios com primeiro uso", int),
    ("ativos_mes", "Usuarios ativos no mes", int),
    ("base_cadastrada_fim", "Usuarios cadastrados (acumulado no fim da semana)", int),
    ("produtos_cadastrados", "Produtos cadastrados", int),
    ("produtos_salvos", "Produtos salvos", int),
    ("imagens_geradas", "Imagens geradas", int),
    ("imagens_salvas", "Imagens salvas", int),
    ("heavy_users", "Heavy users (6+ cadastros)", int),
]


def ultimo_domingo_fechado(hoje=None):
    hoje = hoje or date.today()
    dom_atual = hoje - timedelta(days=(hoje.weekday() + 1) % 7)
    return dom_atual - timedelta(days=7)


def pergunta(label, tipo, default=None):
    sufixo = f" [{default}]" if default is not None else ""
    while True:
        v = input(f"  {label}{sufixo}: ").strip()
        if not v and default is not None:
            return default
        try:
            return tipo(v)
        except ValueError:
            print("    valor invalido, tente de novo")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inicio", help="domingo de inicio da semana (YYYY-MM-DD)")
    for k, label, _ in CAMPOS:
        ap.add_argument("--" + k.replace("_", "-"), type=int)
    ap.add_argument("--acumulado-cadastros", type=int)
    ap.add_argument("--acumulado-primeiro-uso", type=int)
    ap.add_argument("--mes-cadastros", type=int)
    ap.add_argument("--mes-primeiro-uso", type=int)
    args = ap.parse_args()

    if not os.path.exists(PATH):
        sys.exit(f"Nao encontrei {PATH}")
    with open(PATH, encoding="utf-8") as fh:
        d = json.load(fh)

    interativo = args.cadastros is None

    inicio = args.inicio
    if not inicio:
        sugestao = ultimo_domingo_fechado().isoformat()
        if interativo:
            inicio = input(f"Domingo de inicio da semana [{sugestao}]: ").strip() or sugestao
        else:
            inicio = sugestao
    try:
        d0 = date.fromisoformat(inicio)
    except ValueError:
        sys.exit("Data invalida. Use o formato YYYY-MM-DD.")
    if d0.weekday() != 6:
        sys.exit(f"{inicio} nao e domingo ({d0.strftime('%A')}). O BI corta domingo a sabado.")
    fim = (d0 + timedelta(days=6)).isoformat()

    print(f"\nSemana {inicio} a {fim}")
    if interativo:
        print("Preencha com os numeros do print do BI (Enter mantem 0):\n")

    reg = {"inicio": inicio, "fim": fim}
    for k, label, tipo in CAMPOS:
        v = getattr(args, k)
        reg[k] = pergunta(label, tipo, 0) if v is None else v
    reg["produtos_sucesso"] = reg["produtos_cadastrados"]
    if reg["base_cadastrada_fim"]:
        reg["heavy_users_pct"] = None

    semanas = d.setdefault("semanas", [])
    existente = next((i for i, s in enumerate(semanas) if s["inicio"] == inicio), None)
    if existente is not None:
        if interativo:
            if input(f"\nSemana {inicio} ja existe. Sobrescrever? [s/N] ").lower() != "s":
                sys.exit("Cancelado.")
        semanas[existente] = reg
        acao = "atualizada"
    else:
        semanas.append(reg)
        acao = "adicionada"
    semanas.sort(key=lambda s: s["inicio"])

    d["semana_referencia"] = {"inicio": inicio, "fim": fim}
    d["_atualizado_em"] = date.today().isoformat()

    # atualizacoes opcionais dos blocos acumulado / mes
    if args.acumulado_cadastros is not None:
        d["acumulado"]["cadastros"] = args.acumulado_cadastros
    elif reg["base_cadastrada_fim"]:
        d["acumulado"]["cadastros"] = reg["base_cadastrada_fim"]
    if args.acumulado_primeiro_uso is not None:
        d["acumulado"]["primeiro_uso"] = args.acumulado_primeiro_uso
    if args.mes_cadastros is not None:
        d["mes"]["cadastros"] = args.mes_cadastros
    if args.mes_primeiro_uso is not None:
        d["mes"]["primeiro_uso"] = args.mes_primeiro_uso

    with open(PATH, "w", encoding="utf-8") as fh:
        json.dump(d, fh, ensure_ascii=False, indent=2)

    ant = semanas[-2] if len(semanas) > 1 else None
    print(f"\nOK: semana {acao}. {len(semanas)} semanas na serie.")
    print(f"  Cadastros: {reg['cadastros']}", end="")
    if ant:
        delta = reg["cadastros"] - ant["cadastros"]
        pct = (100 * delta / ant["cadastros"]) if ant["cadastros"] else 0
        print(f"  ({delta:+d} vs semana anterior, {pct:+.1f}%)")
    else:
        print()
    print(f"  Primeiro uso: {reg['primeiro_uso']}")
    print(f"  Base acumulada: {reg['base_cadastrada_fim']}")
    print("\nNao esqueca de rodar tools/build_ativacoes.py se chegaram exports de QR novos.")


if __name__ == "__main__":
    main()
