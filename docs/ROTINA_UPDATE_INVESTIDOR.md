# Rotina de Update ao Investidor — Instruções para o Claude Cowork

**Cadência: segunda (fechamento da semana) e quinta (parcial da semana), pela manhã.**
**Destinatários: vinicius.dias@cws-platform.com · fernando@cws-platform.com**
**Entregável: rascunho de e-mail no Gmail + os 3 JSON do dashboard atualizados. Nunca enviar e-mail direto.**

**Versão 5 · 28/07/2026 · Confidencial — uso interno**

> **Mudança da v5:** o formato do e-mail foi enxugado a pedido de Fernando e Vinícius
> (seções 4 a 6). Resumo do layout oficial:
> 1. Primeira linha (opcional): `Dashboard Atualizado - [Acesse](https://gustavokerner-byte.github.io/dados-usuarios/)`.
> 2. Título do bloco acumulado leva a **data de corte** ("POSIÇÃO ACUMULADA 25/07"), não "desde 01/02/2026".
> 3. Bloco acumulado = **Downloads (com delta), Cadastros, Usuários pagantes e Imagens (acumulado)** + `Obs.` quando houver.
>    Sem primeiro uso nem produtos no acumulado. Cadastros, pagantes e imagens vão **só com o valor**; só Downloads leva delta.
> 4. **Produtos sai de todos os blocos.** **Ativos no mês sai do bloco do mês.** Cada bloco de período
>    (semana e mês) traz **Cadastros, Usuários pagantes, Primeiro uso e Imagens**. O mês ainda leva "Média diária de cadastros (7 dias)".
> 5. Rodapé passa a ser só **"Corte {data}."** + "Confidencial — uso interno." (sem a linha "Fonte:").
> 6. **Downloads fica só no bloco acumulado** enquanto a App Store fornecer apenas totais (sem série diária por loja).
>    Quando houver split por período nas duas lojas, Downloads pode voltar ao topo dos blocos de semana/mês.
>
> **Mudança da v4:** a mesma captura de prints agora tem **duas saídas** — o e-mail
> quantitativo (esta rotina) e o **dashboard de gestão** (`docs/ROTINA_DASHBOARD.md`).
> As duas leem o mesmo `data/updates.json`. Toda rodada monta o e-mail **e** sincroniza
> o dashboard. Downloads passam a ser capturados **por loja** (App Store + Google Play),
> com corte misto. Ver seções 1 e 7.
>
> **Mudança da v3:** entram Downloads (Play Store + App Store, print do gestor) e
> Usuários pagantes (print do BI, reportado sempre, inclusive 0). O bloco de
> COMENTÁRIO foi removido: update frio e direto. Títulos em negrito e linha em branco
> entre blocos.

Esta rotina é **quantitativa e curta**. Execução, marcos e leitura qualitativa ficam no
relatório semanal (`docs/ROTINA_SEMANAL_COWORK.md`). Não misturar.

---

## 0. Definição de semana — base de tudo

**A semana vai de domingo a sábado.**

| Rodada | O que reporta | Comparativo |
|---|---|---|
| Segunda | Semana fechada: **domingo a sábado** que acabou de terminar | Semana domingo–sábado anterior |
| Quinta | Parcial: **domingo a quinta** da semana corrente | Mesmos 5 dias da semana anterior (domingo a quinta) |

O rótulo da semana é o **número ISO da segunda-feira contida na janela**. Exemplo:
a janela 19 a 25/jul contém a segunda 20/07, que é da semana ISO 30 → "semana 30".

⚠️ Os números semanais registrados até 22/07/2026 foram capturados sob a definição
antiga (segunda a domingo). **Não são comparáveis** com as semanas domingo–sábado.
Estão preservados em `semanas_legado_seg_dom` no `updates.json` e não devem ser usados
como comparativo.

---

## 0.1 Fonte canônica

**Os números são sempre os do print do BI CWS.** Deck, apresentação ou planilha não
prevalecem sobre o print. Se um documento do projeto trouxer número diferente, o print
ganha e a divergência é apenas anotada — não interrompe a rodada.

