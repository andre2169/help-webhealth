# HelpWeb Health Web

Frontend do **HelpWeb Health**, desenvolvido com React e Vite. A interface foi pensada para uso em computadores e celulares, considerando funcionarios de instituicoes de saude publica que podem ter pouca familiaridade com tecnologia.

Estado sincronizado com o projeto ativo em 29/09/2026. No desenvolvimento local, o frontend usa a API em `http://localhost:8000`; na hospedagem, configure `VITE_API_URL` antes do build. O arquivo `.env` real nao faz parte do repositorio.

O objetivo da interface e permitir que o usuario abra e acompanhe chamados de forma simples, enquanto tecnicos e administradores acessam recursos operacionais como dashboard, relatorios e atendimento.

## Objetivo da interface

O frontend organiza a experiencia em tres fluxos principais:

- funcionario comum abre e acompanha seus chamados;
- tecnico acompanha a fila, assume chamados, registra comentarios e resolve atendimentos;
- administrador acompanha indicadores e gerencia usuarios.

A proposta e reduzir falhas de comunicacao comuns em ambientes publicos de saude, onde chamados podem ser feitos verbalmente, por telefone ou por mensagens sem registro formal.

## Principais recursos

- Login e cadastro.
- Interface responsiva para desktop e celular.
- Temas claro e escuro, com preferencia mantida pelo navegador.
- Rolagem das páginas por teclado com setas, PageUp, PageDown, Home e End.
- Sidebar com navegacao por perfil.
- Tela de inicio autenticada com atalhos, chamados recentes e orientacoes de uso seguro.
- Logo, item Inicio e area do usuario com navegacao direta para inicio/perfil.
- Perfil com telefone brasileiro em DDD + numero, funcao, setor, unidade e preferencia de notificacao.
- Alteracao de email e senha em duas etapas, com codigo de verificacao gerado pela API.
- Novas senhas exigem pelo menos 10 caracteres, letras e numeros, alinhado a validacao do backend.
- Contas com email pendente sao direcionadas ao Perfil, onde o campo de codigo fica visivel para confirmar ou reenviar o codigo.
- Recuperacao de conta pela tela de login, com codigo enviado ao email cadastrado.
- Links de login, cadastro e recuperacao separados para evitar confusao em telas pequenas.
- Abertura de chamados com setor, categoria, equipamento, patrimonio, impacto e ate 3 fotos opcionais.
- Fotos tiradas pelo celular sao compactadas antes do envio para reduzir erros de tamanho no deploy com SQLite.
- Lista de chamados com filtros.
- Chamados excluidos aparecem na listagem pelo filtro de status e podem ser consultados em uma previa; somente administradores recebem acoes de excluir e recuperar.
- Chamados excluidos preservam o status anterior e o historico; a autorizacao para recuperar tambem e validada pela API.
- Detalhe do chamado com comentarios, timeline e status.
- Foto de perfil do usuario.
- Notificacoes internas por perfil: tecnicos recebem novos chamados e atualizacoes dos chamados vinculados; usuarios recebem apenas atualizacoes dos proprios chamados; administradores consultam os eventos pela area administrativa.
- Polling de notificacoes limitado e pausado quando a aba fica em segundo plano, reduzindo carga desnecessaria na API.
- Consultas GET recentes sao deduplicadas por poucos segundos na memoria da aba, evitando chamadas repetidas quando a tela recarrega dados muito rapido.
- Dashboard e relatorios apenas para tecnicos e administradores; administradores veem a operacao global e tecnicos veem somente os proprios atendimentos, com a fila sem responsavel em area separada.
- Relatorios com filtros por periodo, status, prioridade, impacto, setor e categoria.
- Secoes de indicadores e filtros em chamados, dashboard e relatorios podem ser recolhidas ao clicar no proprio painel, para reduzir a ocupacao da tela.
- Indicadores de volume diario, idade da fila ativa, chamados sem tecnico, reaberturas e solicitantes recorrentes.
- Relatorio gerencial com download de PDF real gerado pela API, em formato A4 e com layout proprio de documento administrativo.
- Visualizacao ampliada das fotos anexadas ao chamado, com navegacao entre imagens e controle de zoom.
- Ajustes responsivos para telas intermediarias, tablets e celulares, evitando que cards, tickets e textos longos ultrapassem os blocos.
- Controle de redirecionamento por perfil.
- Campos de setor, categoria e equipamento exibem sugestoes ao receber foco, sem preencher um valor que o usuario precise apagar; a API continua validando e autorizando o valor final.
- Login usa cookie HttpOnly emitido pela API; o JavaScript do frontend nao le o JWT.
- Requisicoes autenticadas de alteracao enviam automaticamente o token CSRF recebido em cookie separado; o JWT nunca fica em `localStorage` ou `sessionStorage`.
- Logout chama a API para revogar o token atual e limpar o cookie da sessao.
- Chaves antigas de token em `localStorage`/`sessionStorage` sao removidas ao carregar a aplicacao.
- Servidor estatico de producao inclui headers de seguranca como CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS e Permissions-Policy.
- Servidor estatico aceita apenas `GET` e `HEAD`, limita tamanho de URL/headers e aplica cache longo nos assets gerados pelo build.
- Formatacao de data/hora no fuso `America/Sao_Paulo`.
- O repositorio inclui workflow de GitHub Actions para lint, build e auditoria de dependencias de producao. Consulte o resultado mais recente na aba Actions; um resultado historico nao garante que as dependencias continuem sem avisos.

