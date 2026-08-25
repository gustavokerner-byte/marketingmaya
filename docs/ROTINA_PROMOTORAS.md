# Rotina da Frente Promotoras — Aba do Dashboard de Gestão

**Onde vive:** nova **aba "Promotoras"** dentro do dashboard de gestão
(`gustavokerner-byte/dados-usuarios` — GitHub Pages, estático). **Não** é dashboard separado.
**Cadência:** junto do fechamento semanal (segunda), no mesmo fluxo do BI + QR.
**Entradas semanais:** os **2 formulários** exportados (xlsx/csv) + a informação de **quais dias e quantas promotoras** foram a campo.
**Fonte de dados da aba:** `data/promotoras.json` (contrato na seção 4).

**Versão 1 · 24/08/2026 · Confidencial — uso interno**

---

## 0. O que entra na captura semanal (além de BI e QR)

Toda rodada de fechamento, o gestor envia **também**:

1. **Tracking de Ativação — CDC Brás** (Google Form, export xlsx/csv). Ativação presencial das promotoras.
2. **Questionário de Campo — Heavy Users** (Google Form, export xlsx/csv). Reativação / voz do usuário.

⚠️ **Regra crítica — sempre perguntar:** *"Quais dias e quantas promotoras foram a campo nesta semana?"*
Os formulários costumam ser **preenchidos depois** (dias seguintes) e o **timestamp não reflete o dia do campo**.
O recorte da semana é definido pelos **dias de campo informados pelo gestor**, não pelo carimbo de data/hora.
Ex.: semana 34 → campo sexta 21 (1 promotora) + sábado 22 (2 promotoras); formulários preenchidos 23–24/08.

---

## 1. Estrutura da aba (ordem das seções)

Espelha o protótipo `docs/aba_promotoras_prototipo.html`. Sempre **recorte da semana + insights no topo**, depois consolidado.

1. **Recorte da semana + principais insights** — semana, dias de campo (promotora-dias), 4 destaques (abordagens, instalações na hora, interesse posterior, receptividade) e uma leitura curta.
2. **Visão geral** — Total de Abordagens (acum.) × Abordagens na semana; Cadastros convertidos (instalou na hora) acum. × semana.
3. **Indicadores da abordagem (KPIs)** — % Instalação imediata, % Demonstrou interesse, % Sem interesse, Nota de receptividade. Número grande = acumulado; linha inferior = semana.
4. **Abordagens por semana** — gráfico de colunas (dom–sáb), semana corrente destacada.
5. **Funil de instalação** e **Receptividade (1–5)** — barra = acumulado; coluna à direita = semana.
6. **Principais comentários da semana** (qualitativo).
7. **Perfil e feedbacks** — perfil do lojista, segmento, sinais da semana (flyer, ausência, idioma, etc.).
8. **Reativação (Heavy Users)** — entrevistados (acum. + semana), nota média, % indicação, frequência de uso, por que pararam, finalidades, benefícios, 1 feedback +/−.
9. **Sugestões de funcionalidades** — ranking por menções (acumulado), destaque da semana e principais comentários.

Regras: percentuais **inteiros**; **dado ausente vira `—`, nunca zero**; não suavizar má notícia (se a conversão caiu, reportar).

---

## 2. Métricas e como calcular (do formulário de Ativação)

Campos-chave do form de Ativação: coluna "efetuou download/instalação" (→ funil), "nível de receptividade" (1–5), "segmento", "perfil de lojista", "andar/corredor", "feedback/observações".

- **Abordagens** = nº de respostas no recorte.
- **Instalou na hora** = "Sim, baixou e instalou no momento". **% instalação imediata** = instalou / abordagens.
- **Interesse posterior** = "Não, mas demonstrou interesse". **Sem interesse** = "Não demonstrou interesse". (+ "Instalou e desinstalou".)
- **Receptividade média** = média da nota 1–5; também guardar a distribuição.
- **Sinais da semana** = contagens úteis do texto de feedback (ficou com flyer, responsável ausente, barreira de idioma, celular sem espaço).

Do form de **Heavy Users** (Reativação): frequência de uso, nota do app (1–5), % que indicou, motivos de parada, finalidades, benefícios, e **sugestões de funcionalidades** (colunas "queria fazer e não consegue", "dificuldades", "o que mudaria para voltar").