Instagram é exceção de canal: vem do Windsor.ai, não do BI.

---

## 0.2 Repositório e schema do dashboard

O `updates.json` desta rotina é o **mesmo arquivo** que alimenta o dashboard de gestão.

- **Repositório:** `gustavokerner-byte/dados-usuarios` (privado, GitHub Pages).
- **Dashboard:** https://gustavokerner-byte.github.io/dados-usuarios/
- **Schema:** `updates.json` v3 — `downloads`, `serie_mensal`, `acumulados_por_rodada`,
  `serie_semanal_dom_sab`. O contrato completo campo a campo está em `docs/ROTINA_DASHBOARD.md`.

Publicar exige acesso de escrita ao repo. Enquanto não configurado, **preparar e validar
os JSON e entregá-los ao gestor** para commit. Ver seção 7.

---

## 0.3 Downloads — definição por loja fixada (a partir de 28/07/2026)

Decisão do gestor, mantida para não divergir do que já foi reportado ao Conselho:

| Loja | Métrica oficial | Onde | Observação |
|---|---|---|---|
| App Store | **Total de downloads** | App Store Connect → Análise | Inclui redownloads |
| Google Play | **Store listing acquisitions** (All users, unique) | Play Console | Exportável em CSV; corte atrasa ~3–5 dias |

`downloads.total` = App Store (Total) + Google Play (Store listing acquisitions), acumulado
por loja. **Não** usar "New users" nem "All users" do Google Play, nem "First-time" da Apple —
foram avaliados e descartados para manter a série consistente com o histórico reportado.
As duas lojas ficam em definições diferentes; registrar isso na `nota` do bloco `downloads`.
O Google Play só fornece a série diária por CSV; a App Store fornece só totais → o download
**semanal/mensal por loja** pode não existir. Nesse caso, Downloads entra **só no bloco acumulado**.

---

## 1. Prints necessários por rodada

### Rodada de segunda — fechamento da semana

| # | Filtro no BI CWS | Serve para | Obrigatório |
|---|---|---|---|
| 1 | Semana fechada: **domingo a sábado** anterior | Bloco da semana | Sim |
| 2 | Semana **domingo a sábado** anterior a essa | Comparativo | Sim — ou do histórico |
| 3 | **Mês corrente até sábado** | Bloco do mês | Sim |
| 4 | **Mês anterior até o mesmo dia do mês** | Comparativo do mês | Sim |
| 5 | **Acumulado** (01/02/2026 até a data de corte) | Posição acumulada | Sim |
| 6 | **Downloads — App Store + Google Play** (acumulado por loja) | Linha de Downloads + dashboard | Sim — o gestor manda o print |
| 7 | Instagram | Windsor.ai — automático | Não pedir print |

### Rodada de quinta — parcial da semana

| # | Filtro no BI CWS | Serve para | Obrigatório |
|---|---|---|---|
| 1 | **Domingo a quinta** da semana corrente | Bloco da janela de 5 dias | Sim |
| 2 | **Domingo a quinta** da semana anterior | Comparativo | Sim — ou do histórico |
| 3 | **Mês corrente até quinta** | Bloco do mês | Sim |
| 4 | **Mês anterior até o mesmo dia do mês** | Comparativo do mês | Sim |
| 5 | **Acumulado** (01/02/2026 até a data de corte) | Posição acumulada | Sim |
| 6 | **Downloads — App Store + Google Play** (acumulado por loja) | Linha de Downloads + dashboard | Sim — o gestor manda o print |
| 7 | Instagram | Windsor.ai — automático | Não pedir print |

Itens 2 e 4 podem vir de `data/updates.json` se já capturados. **Não pedir print de novo.**

> **Frente Promotoras (v3 do dashboard):** na mesma captura de segunda, o gestor envia também os
> **2 formulários** (Tracking de Ativação + Heavy Users) para a aba Promotoras do dashboard.
> **Sempre perguntar quais dias e quantas promotoras foram a campo.** Ver `docs/ROTINA_PROMOTORAS.md`.
> A frente Promotoras entra no **dashboard**, não no corpo do e-mail.