## Comunicacao com backend

O frontend nao acessa o banco de dados diretamente. Toda leitura ou alteracao passa pela API configurada em `VITE_API_URL`.

O arquivo responsavel por centralizar essas chamadas e:

```text
src/api/api.js
```

Isso mantem o SQLite e as regras de negocio protegidos no backend. O navegador recebe apenas as respostas permitidas pelos endpoints da API.
Validacoes no frontend existem apenas para orientar o usuario antes do envio. As decisoes sensiveis ficam no backend: autenticacao, autorizacao, status do chamado, SLA, filtros aceitos, limites de upload, confirmacao de email e calculos dos relatorios.
O mesmo vale para notificacoes: o frontend apenas consulta as notificacoes que a API retorna para o usuario logado. A decisao de quem deve ser avisado fica no backend.
Campos como telefone tambem sao validados novamente pela API. Na interface, o telefone aceita apenas numeros brasileiros no formato DDD + numero, sem DDI ou `+55`.

Nao existe conexao do frontend com SQLite, arquivo `.db`, SQLAlchemy ou qualquer credencial de banco. O fluxo correto e sempre:

```text
Navegador -> Frontend React -> API FastAPI -> SQLAlchemy ORM -> Banco SQLite/PostgreSQL
```

## Perfis na interface

Usuario comum:

- Inicio
- Meus chamados
- Novo chamado
- Perfil

Tecnico:

- Inicio
- Dashboard
- Chamados
- Novo chamado
- Atendimento
- Relatorios
- Perfil

Administrador:

- Inicio
- Dashboard
- Chamados
- Novo chamado
- Atendimento
- Relatorios
- Usuarios
- Perfil

## Notificacoes

Tecnicos e usuarios autorizados veem um sino na barra superior. Para o tecnico,
ele mostra chamados novos e atualizacoes dos chamados vinculados. Para o usuario,
mostra apenas atualizacoes dos chamados que ele abriu. O administrador nao entra
na caixa comum de notificacoes, mas possui a tela administrativa de eventos em
`/admin/eventos` para consultar o historico geral.

O frontend consulta:

```text
GET /api/v1/notifications/
PATCH /api/v1/notifications/{notification_id}/read
PATCH /api/v1/notifications/read-all
```

Essas rotas usam cookie HttpOnly de sessao e nao exigem token salvo no navegador.
O frontend nunca decide os destinatarios: a API aplica as regras de perfil,
vinculo do tecnico e dono do chamado.

Na area administrativa, `/admin/eventos` apresenta uma lista paginada de
chamados com eventos agrupados por atendimento. A pesquisa e feita na API por
codigo, titulo ou palavra-chave. Ao selecionar um chamado, a interface abre
um painel responsivo com status, responsaveis e a linha do tempo completa,
carregada somente para o item selecionado.

## Notificacoes WhatsApp

O envio opcional por WhatsApp e executado somente pelo backend, usando Redis
Streams e um worker separado. O provedor previsto e a Evolution API no modo
Baileys. O frontend apenas permite ao usuario escolher a preferencia de contato;
nao recebe a chave da Evolution API e nao acessa Redis ou o banco.

Nesta primeira etapa o fluxo e somente de saida. A mensagem contem o codigo do
chamado, um resumo operacional curto e um link para a tela protegida do sistema.
Respostas, comandos e dados clinicos nao sao processados pelo WhatsApp.

