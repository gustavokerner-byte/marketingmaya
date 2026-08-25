# MayaApp CDC — Dashboard Marketing Interno

Dashboard estático (GitHub Pages) da **a MayaApp CDC**, com 5 abas:

| Aba | Fonte de dados | Atualização |
|---|---|---|
| **Resumo Executivo** | deriva das outras fontes | automática |
| **Cadastros** | `data/cadastros.json` | manual — `tools/add_semana.py` (toda segunda) |
| **Ativações Físicas** | `data/ativacoes.json` | `tools/build_ativacoes.py` a partir de `data/qr/` |
| **Promotoras** | `data/promotoras.json` | manual — 2 formulários de campo (ver `docs/ROTINA_PROMOTORAS.md`) |
| **Instagram** | `data.json` (raiz) | GitHub Action + Windsor.ai (diária) |

Todas as semanas cortam **domingo a sábado**, alinhado ao BI da CWS.

## Estrutura

```
/
├── index.html                 # header + abas + os 4 painéis
├── style.css                  # tema Instagram (paleta MayaApp)
├── app.js                     # lógica do Instagram (KPIs, gráficos, filtro de período)
├── vendor/chart.umd.js        # Chart.js vendorizado (aba Instagram)
├── data.json                  # Instagram — atualizado pela GitHub Action
├── assets/
│   ├── logo.svg
│   ├── mx-dash.css            # estilos das abas + seções Resumo/Cadastros/Ativações
│   ├── mx-dash.js             # abas, KPIs e gráficos SVG (zero dependências)
│   └── promotoras.css         # estilos da aba Promotoras (prefixo pr-)
├── data/
│   ├── cadastros.json         # BI da CWS (manual)
│   ├── ativacoes.json         # gerado dos exports de QR
│   ├── promotoras.json        # frente Promotoras (2 formulários de campo)
│   ├── updates.json           # histórico de números/comparativos das rodadas (referência)
│   └── qr/                    # exports brutos de QR Code
├── scripts/
│   └── fetch-instagram-data.js  # data fetcher do Instagram (Windsor.ai)
├── tools/
│   ├── add_semana.py          # adiciona a semana fechada em cadastros.json
│   └── build_ativacoes.py     # regenera ativacoes.json dos exports de QR
├── docs/
│   ├── BRIEFING_CLAUDE_CODE.md # como as 4 abas foram integradas
│   └── ROTINA_SEMANAL.md       # rotina de segunda-feira (operação)
└── .github/workflows/update-instagram-data.yml
```

## Arquitetura das abas

O **Instagram** é independente: `app.js` + `style.css` + `data.json` continuam como
sempre; as seções de IG apenas passam a morar dentro do painel `#mx-panel-instagram`.
O **filtro de período (7d/30d/90d) existe só na aba Instagram**. As demais abas são
estáticas (recortes fechados). Tudo com prefixo `mx-` não colide com o Instagram.
A paleta MayaApp é aplicada às abas novas via aliases de token no `index.html`.

## Rodar localmente

O dashboard usa `fetch()` de arquivos locais, então precisa de um servidor HTTP
(abrir via `file://` é bloqueado pelo navegador):

```bash
python3 -m http.server 8000   # http://localhost:8000
```

## Operação semanal

Ver **`docs/ROTINA_SEMANAL.md`**. Em resumo, toda segunda:

```bash
python3 tools/add_semana.py         # cadastros da semana fechada (números do BI)
python3 tools/build_ativacoes.py    # se chegaram exports de QR novos em data/qr/
git add data/ && git commit -m "dados da semana" && git push
```

O Instagram não exige nada — a GitHub Action atualiza `data.json` sozinha (11:00 UTC).
O GitHub Pages republica a cada commit.
