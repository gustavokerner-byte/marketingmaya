# Ligar o formulário na planilha do Google (5 minutos)

O formulário da landing grava cada inscrição numa planilha do Google. É o único
destino dos leads — se o envio falhar, a página avisa a pessoa na hora.

**Já está configurado nesta landing.** O passo a passo abaixo fica como referência,
caso precise recriar ou trocar a planilha.

## 1. Criar a planilha
Crie uma planilha nova no Google Drive, por exemplo **"MayaApp — Inscrições de Parceiros"**.
Não precisa criar colunas: o script cria a aba `Inscrições` e o cabeçalho sozinho.

## 2. Abrir o editor de script
Na planilha: **Extensões → Apps Script**.

## 3. Colar o código
Apague o conteúdo de `Código.gs` e cole tudo o que está em [`apps-script.gs`](apps-script.gs). Salve (💾).

## 4. Publicar como Web App
**Implantar → Nova implantação → Tipo: App da Web**, com:

| Campo | Valor |
|---|---|
| Descrição | Inscrições parceiros |
| Executar como | **Eu** (sua conta) |
| Quem pode acessar | **Qualquer pessoa** |

Clique em **Implantar** e autorize o acesso quando o Google pedir
(a tela de aviso "app não verificado" é normal: *Avançado → Acessar o projeto*).

## 5. Copiar a URL
No fim aparece a **URL do app da Web**, terminada em `/exec`. Copie.

## 6. Colar na landing
Em `parceiros/index.html`, no bloco `CONFIGURAÇÃO` no fim do arquivo:

```js
const PLANILHA = "";   // colar aqui a URL .../exec
```

Pronto. Cada inscrição vira uma linha na planilha.

## Trocar o código depois
Se editar o script, é preciso **Implantar → Gerenciar implantações → ✏️ → Nova versão**,
senão o Web App continua rodando a versão antiga. A URL não muda.

## Avisar a equipe por e-mail
No `apps-script.gs` há um bloco `MailApp.sendEmail(...)` comentado — descomente e troque
o endereço para receber um e-mail a cada nova inscrição.
