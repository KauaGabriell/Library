# Style Guide — Literaria

> Fonte visual: [Figma — Library](https://www.figma.com/design/bCY2ciXcEXbcG0Fd6PPDRe/Library?node-id=1-1089). O frame `Style Guide Completo - Literaria` é a referência visual primária; este documento é a referência para produto e implementação.

## 1. Direção visual

Literaria é uma biblioteca pessoal em **light mode editorial**. A interface combina uma base clara e silenciosa com tipografia serifada para títulos e uma sans-serif funcional para navegação, dados e ações. Capas e conteúdo do usuário têm prioridade; ornamento é discreto.

Princípios:

- Papel, não painel: fundos quentes e claros; evitar superfícies escuras grandes.
- Leitura primeiro: título, autor, status e ação têm ordem previsível.
- Dourado é semântico: indica ação primária, seleção ativa ou progresso; não usar como decoração recorrente.
- Uma ação primária por contexto; ações destrutivas nunca usam dourado.
- Interfaces privadas não simulam recursos sociais no MVP.

## 2. Tokens visuais

Os valores exatos de cor devem ser consumidos a partir do frame de Figma; os nomes abaixo são o contrato de implementação. Não criar cores locais por componente.

### Cores semânticas

| Token | Uso |
|---|---|
| `color.background.canvas` | página e área externa clara |
| `color.background.surface` | cards, modais, tabelas e campos |
| `color.background.subtle` | sidebar, filtros, skeleton e áreas agrupadas |
| `color.text.primary` | títulos, corpo principal e ícones relevantes |
| `color.text.secondary` | autor, metadados e descrições auxiliares |
| `color.text.muted` | placeholders, estados indisponíveis e informação terciária |
| `color.border.default` | divisores, campos e cards neutros |
| `color.border.strong` | foco, seleção e contornos de ação |
| `color.brand.primary` | dourado editorial: CTA primário, item ativo, progresso e estrelas |
| `color.brand.primary-hover` | hover/pressed de CTA primário |
| `color.status.wantToRead` | estado `QUERO_LER` neutro |
| `color.status.reading` | estado `LENDO` azul claro |
| `color.status.read` | estado `LIDO` verde suave |
| `color.feedback.success` | confirmação de sucesso |
| `color.feedback.error` | erro recuperável ou validação inválida |
| `color.feedback.warning` | aviso sem bloqueio |

### Regras de contraste

- Texto normal deve atingir contraste mínimo de 4.5:1; texto grande, 3:1.
- CTA dourado usa texto escuro ou claro conforme o contraste real do token aprovado.
- Cor nunca é o único indicador: status inclui texto, ícone ou ambos; erro inclui mensagem associada ao campo.
- `focus-visible` usa `color.border.strong` com anel externo de 2px.

## 3. Tipografia

| Papel | Família | Peso | Tamanho desktop | Uso |
|---|---|---:|---:|---|
| Display | EB Garamond | 600 | 48px | título de página/resultado importante |
| Heading LG | EB Garamond | 600 | 32px | cabeçalho de seção principal |
| Heading MD | EB Garamond | 500 | 24px | seção, card de destaque e modal |
| Heading SM | EB Garamond | 500 | 20px | título de livro e bloco secundário |
| Body LG | Libre Franklin | 400 | 18px | corpo de sinopse e conteúdo confortável |
| Body MD | Libre Franklin | 400 | 16px | corpo padrão |
| Body SM | Libre Franklin | 400 | 14px | autor, metadados e ajuda |
| Label MD | Libre Franklin | 600 | 14px | controles e CTA |
| Label SM | Libre Franklin | 600 | 12px | labels, colunas e status |

- Títulos usam `line-height` entre 1.15 e 1.25; corpo e texto de formulário, entre 1.45 e 1.6.
- Título de livro em card pode ocupar até duas linhas; autor, uma. Não usar truncamento de título em uma linha quando houver espaço vertical disponível.
- Labels de tabela e categorias usam caixa alta apenas quando a referência do Figma já a usa.

## 4. Espaçamento, grid e responsividade

### Escala

Usar escala de 4px: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

| Contexto | Regra |
|---|---|
| Conteúdo desktop | largura máxima de 1280px; respiro lateral de 48px ou mais |
| Sidebar desktop | largura fixa aproximada de 200px; não compete com o conteúdo |
| Página desktop | grid de 12 colunas e gap de 24px |
| Tablet | reduzir padding lateral para 24px; preservar hierarquia antes de densidade |
| Mobile | padding lateral de 16px; navegação lateral vira menu recolhível |

- Cards de busca usam grid responsivo: 4 colunas largas no desktop, 2 no tablet, 1 no mobile.
- Card de resultado nunca pode encolher abaixo da largura que preserva capa, título, metadados e CTA. Se faltar espaço, reduzir colunas; não comprimir conteúdo.
- Tabelas da biblioteca viram cards de leitura no mobile; não devem exigir scroll horizontal para ações essenciais.

## 5. Superfícies, bordas e elevação

- Raio pequeno: 6–8px em input, tag e botão; raio médio: 10–12px em cards e modais.
- Bordas são finas, discretas e usam `color.border.default`.
- Elevação é rara: card em repouso é plano; hover pode elevar sutilmente. Modal e quiz usam sombra suave para separação clara.
- Divisores estruturam dados densos; não adicionar sombra e borda forte simultaneamente sem necessidade.

## 6. Componentes

### Botões

| Variante | Uso | Estado |
|---|---|---|
| Primário | ação principal: adicionar livro, avançar quiz, confirmar | fundo `brand.primary`; hover perceptível; loading preserva largura |
| Secundário | voltar, refazer quiz, ação contextual | superfície clara com borda |
| Terciário/link | detalhes, cancelar, navegação auxiliar | texto sublinhado ou ícone + texto |
| Destrutivo | remover livro, nota ou conta | nunca visualmente igual ao primário; exige confirmação para exclusão material |
| Ícone | ação conhecida e frequente | `aria-label`, tooltip e alvo de toque mínimo de 40–44px |

Todos os botões têm estados `default`, `hover`, `focus-visible`, `disabled` e `loading`. CTA não pode quebrar em múltiplas linhas por falta de largura; o layout deve crescer ou refluír antes disso.

### Campos e seleção

- Input padrão: label visível, placeholder auxiliar e mensagem de erro associada.
- Busca: ícone de lupa, Enter para enviar, loading e erro recuperável.
- Quiz: opções são radios para escolha única ou checkboxes quando a pergunta aceitar múltiplas escolhas; seleção usa borda + check, não somente cor.
- Campos numéricos de página atual aceitam apenas inteiro e apresentam limite quando `pageCount` existir.

### Cards de livro

Estrutura obrigatória, nesta ordem:

1. Capa com proporção fixa e fallback quando ausente.
2. Título (até duas linhas) e autor (uma linha).
3. Metadados compactos: gênero e páginas, quando disponíveis.
4. CTA primário `Adicionar à biblioteca`.
5. Ação terciária `Ver detalhes`.

O card não é um link geral quando contém botão: capa/título podem abrir detalhe, enquanto o CTA mantém ação explícita. Após inclusão, o CTA muda para `Na biblioteca · Quero ler` e não permite duplicidade.

### Status de leitura

- `QUERO_LER`: tag neutra com texto explícito.
- `LENDO`: tag azul clara; pode acompanhar progresso de página quando houver total.
- `LIDO`: tag verde suave; habilita avaliação e resenha.

### Biblioteca em tabela

Desktop usa colunas Livro, Adicionado, Estado, Nota e Ações. Linha inteira ou título abre detalhe; ícones de ação têm tooltip. Excluir é separado de editar e pede confirmação.

### Navegação

- Sidebar destaca apenas a rota ativa com fundo sutil e marcador dourado.
- A busca é ação global; dashboard prioriza atividade e resumo, não um campo de busca dominante.
- Perfil/configurações não têm rota dedicada no MVP; o rodapé pode mostrar conta e logout.

## 7. Estados de interface

| Estado | Regra |
|---|---|
| Loading | skeleton preserva a geometria do conteúdo, sem saltos de layout |
| Empty biblioteca | explicar ausência e apontar para busca de livros |
| Empty busca | informar que não houve resultado e sugerir trocar o termo |
| Erro de integração | mensagem objetiva, ação de tentar novamente e nenhum dado parcial salvo |
| Sucesso | toast curto, com texto da ação concluída e sem depender apenas de cor |
| Disabled | explicar motivo quando a ação for relevante, como avaliação antes de `LIDO` |

## 8. Padrões por tela

### Dashboard

Cards de resumo, atividade recente, meta anual opcional e CTA de quiz. Busca fica acessível pela navegação global.

### Busca

Campo amplo no topo. Antes da consulta, usar “Explore o catálogo”; depois, “Resultados para ‘termo’”. Exibir paginação ou carregar mais e os estados de catálogo indisponível.

### Detalhe do livro

Priorizar capa, metadados, estado e sinopse. Em `LENDO`, exibir controle de página atual se houver `pageCount` e permitir anotações. Em `LIDO`, apresentar leitura concluída, avaliação, resenha e anotações. Não exibir compartilhamento no MVP.

### Quiz e resultado da IA

Quiz mostra uma pergunta por vez, `Pergunta n de total`, opção selecionada claramente e botão próximo desabilitado sem resposta. Resultado traz exatamente três cards, cada um com justificativa curta “Por que combina com você” e CTA de inclusão.

## 9. Acessibilidade e qualidade de implementação

- Usar HTML semântico: `button` para mutação, `a` para navegação e `fieldset`/`legend` no quiz.
- Ordem de tabulação acompanha a ordem visual; modal aprisiona foco e retorna ao gatilho ao fechar.
- Respeitar `prefers-reduced-motion`; animações são curtas e não bloqueiam ações.
- Capas têm alt com título e autor; imagem decorativa tem alt vazio.
- Toda mutation tem loading, sucesso e erro; erros de API seguem mensagem humana, não código interno.
- Testar 320px, tablet e desktop; testar zoom de 200% e navegação só por teclado.

## 10. Handoff para implementação

1. Criar tokens CSS/tema com os nomes da seção 2, mapeados aos valores aprovados no Figma.
2. Implementar componentes base antes das telas: Button, IconButton, Input, Tag, Card, Dialog, Toast e Skeleton.
3. Construir páginas com os componentes; não copiar estilos por tela.
4. Validar cada estado contra os frames de Figma: default, hover, focus, loading, vazio e erro.
5. Registrar toda nova cor, raio ou espaçamento como token antes de reutilizá-lo.

## 11. Itens deliberadamente fora do guide do MVP

- Tema escuro.
- Perfil/configurações como páginas completas.
- Componentes de seguidores, feed, comentários, reações ou compartilhamento.
- Gamificação, Pomodoro, estatísticas de tempo e notificações.

Esses itens pertencem à evolução de produto e só recebem componentes após requisitos, privacidade e fluxos próprios serem aprovados.
