# Rotina do Dashboard de Gestão — Instruções para o Claude Cowork

**Dashboard:** "Acompanhamento de metas 2026" — https://gustavokerner-byte.github.io/dados-usuarios/
**Repositório:** `gustavokerner-byte/dados-usuarios` (GitHub Pages, estático, sem build).
**Cadência: junto com o update ao investidor — segunda (fechamento) e quinta (parcial).**
**Entregável: os 3 JSON do dashboard atualizados e publicados no repo.**

**Versão 3 · 24/08/2026 · Confidencial — uso interno**

> **Mudança da v3 (24/08/2026):** entra a **frente Promotoras** como **nova aba** do dashboard,
> alimentada por `data/promotoras.json` a partir de **2 formulários** enviados na captura semanal
> (Tracking de Ativação + Heavy Users). Regras completas em **`docs/ROTINA_PROMOTORAS.md`**.
> A aba ainda precisa ser inserida no código do `dados-usuarios` (ver seção 8).

---

## 0. O que o dashboard lê

O dashboard é 100% estático. A tela principal ("metas 2026") lê **três arquivos** do diretório
`data/`. A nova **aba Promotoras** lê um quarto arquivo. Nenhuma outra fonte alimenta as telas.

| Arquivo | O que alimenta |
|---|---|
| `data/updates.json` | **Fonte única de verdade dos números.** KPIs, medidores, meta do mês, funil e a série mensal |
| `data/meta.json` | Cabeçalho: data de referência, versão, data/hora da atualização, selo de confidencialidade |
| `data/metas.json` | Faixas de metas 2026 (por mês e o total do ano) |
| `data/promotoras.json` | **Aba Promotoras** (ativação presencial + reativação heavy users). Contrato em `docs/ROTINA_PROMOTORAS.md` seção 4 |

> **Mudança de arquitetura (jul/2026).** Este dashboard **substitui** o modelo antigo
> baseado em `base_mensal.json` + abas. A base mensal, `uso.json`, `downloads.json`,
> `marketing.json`, `tecnologia.json`, `financeiro.json` e `narrativa.json` **não são
> mais lidos** por este dashboard. A série mensal agora vive dentro de `updates.json`
> (`serie_mensal`). Não recriar a base antiga.

O `updates.json` é o **mesmo arquivo** que a rotina de update ao investidor
(`docs/ROTINA_UPDATE_INVESTIDOR.md`) usa. Atualizar o dashboard e montar o e-mail são
duas saídas da **mesma captura de prints**. Fazer as duas na mesma rodada, nunca separar.

---

## 1. Contrato de dado — `data/updates.json` (schema v3)

Estrutura que o dashboard espera. Campo ausente vira `—` na tela; nunca inventar.

### 1.1 `downloads` — bloco único, acumulado

```json
"downloads": {
  "total": 756,
  "data_corte": "2026-07-21",
  "corte_misto": true,
  "por_loja": {
    "appstore":    { "acumulado": 343, "desde": "2026-02-24", "corte": "2026-07-21" },
    "google_play": { "acumulado": 413, "desde": null,         "corte": "2026-07-18" }
  },
  "metodo_de_atualizacao": "total = soma dos acumulados por loja.",
  "nota": "Corte misto entre as duas lojas: 21/07 iOS, 18/07 Android."
}
```

- **`total` = `appstore.acumulado` + `google_play.acumulado`.** Sempre recalcular; nunca digitar à mão.
- **`corte_misto`: `true`** quando as duas lojas fecham em datas diferentes (o normal).
  O dashboard exibe "corte misto: 21/07 iOS · 18/07 Android" a partir deste campo.
- Se só uma loja vier no print, atualizar essa loja, **manter a outra como estava**,
  registrar em `nota` que faltou, e avisar o gestor. Não estimar a loja ausente.

### 1.2 `serie_mensal` — uma linha por mês (a espinha dorsal dos gráficos)

```json
{ "mes": "2026-07", "fechado": false, "dia_corte": 22,
  "downloads": 63, "novos_cadastros": 33,
  "assinantes_novos_no_periodo": 0, "assinantes_base_ativa": 0,
  "primeiro_uso": 19, "usuarios_ativos": 39,
  "imagens_geradas": 1612, "cadastrados_acumulado_no_fim": 465 }
```

| Campo | De onde sai | Regra |
|---|---|---|
| `mes` | — | `AAAA-MM` |
| `fechado` | — | `false` no mês corrente; `true` no fechamento |
| `dia_corte` | filtro do print | dias decorridos (mês corrente) ou total do mês (fechado) |
| `downloads` | prints das lojas | downloads **do mês**, não acumulado |
| `novos_cadastros` | BI — NOVOS CADASTROS no mês | — |
| `assinantes_novos_no_periodo` | BI — NOVOS ASSINANTES no mês | reportar sempre, inclusive `0` |
| `assinantes_base_ativa` | BI — base ativa de assinantes no fim do mês | `0` hoje |
| `primeiro_uso` | BI — USUÁRIOS COM PRIMEIRO USO no mês | — |
| `usuarios_ativos` | BI — USUÁRIOS ATIVOS NO MÊS | — |
| `imagens_geradas` | BI — funil, Imagens Geradas no mês | — |
| `cadastrados_acumulado_no_fim` | BI — USUÁRIOS CADASTRADOS (acumulado) | encadeia com o mês anterior |

