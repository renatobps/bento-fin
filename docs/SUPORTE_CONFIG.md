# Configuração de Suporte — Bento

Guia para configurar os canais de atendimento ao usuário.

---

## 1. E-mail de suporte

### Configurar `suporte@bento.com.br`

**Com Google Workspace (domínio próprio):**

1. Acesse [admin.google.com](https://admin.google.com)
2. Crie o usuário `suporte@bento.com.br`, **ou**
3. Crie um alias no e-mail principal: `suporte@bento.com.br` → `seu-email@bento.com.br`

**Sem domínio próprio (temporário):**

Use `bentofinancas.suporte@gmail.com` até ter domínio configurado.

### Resposta automática no Gmail

1. Gmail → **Configurações** → **Ver todos os configurações**
2. Aba **Resposta automática** → ativar
3. Cole o texto:

```
Olá! Recebemos seu e-mail e nossa equipe vai responder em até 24 horas úteis.

Se sua dúvida for urgente (problema com cobrança ou sem acesso à conta),
mencione isso no assunto para priorizarmos.

Equipe Bento
```

### Labels para triagem

Crie estes labels no Gmail:

| Label | Uso |
|-------|-----|
| 🐛 Bug | Erros e funcionalidades quebradas |
| 💳 Cobrança | Pagamentos, faturas, Stripe |
| ❓ Dúvida | Perguntas gerais de uso |
| 💡 Feedback | Sugestões e elogios |
| ❌ Cancelamento | Pedidos de cancelamento |
| ✅ Resolvido | Tickets encerrados |

### Filtros automáticos

| Condição no assunto/corpo | Ação |
|---------------------------|------|
| contém "cancelar" ou "cancelamento" | Label **Cancelamento** |
| contém "cobrança", "cobrado" ou "pagamento" | Label **Cobrança** |
| contém "bug", "erro" ou "não funciona" | Label **Bug** |

### Variável de ambiente

No `.env` do backend:

```properties
SUPPORT_EMAIL=suporte@bento.com.br
```

---

## 2. Configurar Crisp (chat ao vivo)

O [Crisp](https://crisp.chat) é gratuito para até 2 agentes.

### Passo a passo

1. Acesse [app.crisp.chat](https://app.crisp.chat) e crie uma conta gratuita
2. Crie um novo **Website** chamado "Bento"
3. Vá em **Settings → Integrations → Chat Widget** e copie o **WEBSITE_ID** (formato UUID)
4. Cole no `.env` do dashboard:

   ```properties
   NEXT_PUBLIC_CRISP_WEBSITE_ID=seu-website-id-aqui
   ```

5. Configure o horário de atendimento em **Settings → Availability**
6. Configure a mensagem de ausência:

   > Recebemos sua mensagem! Respondemos em até 4 horas no horário comercial (seg-sex, 9h-18h).

### App mobile

Instale o app Crisp no celular para receber notificações de chat em tempo real.

---

## 3. Testar o fluxo completo

1. Envie **"ajuda"** para o número do Bento no WhatsApp
2. Responda **"1"** e verifique a resposta sobre registro de gastos
3. Responda **"5"** e confirme que o e-mail de suporte aparece corretamente
4. Acesse o dashboard e verifique o widget Crisp no canto inferior direito
5. Abra um chat no Crisp e confirme que plano e telefone do usuário aparecem para o agente
