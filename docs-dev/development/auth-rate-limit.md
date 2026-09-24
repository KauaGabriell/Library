# Rate limit de autenticação

## Configuração atual

A API aplica limites por rota e por IP usando `@fastify/rate-limit`:

| Rota | Limite | Janela |
| --- | ---: | --- |
| `POST /auth/login` | 5 tentativas | 15 minutos |
| `POST /auth/register` | 10 tentativas | 15 minutos |
| `GET /auth/google/callback` | 10 tentativas | 15 minutos |

Os valores ficam em `apps/api/src/config/fastify/authRateLimitConfig.ts`; as rotas os aplicam individualmente. O limite de login conta tentativas bem-sucedidas e malsucedidas.

Ao exceder um limite, a API responde `429` no contrato compartilhado e envia `Retry-After`, indicando quando a tentativa poderá ser feita novamente.

## Store em memória

Sem configuração de store externo, o plugin mantém os contadores em memória no processo da API. Isso é adequado para desenvolvimento e para um MVP executado em uma única instância: não exige infraestrutura adicional.

Esse contador não é persistido. Reiniciar o processo zera os contadores. Além disso, duas instâncias da API mantêm contadores separados. Com duas instâncias atrás de um load balancer, por exemplo, as requisições do mesmo IP podem cair em instâncias diferentes e cada uma contabilizar apenas parte das tentativas. Assim, o limite deixa de ser global para aquele IP.

## Quando usar store compartilhado

Ao executar múltiplas instâncias, configure um store compartilhado, como Redis, para que todas consultem e atualizem os mesmos contadores. A troca exige configurar a dependência e a conexão Redis no plugin; apenas adicionar Redis ao projeto não compartilha automaticamente o estado.

Antes dessa mudança, decidir também como o rate limit deve se comportar se o store ficar indisponível: falhar fechado (bloquear a requisição) ou falhar aberto (permiti-la). A escolha envolve disponibilidade e proteção contra abuso.

## Proxy e IP do cliente

Os limites dependem do IP que Fastify identifica na requisição. Em produção atrás de proxy reverso/load balancer, configurar `trustProxy` conforme os endereços ou saltos de proxy realmente confiáveis. Não ativar confiança indiscriminada: aceitar `X-Forwarded-For` de qualquer origem permite que clientes falsifiquem o IP e contornem o limite.

Atualmente, a aplicação não configura `trustProxy`, então Fastify mantém o padrão desabilitado. Validar a configuração no ambiente de deploy, onde a topologia real de rede é conhecida. Em execução local sem proxy, não é necessário habilitá-la.

## Referências no código

- Configuração dos valores: `apps/api/src/config/fastify/authRateLimitConfig.ts`.
- Aplicação dos limites nas rotas: `apps/api/src/modules/auth/authRoutes.ts`.
- Resposta padronizada `429`: handler global e contrato compartilhado em `apps/api/src/middlewares/errorHandling.ts` e `packages/contracts/src/errors.ts`.
