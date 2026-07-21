# MayaApp CDC — Instagram Dashboard

Dashboard de social media (Instagram) da **a MayaApp CDC** ([@mayaapp.cdc](https://www.instagram.com/mayaapp.cdc/)).
Site **100% estático** — HTML + CSS + JavaScript vanilla, sem build step. Lê os dados
de `data.json` no próprio diretório e não faz nenhuma chamada a API em runtime.

## Arquitetura

```
Windsor.ai (Instagram Graph API)
        │
        ▼
   Cowork Task (diária) — puxa dados via MCP Windsor.ai
        │
        ▼
   data.json (commitado no repo)
        │
        ▼
   GitHub Pages — dashboard estático lê data.json
```

Toda a lógica de data fetching acontece fora do dashboard (no Cowork, diariamente).
O dashboard apenas renderiza o `data.json` mais recente do repositório.

## Estrutura de arquivos

```
/
├── index.html            # marcação + header/seções
├── style.css             # tema claro institucional, responsivo
├── app.js                # carregamento de dados, cálculos, gráficos e interações
├── data.json             # dados (atualizado pelo Cowork diariamente)
├── vendor/
│   └── chart.umd.js      # Chart.js 4.4.1 vendorizado (sem dependência de CDN)
├── assets/
│   └── logo.svg          # logo "M" (duas speech bubbles + estrela dourada)
└── README.md
```

> **Chart.js vendorizado:** a lib de gráficos vive em `vendor/` em vez de vir de um
> CDN, para o site ser totalmente autossuficiente no GitHub Pages. A fonte **Inter**
> é carregada do Google Fonts, com fallback para a stack de sistema.

## Blocos do dashboard

1. **KPI Cards** — Seguidores, Reach total, Engagement rate médio, Views totais, com delta vs. período anterior.
2. **Evolução Temporal** — gráfico de linha Reach × Views (eixo duplo) e gráfico de Engajamento (likes/comentários/saves/shares).
3. **Ranking de Posts** — tabela ordenável por qualquer métrica, com thumbnail, badge de tipo, ER por post, e destaque para maior reach / maior ER.
4. **Comparativo por Formato** — média por post por tipo de mídia (Imagem / Carrossel / Reel), com seletor de métrica. Usa **todos os posts** (não filtrado por período).
5. **Audiência** — bloqueada até 100 seguidores; mostra progresso ("faltam N seguidores").

### Filtro de período global (7d / 30d / 90d, default 30d)
Afeta os blocos 1, 2 e 3. Os blocos 4 e 5 usam dados lifetime e não são filtrados.
Os deltas comparam com o período imediatamente anterior de mesma duração; quando não há
histórico anterior suficiente (ex.: 30d/90d com apenas 30 dias de dados), o card exibe
"sem período anterior".

## Cálculos

- **Engagement rate (conta):** `(Σ total_interactions / Σ reach) × 100` no período.
- **Engagement rate (post):** `engagement / reach × 100`.
- **Delta:** `((valor_atual − valor_anterior) / valor_anterior) × 100`.
- **Reach** (contas únicas) é a métrica primária de visibilidade; **views** captura exibições totais (com repetições).

## Rodar localmente

O dashboard usa `fetch('data.json')`, que exige um servidor HTTP (abrir via `file://`
é bloqueado pelo navegador):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Deploy no GitHub Pages

1. Faça push deste diretório para o repositório.
2. Em **Settings → Pages**, selecione a branch e a pasta raiz (`/`).
3. O GitHub Pages serve `index.html` diretamente.

Para atualizar os dados, basta commitar um novo `data.json` — o Cowork faz isso
diariamente (spec do fetching à parte).

## Atualização dos dados (`data.json`)

- `daily_metrics`: acumulado historicamente (merge dos últimos 30d sem duplicar datas).
- `posts`: métricas lifetime por post.
- `audience`: preenchido automaticamente ao atingir 100 seguidores.
- `new_followers`: `null` do Windsor.ai (conta < 100 seguidores) é tratado como `0`.