## Estrutura principal

```text
helphealth-web/
  public/              Arquivos publicos
  src/
    api/               Comunicacao com a API
    components/        Componentes reutilizaveis
    context/           Contexto de autenticacao
    pages/             Telas do sistema
    styles/            Tokens de estilo
    utils/             Funcoes auxiliares
  index.html
  index.js             Servidor simples para servir o build no deploy
  package.json
  .env.example
```

## Variaveis de ambiente

Crie um arquivo `.env` na raiz do frontend com base no `.env.example`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Para usar a API hospedada:

  ```env
  VITE_API_URL=https://backendhelpapihealth.shardweb.app/api/v1
  ```

Nunca suba o arquivo `.env` para o GitHub.

Observacao importante: como o projeto usa Vite, variaveis `VITE_*` sao aplicadas durante o build. Se mudar `VITE_API_URL` no painel da hospedagem, faca novo build/deploy do frontend.

## Como rodar localmente

Entre na pasta do frontend:

```bash
cd helphealth-web
```

Instale as dependencias:

```bash
npm install
```

Crie o `.env`:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://localhost:5173
```

Para testar login e chamados, a API precisa estar rodando localmente ou hospedada.
Para teste local com cookie de sessao, prefira acessar tudo por `localhost`: frontend em `http://localhost:5173` e API em `http://localhost:8000`. Se misturar `localhost` e `127.0.0.1`, alguns navegadores podem nao enviar o cookie corretamente.

## Build de producao

```bash
npm run build
```

Para executar a verificacao automatica do frontend:

```bash
npm run check
```

Esse comando executa o ESLint e o build do Vite. Ele nao acessa a API nem
altera o banco; para testar login e chamados, use os testes locais da API ou
faça um teste manual com a API local em execucao.

Para servir o build localmente:

```bash
npm run start
```

## Deploy na Shard

Configure no painel:

```env
VITE_API_URL=https://url-da-api.shardweb.app/api/v1
```

Comandos:

```bash
npm install
npm run build
npm run start
```

Se a Shard aceitar um unico comando de inicializacao, use:

```bash
npm run build && npm run start
```

## Cuidados antes de subir para GitHub

Nao envie:

```text
.env
node_modules/
dist/
.cache/
```

Esses arquivos ja estao cobertos pelo `.gitignore`.

## Observacoes para o TCC

O frontend demonstra preocupacao com acessibilidade pratica, responsividade, separacao por perfis e simplicidade para o usuario final. A interface prioriza textos diretos, fluxo simples de abertura de chamado e possibilidade de uso pelo celular, o que e relevante em ambientes de saude publica com funcionarios de diferentes niveis de familiaridade tecnologica.

A tela de relatorios tambem apoia a gestao do suporte ao permitir recortes por periodo e outros filtros, alem de apresentar volume diario, idade da fila, solicitantes recorrentes, chamados sem tecnico e reaberturas. A interface ainda permite gerar uma versao em PDF para registro, apresentacao ou compartilhamento institucional.

As fotos anexadas ajudam o tecnico a entender rapidamente problemas visuais, como tela de erro, falha em impressora, cabo solto, equipamento desligado ou mensagem exibida por sistema interno. A visualizacao ampliada foi pensada para uso tanto no computador quanto no celular.

## Pesquisa e dashboard

A listagem de chamados permite pesquisar por codigo, titulo ou descricao. A
busca e enviada para a API com atraso curto entre as teclas, cancela consultas
anteriores e substitui a pagina exibida, evitando acumulo de resultados no
navegador. A API continua responsavel pelo escopo de acesso e pela paginação.

Administradores podem pesquisar usuarios pelo inicio do nome e filtrar por
papel e situacao (ativo/inativo). A tela exibe apenas uma pagina por vez, com
limite de 20 registros, ordenacao por nome ou data de cadastro e acao para
limpar os filtros.

O dashboard apresenta graficos de rosca para status, prioridade e impacto, com
fatias e legendas selecionaveis por clique ou teclado. O item selecionado
mostra destaque visual, quantidade no centro e um atalho para abrir a lista de
chamados com o filtro correspondente. Setores e categorias aparecem em barras
horizontais clicaveis, mais legiveis quando existem muitos nomes. Os graficos
usam os indicadores fornecidos pela API e se reorganizam em uma coluna em
telas menores.