### Campos a extrair de cada print do BI

Usuários cadastrados (acumulado) · novos cadastros no período · usuários com primeiro uso ·
usuários ativos no mês · **usuários pagantes / assinantes** · produtos cadastrados · imagens geradas.

Produtos e usuários ativos ainda são capturados para o dashboard e o histórico, mas **não
entram mais no corpo do e-mail** (ver seção 4). Imagens entra no e-mail nos blocos de semana e
mês (do período) e no bloco acumulado (acumulado).

**Usuários pagantes:** está no print do BI. Entra no e-mail **sempre**, inclusive quando
for **0** — zero que aparece no print não é dado ausente, é zero e é reportado como 0.
Só sai do e-mail métrica que não aparece no print.

### Downloads — App Store + Google Play (para o e-mail e para o dashboard)

Não vêm do BI nem do Windsor. O gestor manda os prints das duas lojas, nas métricas fixadas
na seção 0.3. Capturar o **acumulado por loja** e a **data de corte de cada uma**
(costumam divergir → corte misto):

| Loja | Campo no `updates.json` | Onde |
|---|---|---|
| App Store | `downloads.por_loja.appstore.acumulado` + `.corte` | App Store Connect |
| Google Play | `downloads.por_loja.google_play.acumulado` + `.corte` | Google Play Console |

**Downloads reportado = `total` = soma dos acumulados das duas lojas.** Se só uma loja
vier, atualizar essa, manter a outra, registrar em `nota` e avisar o gestor. Não estimar
a loja que faltou.

### Sobre o print de acumulado

O print filtrado por período mostra o volume **do período**, não o acumulado histórico.
Para a Posição acumulada, usar o print com janela **01/02/2026 até a data de corte**.

**Validação embutida:** nesse print, "novos cadastros" deve ser **igual** ao total de
"usuários cadastrados". Se for igual, a janela cobre 100% da base e o acumulado é válido.
Se for menor, existe cadastro antes de 01/02 e a janela precisa ser ampliada.

### Instagram — via Windsor.ai

Conector `instagram`, conta `17841480695293760` (MayaApp CDC · mayaapp.cdc).

| Campo | Field ID | Observação |
|---|---|---|
| Seguidores (total) | `followers_count` | Só o valor de hoje; sem histórico |
| Novos seguidores no dia | `follower_count` | **Indisponível abaixo de 100 seguidores.** Destrava quando a conta passar de 100 |
| Alcance diário | `reach` | Somar os dias da janela |
| Visualizações | `views` | Somar os dias da janela |
| Contas engajadas | `accounts_engaged` | Somar os dias da janela |
| Interações | `total_interactions` | Somar os dias da janela |
| Alcance por post | `media_reach` | Para identificar picos |
| Seguidores atribuídos por post | `media_follows` | Mede se o alcance vira base. `null` em reels — a API não suporta |

O alcance reportado é **soma do alcance diário**, não alcance único da janela.
Rotular assim sempre. O Instagram entra só no **e-mail** — está fora do escopo do dashboard.

> **Nota (24/08/2026):** a conta passou de 100 seguidores (152 em 24/08), então a métrica de
> **novos seguidores na janela destravou** e passa a entrar quando útil.

---

## 2. Validação de período — obrigatória antes de qualquer cálculo

O print do BI mostra o filtro de período no canto esquerdo. **Sempre conferir.**

| Verificação | Ação se falhar |
|---|---|
| O período do print bate com a janela pedida? | Parar e pedir o print correto |
| A semana começa domingo e termina sábado? | Parar e pedir novo recorte |
| A parcial vai de domingo a quinta? | Parar e pedir novo recorte |
| O comparativo de mês usa o mesmo dia de corte nos dois meses? | Parar e pedir o print do mês anterior no mesmo corte |
| No print de acumulado, novos cadastros = total de cadastrados? | Ampliar a janela para trás |
| O acumulado de cadastrados é ≥ o da rodada anterior? | Parar e questionar — pode ser limpeza de base ou filtro errado |
| Os números batem com `data/updates.json`? | Apontar as duas versões e pedir confirmação |
| A soma fecha? (acumulado anterior + novos do período = acumulado atual) | Apontar a diferença e pedir confirmação |

