# Rotina de segunda-feira — atualizar o dashboard

Leva uns 5 minutos. Toda semana fecha no sábado, então na segunda a semana anterior
já está fechada e pronta para entrar.

---

## 1. Cadastros (BI da CWS)

Abra **Maya App → Desempenho Geral** e tire o print com o filtro de período na
**semana fechada: domingo a sábado**. Exemplo, na segunda 03/08 o recorte é
`7/26/2026` a `8/1/2026`.

Com os números na tela, rode:

```bash
python3 tools/add_semana.py
```

Ele sugere o domingo certo e pede um campo por vez:

| Campo | Onde está no BI |
|---|---|
| Novos cadastros na semana | topo, **Novos Cadastros** |
| Usuários com primeiro uso | card **Usuários com Primeiro Uso** |
| Usuários ativos no mês | card **Usuários Ativos no Mês** |
| Usuários cadastrados (acumulado) | card **Usuários Cadastrados** |
| Produtos cadastrados | **Funil de Conversão**, 1º box |
| Produtos salvos | **Funil de Conversão**, 3º box |
| Imagens geradas | **Funil de Conversão**, 4º box |
| Imagens salvas | **Funil de Conversão**, 6º box |
| Heavy users | **Heavy Users**, "N usuários com 6+ cadastros" |

O script recusa datas que não sejam domingo — é de propósito, para a série não
desalinhar do corte do BI.

Uma vez por mês, quando virar o mês, atualize também os blocos de mês:

```bash
python3 tools/add_semana.py --inicio 2026-08-30 --mes-cadastros 41 --mes-primeiro-uso 24 ...
```

ou edite `data/cadastros.json` na mão nos blocos `mes` e `mes_anterior`. Mantenha
`mes_anterior` no **mesmo recorte de dias** do mês corrente (1–25 contra 1–25, e não
1–25 contra 1–31), senão a comparação mensal fica inflada.

---

## 2. QR Codes (ativações físicas)

Exporte os scans de cada frente e salve em `data/qr/`. Pode acumular arquivos e pode
ter sobreposição de período: leituras repetidas são removidas automaticamente.

```bash
python3 tools/build_ativacoes.py
```

Confira no fim do output se o total de scans faz sentido e se as 3 frentes apareceram.
Se surgir `! QR sem frente mapeada`, uma frente nova entrou em campo: adicione o nome
do QR no dicionário `FRENTES` dentro de `tools/build_ativacoes.py`.

---

## 3. Instagram

Nada a fazer. A GitHub Action atualiza o `data.json` sozinha.

Lembrete que continua valendo: **reels em collab onde a CDC é a dona do post não
aparecem** na API. Se `media_count` não bater com o número de posts retornados, é
collab faltando. Para os próximos, a MayaApp CDC precisa ser a dona do post.

---

## 4. Publicar

```bash
git add data/ && git commit -m "dados semana 26/07-01/08" && git push
```

O GitHub Pages atualiza em um ou dois minutos. Confira o rodapé do dashboard: ele
mostra a data da última atualização de cada fonte.

---

## Antes de mandar para a diretoria

Três checagens que evitam pergunta sem resposta na reunião:

**A soma da série bate com o acumulado?** Se somar `cadastros` de todas as semanas e
der diferente do que o BI mostra como acumulado, tem semana faltando na série.

**Algum delta ficou absurdo?** Variação acima de 100% quase sempre é erro de
digitação ou período errado no filtro do BI, não performance real.

**Alguma frente de QR zerou a semana?** Pode ser banner arrancado, coberto ou
adesivo que acabou. Vale checar com a Jaque em campo antes de reportar como queda de
performance.
