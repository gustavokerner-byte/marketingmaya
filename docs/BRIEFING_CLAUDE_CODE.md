# Briefing — integrar as 4 abas no dashboard MayaApp CDC

Repositório: `gustavokerner-byte/marketingmaya` · Publicado em GitHub Pages.

O dashboard hoje tem só Instagram, alimentado por `data.json` via GitHub Action + Windsor.ai.
A tarefa é transformá-lo em 4 abas **sem tocar na lógica do Instagram**.

---

## Regra que não pode ser quebrada

**A aba Instagram não é reescrita.** O `data.json`, a GitHub Action, o JS e o CSS que
já existem continuam exatamente como estão. As seções de Instagram apenas passam a
morar dentro de um `<div>` que pode ser escondido. Se em algum momento a solução exigir
alterar o JS do Instagram, pare e pergunte antes.

---

## Arquivos que chegam prontos

```
assets/mx-dash.css          novo — estilos das abas e das 3 seções novas
assets/mx-dash.js           novo — abas, KPIs e gráficos SVG
data/cadastros.json         novo — dados do BI (atualização manual semanal)
data/ativacoes.json         novo — gerado a partir dos exports de QR
data/qr/*.csv|xlsx          novo — exports brutos de QR Code
tools/build_ativacoes.py    novo — regenera ativacoes.json
tools/add_semana.py         novo — adiciona a semana fechada em cadastros.json
sections.html               referência — marcação a inserir (não publicar)
preview.html                referência — harness de teste local (não publicar)
docs/                       referência
```

Tudo com prefixo `mx-` justamente para não colidir com o CSS/JS atual.
Nada em `assets/mx-dash.*` depende de biblioteca externa: os gráficos são SVG inline.

---

## Passos

### 1. Copiar os arquivos novos
Coloque os arquivos nos caminhos acima. **Não sobrescreva o `data.json` da raiz** —
ele é do Instagram e é atualizado pela Action.

### 2. Editar o `index.html`

**a)** No `<head>`, depois do CSS existente:
```html
<link rel="stylesheet" href="assets/mx-dash.css">
```

**b)** No elemento que envolve o conteúdo (normalmente `<body>` ou o container
principal), adicione a classe `mx`. Ela é o escopo dos tokens de cor:
```html
<body class="mx">
```

**c)** Insira a navegação e os 3 painéis novos vindos de `sections.html`, logo abaixo
do header e antes da primeira seção de conteúdo.

**d)** Envolva as seções de Instagram que já existem no painel
`mx-panel-instagram`. Pelo que está publicado hoje, são estas, na ordem:

- os filtros de período (`7d` / `30d` / `90d`)
- `Visão Geral`
- `Evolução Temporal` (Alcance e Views, Engajamento)
- `Ranking de Posts`
- `Comparativo por Formato`
- `Audiência`

Recorte esse bloco inteiro e cole dentro do `<div id="mx-panel-instagram" ... hidden>`.
**Não altere nada dentro das seções** — nem classes, nem ids, nem ordem.

**e)** Antes do `</body>`, **depois** do script atual do Instagram:
```html
<script src="assets/mx-dash.js"></script>
```
A ordem importa: o script do Instagram precisa continuar rodando primeiro.

### 3. Ajustar o contador de seguidores

O card "Seguidores no Instagram" do Resumo Executivo lê o número do `data.json`.
O schema real do `data.json` não estava acessível quando o `mx-dash.js` foi escrito,
então ele tenta uma lista de caminhos prováveis e, se nenhum bater, faz uma varredura
por qualquer chave que contenha `follow` ou `seguid`.

**Confira se o card mostra o número certo.** Se aparecer `—`, abra o `data.json`,
descubra onde está a contagem de seguidores e adicione o caminho no array `CAMINHOS`
no topo da seção *Instagram bridge* do `mx-dash.js`:

```js
var CAMINHOS = [
  ["followers"], ["followers_count"], /* ... */
  ["caminho", "real", "aqui"]        // <- acrescente
];
```

Isso é a única parte do código que provavelmente precisa de ajuste manual.

### 4. Testar antes de publicar

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Checklist:
- [ ] As 4 abas trocam ao clicar e navegam com as setas do teclado
- [ ] A aba Instagram continua funcionando igual a antes, incluindo os filtros de período
- [ ] O card de seguidores mostra um número, não `—`
- [ ] Resumo Executivo abre com os acumulados em destaque: 417 cadastros, 363 com 1º uso, 109 scans
- [ ] Aba Cadastros mostra o gráfico de cadastros × 1º uso com 2 semanas
- [ ] Aba Ativações mostra 3 frentes na tabela e o gráfico empilhado com 9 semanas
- [ ] `#resumo`, `#cadastros`, `#ativacoes`, `#instagram` na URL abrem a aba certa
- [ ] Funciona em tela de celular

O `preview.html` renderiza só as 3 abas novas, sem o Instagram. Serve para checar as
seções novas isoladamente antes de mexer no `index.html`.

---

## Como os dados chegam a cada aba

| Aba | Fonte | Atualização |
|---|---|---|
| Resumo Executivo | os 3 arquivos | automática, deriva das outras |
| Cadastros | `data/cadastros.json` | manual, `tools/add_semana.py` |
| Ativações Físicas | `data/ativacoes.json` | `tools/build_ativacoes.py` |
| Instagram | `data.json` | GitHub Action existente |

Todas as semanas são cortadas **domingo a sábado**, igual ao BI da CWS. Isso não é
detalhe cosmético: se o corte mudar, cadastros e QR deixam de ser comparáveis entre si.

---

## Decisões que já estão embutidas e por quê

**As variações são calculadas no dashboard, não copiadas do BI.** Os badges do BI
mostram `+0%` em telas com valores diferentes (417, 39, 59, 10, 16), então não são
confiáveis. Todo delta em `mx-dash.js` sai da divisão de dois absolutos.

**"Usuários ativos no mês" aparece sem comparativo.** A métrica é o acumulado do mês
e não tem base de comparação semanal definida, então o card mostra o número puro.
Forçar um delta ali produziria um número que não se sustenta em reunião.

**A série semanal de cadastros nasce com 2 pontos e cresce.** Não havia histórico
semanal no BI para backfill. Cada segunda-feira o `add_semana.py` acrescenta uma
linha. Enquanto houver menos de 2 semanas, o gráfico mostra um aviso em vez de um
gráfico vazio.

**Leituras duplicadas de QR são removidas por `timestamp + nome do QR`.** Os exports
vieram em CSV e XLSX com o mesmo conteúdo; sem o dedupe os flyers apareceriam com o
dobro dos scans.

**Frentes de QR são mapeadas por nome exato.** O dicionário `FRENTES` em
`build_ativacoes.py` traduz o `Nome do QR` do export para o rótulo do dashboard:

| Nome do QR no export | Rótulo |
|---|---|
| `pilastra1_boulevard_cdcQ` | Pilastra Boulevard |
| `Adesivo` | Flyers |
| `Entrada Sao Caetano` | Banner São Caetano |

QR que não estiver nesse dicionário é ignorado, e o script avisa no terminal. Para
adicionar uma frente nova, inclua a entrada ali — não precisa mexer no front-end.