**Agrupamento das sugestões:** consolidar por tema e contar menções (catálogo/PDF, fotos realistas, vender pelo app/marketplaces, rapidez, vídeo/lives, tutorial, outros).

---

## 3. Recorte da semana — regra de atribuição

1. Perguntar os **dias de campo** e o **nº de promotoras** por dia (define `recorte_semana.dias_de_campo`).
2. Atribuir **o lote de respostas daquela ação** à semana de campo informada (dom–sáb), mesmo que o timestamp caia na semana seguinte.
3. Reativação (Heavy Users) é questionário contínuo; a "semana" reflete o lote respondido no período.
4. Nunca estimar dias/promotoras — se o gestor não informar, marcar `— a confirmar` e reportar.

---

## 4. Contrato de dado — `data/promotoras.json`

A aba é estática e lê **um arquivo**: `data/promotoras.json`. Campo ausente vira `—`. Estrutura (ver o arquivo commitado para o exemplo completo da semana 34):

- `recorte_semana` — `semana`, `periodo`, `dias_de_campo[]` (`data`, `dia`, `promotoras`), `promotora_dias`, `nota`.
- `ativacao.acumulado` e `ativacao.semana` — `abordagens`, `instalou_na_hora`, `interesse_posterior`, `sem_interesse`, `instalou_e_desinstalou`, `receptividade_media`, `receptividade_dist{1..5}`, `pct_*`.
- `ativacao.serie_semanal_abordagens` — `[["AAAA-MM-DD", n], ...]` (uma barra por semana dom–sáb, rótulo = domingo).
- `ativacao.perfil_*`, `ativacao.segmento_*`, `ativacao.sinais_semana`, `ativacao.comentarios_semana[]`.
- `reativacao.acumulado`, `reativacao.semana`, `por_que_pararam`, `finalidades`, `beneficios`, `feedback_positivo/negativo`.
- `sugestoes_funcionalidades[]` — `rank`, `tema`, `mencoes`, `exemplos`.

**Total = soma:** `instalou_na_hora + interesse_posterior + sem_interesse + instalou_e_desinstalou = abordagens` (validar em acumulado e semana).

---

## 5. Passo a passo da rodada (frente Promotoras)

1. Receber os 2 formulários + os dias/promotoras de campo.
2. Calcular acumulado e a fatia da semana (seções 2–3). Percentuais inteiros.
3. **Validar:** o funil fecha (soma = abordagens)? Receptividade média bate com a distribuição? Acumulado ≥ rodada anterior?
4. Gerar/atualizar `data/promotoras.json`.
5. **Inserir/atualizar a aba "Promotoras"** no dashboard de gestão (ver seção 6).
6. Publicar (mesmo modelo de PAT do `ROTINA_DASHBOARD.md` seção 6) ou entregar os arquivos para commit.
7. Reportar ao gestor: leitura da semana, o que ficou de fora, divergências.

---

## 6. Integração no dashboard de gestão (pendência técnica)

A aba precisa ser **adicionada ao código** do repo `dados-usuarios` (nav/tabs + um módulo que lê `data/promotoras.json`).
Isso exige o **código atual do dashboard de gestão**, que **não está sincronizado no projeto** (o repo sincronizado é o *Instagram Dashboard*, outro site).

Para o Claude Code executar, precisa de um destes:
- o **código atual do `dados-usuarios`** (index/app/style + `data/`), ou
- **acesso de escrita (PAT fine-grained, Contents: Read and write)** ao `dados-usuarios` para clonar, inserir a aba e commitar.

Enquanto não houver o código, entregam-se **`data/promotoras.json`** + o **protótipo** (`docs/aba_promotoras_prototipo.html`) como especificação visual da aba.

---

## 7. Regras de conduta

1. Não inventar/estimar. Dias de campo sem confirmação = `— a confirmar`.
2. Recorte da semana pelos **dias de campo**, não pelo timestamp do formulário.
3. Dado ausente vira `—`, nunca zero. Percentuais inteiros.
4. Não suavizar: queda de conversão/receptividade é reportada.
5. Fonte da frente = os 2 formulários. Deck/planilha não prevalecem.