Na rodada semanal, **atualizar apenas o objeto do mês corrente**. No fechamento do mês:
virar `fechado` para `true`, ajustar `dia_corte` para o total do mês, e **abrir o objeto
do mês novo** com `fechado: false`.

### 1.3 `acumulados_por_rodada` — acrescentar uma linha por rodada

O dashboard usa **a última linha** deste array para os cartões de topo (valores
"acumulado"), o funil e os medidores. Acrescentar, nunca sobrescrever o histórico.

```json
{ "data": "2026-07-22", "janela_do_print": "2026-02-01 a 2026-07-22",
  "downloads": 756, "usuarios_cadastrados": 465, "assinantes_base_ativa": 0,
  "primeiro_uso_acumulado": 371, "imagens_geradas": 24293,
  "validacao": "Print do BI cobre 100% da base. Acumulado valido." }
```

`downloads` aqui = o mesmo `downloads.total` do bloco 1.1 na data da rodada.

### 1.4 `serie_semanal_dom_sab`

Reservado para a série semanal domingo–sábado. **O dashboard ainda não lê este campo** —
manter como está (a série semanal do e-mail é tratada na rotina de investidor). Não apagar.

---

## 2. Contrato — `data/meta.json`

```json
{ "data_referencia": "2026-07-22",
  "versao": "2.0",
  "atualizado_em": "2026-07-24T09:00:00-03:00",
  "classificacao": "Confidencial — MayaApp CDC e Circuito de Compras" }
```

- **`data_referencia`** = data de corte dos números desta rodada. O dashboard mostra
  um banner de "dados desatualizados" se ela tiver mais de 4 dias. **Atualizar toda rodada.**
- **`atualizado_em`** = carimbo ISO com fuso `-03:00` do momento da publicação.
- `versao` só muda em mudança estrutural do dashboard, não a cada rodada.

---

## 3. Contrato — `data/metas.json`

Metas operacionais compartilhadas (Metas CDC v7). **Muda pouco** — só quando o gestor
informar revisão de metas. Campos que o dashboard usa:

- `meses[].meta_novos_cadastros` e `meses[].meta_novos_assinantes` → bloco "Meta do mês".
- `totais_2026.novos_cadastros` (35.000) e `totais_2026.novos_assinantes` (2.500) → medidores do ano.

As metas mensais compartilhadas **começam em agosto/2026**; julho tem meta `0`. Não preencher
metas de downloads, primeiros usos ou imagens — não existem na planilha de origem
(`metas_ausentes` documenta isso).

---

## 4. Passo a passo da rodada

**Pré-requisito:** os prints já capturados para o update ao investidor (mesma rodada).
Ler `docs/ROTINA_UPDATE_INVESTIDOR.md` seção 1 para a lista de prints e filtros.

1. **Downloads** → atualizar `downloads.por_loja` (cada loja com seu acumulado e corte),
   recalcular `total`, ajustar `data_corte`, `corte_misto` e `nota`.
2. **Mês corrente** → atualizar o objeto do mês em `serie_mensal` (todos os campos da
   tabela 1.2). Ajustar `dia_corte`.
3. **Acumulado** → acrescentar uma linha em `acumulados_por_rodada` com os acumulados do
   print sem filtro mensal (01/02 até a data de corte).
4. **Metas** → só tocar `metas.json` se o gestor informou revisão.
5. **Meta.json** → atualizar `data_referencia` e `atualizado_em`.
6. **Promotoras** → atualizar `data/promotoras.json` a partir dos 2 formulários da semana
   (ver `docs/ROTINA_PROMOTORAS.md`). Perguntar sempre os dias/nº de promotoras de campo.
7. **Validar** (seção 5). Se falhar, **parar** e reportar — não publicar.
8. **Publicar** (seção 6).

---

## 5. Validação — obrigatória antes de publicar

```bash
python3 - <<'PY'
import json
u=json.load(open('data/updates.json'))
# encadeamento da serie mensal
prev=None
for m in u['serie_mensal']:
    if prev is not None and m['cadastrados_acumulado_no_fim'] is not None and prev['cadastrados_acumulado_no_fim'] is not None:
        esp=prev['cadastrados_acumulado_no_fim']+m['novos_cadastros']
        assert esp==m['cadastrados_acumulado_no_fim'], f"cadastro nao encadeia em {m['mes']}: esperado {esp}, achou {m['cadastrados_acumulado_no_fim']}"
    prev=m
acc=u['acumulados_por_rodada'][-1]
dl=u['downloads']
# total de downloads = soma das lojas
soma=sum(v['acumulado'] for v in dl['por_loja'].values() if v['acumulado'] is not None)
assert dl['total']==soma, f"downloads.total {dl['total']} != soma das lojas {soma}"
# acumulado da ultima rodada bate com a serie mensal
assert acc['usuarios_cadastrados']==u['serie_mensal'][-1]['cadastrados_acumulado_no_fim'], "acumulado != fim da serie mensal"
assert acc['downloads']==dl['total'], "downloads da rodada != downloads.total"
# funil monotonico (acumulado)
assert (acc['downloads'] or 0) >= acc['usuarios_cadastrados'] >= (acc['primeiro_uso_acumulado'] or 0) >= (acc['assinantes_base_ativa'] or 0), "funil invertido"
print('updates.json consistente')
PY
python3 -c "import json;[json.load(open(f)) for f in ['data/updates.json','data/meta.json','data/metas.json','data/promotoras.json']];print('JSON valido')"
```