### Mensagem quando houver divergência

> **Preciso confirmar antes de montar o update.**
>
> Pedi: {janela solicitada}
> O print mostra: {período que aparece no filtro}
>
> {Se aplicável: "O acumulado de cadastrados caiu de X para Y. Isso costuma indicar
> limpeza de base ou filtro diferente — pode confirmar?"}
>
> Me manda o print com o filtro {janela correta} que eu sigo.

**Não estimar, não interpolar, não ajustar sozinho.**

---

## 3. Regras de cálculo

1. **Semana fecha no sábado.** A rodada de segunda reporta a semana domingo–sábado completa.
2. **Parcial compara com parcial.** Domingo–quinta contra domingo–quinta da semana anterior.
   Nunca contra semana inteira.
3. **Mês compara no mesmo ponto de corte.** "Julho até o dia 23" compara com "junho até o
   dia 23". Se o dado do mês anterior no mesmo corte não existir, comparar com o mês
   fechado **e declarar isso no e-mail**.
4. **Média móvel de 7 dias:** diferença entre o acumulado de cadastrados de hoje e o de
   7 dias atrás, dividido por 7, uma casa decimal.
5. **Delta acumulado** é a diferença desde a última rodada, não desde o início do mês.
6. **Dado ausente não vira zero nem estimativa.** A linha **sai do e-mail** e a ausência é
   reportada ao gestor na conversa, com o motivo.

### Percentuais

- Sempre **inteiros**, sem casa decimal. 8,9% → 9%. 43,1% → 43%.
- Sinal explícito: −43%, +14%.
- Nos blocos da janela de 5 dias / semana e do mês, mostrar **só o percentual**.
  O valor absoluto do período comparado **não entra** — o comparativo é declarado
  uma vez no título do bloco e não se repete linha por linha.
- No bloco de Posição acumulada, só **Downloads** leva delta absoluto (+11). Cadastros,
  Usuários pagantes e Imagens vão só com o valor.

---

## 4. Estrutura do e-mail

**Quatro blocos numéricos, nesta ordem, separados por linha em branco, mais o rodapé de corte.**
Sem bloco de comentário. Update frio e direto. Primeira linha opcional com o link do dashboard.

1. **POSIÇÃO ACUMULADA {DD/MM}** — Downloads (com delta), Cadastros, Usuários pagantes, Imagens (acumulado), e `Obs.` quando houver.
2. **SEMANA {NN}** (segunda) ou **JANELA DE 5 DIAS** (quinta) — percentuais.
3. **MÊS CORRENTE** — percentuais.
4. **INSTAGRAM** — percentuais.

Métricas por bloco:

- **Acumulado:** Downloads (± delta), Cadastros (valor), Usuários pagantes (valor), Imagens (valor acumulado).
  `Obs.` opcional, só quando houver ressalva de base (ex.: varredura de usuários de teste).
  Nada de primeiro uso nem produtos aqui.
- **Semana e Mês:** Cadastros, Usuários pagantes, Primeiro uso, Imagens — cada um com o percentual.
  No **Mês**, acrescentar "Média diária de cadastros (7 dias)". **Produtos não entra em nenhum bloco;
  Ativos no mês não entra no bloco do mês.**
- **Instagram:** Seguidores (valor), Alcance, Visualizações, Contas engajadas, Interações (percentuais).

Regras de formatação:

- **Título de cada bloco em negrito** e **linha em branco entre blocos.**
- **Usuários pagantes entra sempre, mesmo quando 0.**
- **Downloads fica só no bloco acumulado** enquanto a App Store der só totais (seção 0.3).
- Rodapé: **"Corte {DD/MM/AAAA}."** e **"Confidencial — uso interno."** — sem linha de "Fonte".

Sem observação de método no corpo do e-mail. Ressalvas de método e leitura qualitativa vão
para o gestor na conversa, não para o e-mail. A única exceção no corpo é a linha `Obs.` do
bloco acumulado, curta, quando há ressalva de base.

---

## 5. Template — segunda (fechamento da semana)

**Assunto:** MayaApp — fechamento da semana {NN} ({DD}–{DD}/{mês})

> Dashboard Atualizado - [Acesse](https://gustavokerner-byte.github.io/dados-usuarios/)
>
> **POSIÇÃO ACUMULADA {DD}/{MM}** · variação desde a última rodada ({DD}/{MM})
>
> Downloads: **{n}** ({±n})
> Cadastros: **{n}**
> Usuários pagantes: **{n}**
> Imagens: **{n}**
> Obs.: {ressalva de base, quando houver}
>
> **SEMANA {NN} · {DD} a {DD}/{mês}** · vs. semana {NN-1} ({DD}–{DD}/{mês})
>
> Cadastros: **{n}** ({±n}%)
> Usuários pagantes: **{n}** ({±n}%)
> Primeiro uso: **{n}** ({±n}%)
> Imagens: **{n}** ({±n}%)
>
> **{MÊS} ATÉ {DD}/{mês}** · {N} dias · vs. {mês anterior} no mesmo corte
>
> Cadastros: **{n}** ({±n}%)
> Usuários pagantes: **{n}** ({±n}%)
> Primeiro uso: **{n}** ({±n}%)
> Imagens: **{n}** ({±n}%)
> Média diária de cadastros (7 dias): **{n,n}**
>
> **INSTAGRAM · @mayaapp.cdc · semana {NN} ({DD}–{DD}/{mês}) vs. semana {NN-1}**
>
> Seguidores: **{n}** · Alcance: **{n}** ({±n}%) · Visualizações: **{n}** ({±n}%) · Contas engajadas: **{n}** ({±n}%) · Interações: **{n}** ({±n}%)
>
> Corte {DD}/{MM}/{AAAA}.
> Confidencial — uso interno.

Nota: Imagens aparece **duas vezes com sentidos diferentes** — no bloco acumulado é o total
acumulado (valor); nos blocos de semana e mês é o volume do período (percentual). São números
distintos, não repetir o mesmo.

---

## 6. Template — quinta (parcial da semana)

**Assunto:** MayaApp — parcial da semana {NN} ({DD}–{DD}/{mês})

Idêntico ao da seção 5, com duas diferenças:

- O bloco 2 vira **JANELA DE 5 DIAS · {DD} a {DD}/{mês}** · vs. {DD} a {DD}/{mês}, com as mesmas
  métricas (Cadastros, Usuários pagantes, Primeiro uso, Imagens) e a mesma formatação.
- O bloco de Instagram usa a mesma janela de 5 dias no título.

---

## 7. Após montar — e-mail E dashboard

A mesma captura gera as duas saídas. Fazer as duas na mesma rodada.

1. **Registrar em `data/updates.json`** os números da rodada — histórico que alimenta os
   comparativos e evita pedir print repetido.
2. **Sincronizar o dashboard.** Seguir `docs/ROTINA_DASHBOARD.md`: atualizar `downloads`
   (por loja + total), o mês corrente em `serie_mensal`, acrescentar linha em
   `acumulados_por_rodada`, e atualizar `data/meta.json` (`data_referencia`, `atualizado_em`).
   **Rodar a validação da seção 5 daquele doc.** Se falhar, parar e reportar — não publicar.
   Atualizar também `data/promotoras.json` (aba Promotoras) quando os 2 formulários vierem.
3. **Publicar / entregar os JSON.** Se o Cowork tiver acesso de escrita ao repo
   `dados-usuarios`, commitar e dar push. **Se não tiver, entregar os JSON validados
   ao gestor** (ou um payload com os campos a aplicar) e sinalizar que o dashboard só
   atualiza após o commit dele.
4. **Criar o e-mail como rascunho no Gmail**, para os dois destinatários. Nunca enviar direto.
5. **Notificar o gestor** em poucas linhas: rascunho criado, dashboard sincronizado (ou JSON
   entregues para commit), o que ficou de fora e por quê, e qualquer divergência de período.
   Não repetir os números na notificação.

---

## 8. Regras de conduta

1. Não inventar, não estimar, não interpolar.
2. Não comparar período parcial com período fechado sem declarar.
3. Divergência para a rotina e sobe para decisão humana.
4. Sempre rascunho, nunca envio direto. Dashboard nunca publicado sem validação.
5. Se o número caiu, o número caiu. Sem adjetivo, sem atenuação, sem omissão.
6. Dado indisponível sai do e-mail e vira `—` no dashboard — nunca vira zero.
7. Nada de execução, marcos ou leitura qualitativa nos blocos numéricos.

---

## 9. Prompts para as tarefas recorrentes do Cowork

### Segunda, 8h — fechamento da semana + dashboard

> Execute a rodada de **fechamento de semana** do MayaApp (e-mail ao investidor +
> sincronização do dashboard). Leia `docs/ROTINA_UPDATE_INVESTIDOR.md` (seções 0 a 7) e
> `docs/ROTINA_DASHBOARD.md`. A semana vai de domingo a sábado — reporte a semana fechada
> que terminou no sábado. Comece verificando o que já tenho em `data/updates.json` e me
> diga exatamente quais prints preciso mandar e com qual filtro de período — incluindo os
> prints de Downloads da App Store e da Google Play (acumulado por loja). Puxe o Instagram
> pelo Windsor.ai sem me pedir print. Valide o período de cada print antes de calcular.
> Percentuais inteiros. Dado indisponível sai do e-mail e você me reporta. Ao final:
> (1) atualize e valide os 3 JSON do dashboard; (2) se tiver acesso de escrita ao repo
> dados-usuarios, comite e dê push, senão me entregue os JSON validados para commit;
> (3) crie o rascunho no Gmail para vinicius.dias@cws-platform.com e fernando@cws-platform.com;
> (4) me liste as pendências.

### Quinta, 8h — parcial da semana + dashboard

> Execute a rodada **parcial da semana** do MayaApp (e-mail ao investidor + sincronização
> do dashboard). Leia `docs/ROTINA_UPDATE_INVESTIDOR.md` (seções 0 a 7, template da seção 6)
> e `docs/ROTINA_DASHBOARD.md`. A janela parcial é domingo a quinta da semana corrente,
> comparada com os mesmos 5 dias da semana anterior. Peça os prints do BI e os de Downloads
> por loja (App Store + Google Play). Mesmas regras de validação, mesmos destinatários,
> mesmas regras de percentual e de dado indisponível. Ao final, atualize e valide os 3 JSON
> do dashboard, publique ou me entregue para commit, crie o rascunho no Gmail e me liste as
> pendências.

---

## 10. Pendências estruturais

| # | Pendência | Impacto |
|---|---|---|
| 1 | Acesso de escrita ao repo privado `dados-usuarios` a partir do Cowork | Sem ele, o dashboard não publica sozinho — os JSON/payload são entregues ao gestor para commit manual |
| 2 | Definição do denominador de "engajamento %" | Bloco de Instagram segue em números absolutos |
| 3 | Ficha Mestra (arquivo 01) ausente da base do projeto | Fora desta rotina. Não bloqueia: o print do BI é a fonte canônica |
| 4 | Split de Downloads por período (semanal/mensal) na App Store | App Store dá só totais → Downloads fica só no bloco acumulado do e-mail |
| 5 | Inserir a aba Promotoras no código do `dados-usuarios` | Dado (`promotoras.json`) já gerado; falta o código do repo ou PAT. Ver `docs/ROTINA_PROMOTORAS.md` |

**DIV-01 — resolvida.** O print do BI prevalece (seção 0.1). Os números do deck de
20/06/2026 (487 cadastrados, 2.000 produtos, 20.000 imagens) não devem ser usados.

**DIV-02 — resolvida (28/07/2026).** Métrica de downloads por loja fixada na seção 0.3:
App Store = Total de downloads; Google Play = Store listing acquisitions. "New users" e
"All users" do Google Play e "First-time" da Apple foram descartados para manter consistência
com o histórico reportado ao Conselho.
