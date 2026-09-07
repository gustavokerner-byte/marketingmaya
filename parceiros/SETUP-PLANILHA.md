# Ligar o formulário na planilha do Google (5 minutos)

O formulário da landing faz duas coisas ao ser enviado:

1. **grava a inscrição numa planilha do Google** (registro permanente, mesmo que a pessoa desista de mandar a mensagem);
2. **abre o WhatsApp** com os dados já escritos, para o contato imediato.

O passo 2 já funciona — falta só o número. O passo 1 precisa destes 6 passos:

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
const WHATSAPP = "5511900000000";   // número que recebe os leads (55 + DDD + número)
const PLANILHA = "";                 // colar aqui a URL .../exec
```

Pronto. Cada inscrição vira uma linha na planilha.

## Trocar o código depois
Se editar o script, é preciso **Implantar → Gerenciar implantações → ✏️ → Nova versão**,
senão o Web App continua rodando a versão antiga. A URL não muda.

## Avisar a equipe por e-mail
No `apps-script.gs` há um bloco `MailApp.sendEmail(...)` comentado — descomente e troque
o endereço para receber um e-mail a cada nova inscrição.