Validação extra da aba Promotoras (ver `docs/ROTINA_PROMOTORAS.md` seção 4): em `promotoras.json`,
`instalou_na_hora + interesse_posterior + sem_interesse + instalou_e_desinstalou = abordagens`
(no acumulado e na semana).

| Verificação | Regra |
|---|---|
| Encadeamento da base | `cadastrados_acumulado_no_fim` do mês = mês anterior + `novos_cadastros` |
| Downloads | `total` = soma dos `por_loja[].acumulado` |
| Acumulado × série | `usuarios_cadastrados` da última rodada = fim da série mensal |
| Downloads × rodada | `acumulados_por_rodada[-1].downloads` = `downloads.total` |
| Funil | downloads ≥ cadastros ≥ primeiro uso ≥ assinantes |
| Período parcial | mês corrente com `fechado: false` |
| Promotoras | soma do funil = abordagens (acum. e semana) |
| Divergência entre fontes | registrar em `divergencias_abertas` com as duas versões, sinalizar 🔴, não escolher |

---

## 6. Publicação — push com PAT colado na rodada

O dashboard atualiza sozinho quando os JSON novos chegam ao repo (GitHub Pages). O repo
`dados-usuarios` é **privado** e este ambiente **não guarda credencial**. O modelo acordado
com o gestor é **colar um PAT na hora da rodada**:

1. Só depois da validação (seção 5) passar, **pedir ao gestor o Personal Access Token**
   fine-grained (escopo: repositório `dados-usuarios`, permissão **Contents: Read and write**).
2. Publicar usando o token **apenas nesta sessão**, sem gravá-lo em arquivo, log ou doc:

```bash
# $GH_PAT é colado pelo gestor nesta sessão; nunca persistir.
git -C dados-usuarios add data/updates.json data/meta.json data/metas.json data/promotoras.json
git -C dados-usuarios commit -m "dados: rodada DD/MM/2026"
git -C dados-usuarios push "https://x-access-token:${GH_PAT}@github.com/gustavokerner-byte/dados-usuarios.git" HEAD
```

3. Confirmar ao gestor que o push saiu e que o dashboard vai refletir em ~1 min.
4. **Nunca** ecoar o token de volta, nem colá-lo em `updates.json`, commit message ou notificação.

> Se o gestor **não** passar o token na rodada, entregar os JSON validados para commit
> manual e sinalizar que o dashboard só atualiza após o commit dele.

---

## 7. Regras de conduta

1. **Não inventar número.** Campo sem print vira `—` no dashboard; a ausência é reportada.
2. **Não misturar realizado, projetado e meta.** Realizado vive em `updates.json`; meta em `metas.json`.
3. **Período parcial é sempre parcial** (`fechado: false`). Julho não é comparável a junho fechado.
4. **Divergência não se resolve sozinho.** Duas versões, 🔴, decisão do gestor.
5. **Fonte canônica é o print do BI CWS.** Deck, apresentação e planilha não prevalecem.
6. **Nunca publicar sem validar.** Se a seção 5 falhar, parar.
7. **Token é de uso único na sessão.** Nunca persistir, logar ou ecoar o PAT.

---

## 8. Aba Promotoras — inserção no código (pendência técnica)

A frente Promotoras tem rotina própria em **`docs/ROTINA_PROMOTORAS.md`** (entradas, métricas,
recorte da semana, contrato `data/promotoras.json` e estrutura da aba). O dado já é gerado nesta
rotina; falta **inserir a aba no código do `dados-usuarios`**:

- Adicionar navegação/abas (ex.: "Metas 2026" | "Promotoras") ao `index`.
- Um módulo JS que carrega `data/promotoras.json` e renderiza as seções (ver o protótipo
  `docs/aba_promotoras_prototipo.html` como referência visual).

**Bloqueio:** o **código atual do `dados-usuarios` não está no projeto** (o repo sincronizado é o
*Instagram Dashboard*, outro site). Para o Claude Code inserir a aba, é preciso o **código atual do
`dados-usuarios`** (index/app/style + `data/`) **ou** um **PAT fine-grained (Contents: Read and write)**
para clonar, inserir a aba e commitar. Até lá, entregam-se `data/promotoras.json` + o protótipo.
