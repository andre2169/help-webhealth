# HELP WEB HEALTH Web

Codigo-fonte, testes e configuracao local da interface. Requer Node.js 22.12 ou
superior e a API do projeto. Nao depende de um provedor de hospedagem. Os ZIPs
da Shard sao pacotes separados; `.env` real, dependencias instaladas, dados
locais e resultados dos testes nao devem ser enviados ao GitHub.

Frontend do **HelpWeb Health**, desenvolvido com React e Vite. A interface foi pensada para uso em computadores e celulares, considerando funcionarios de instituicoes de saude publica que podem ter pouca familiaridade com tecnologia.

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
- Rolagem das páginas por teclado com setas, PageUp, PageDown, Home e End.
- Sidebar com navegacao por perfil.
- Icones lineares Lucide na sidebar, com cores herdadas dos temas claro e escuro.
- Tela de inicio autenticada com atalhos, chamados recentes e orientacoes de uso seguro.
- Inicio adaptado ao perfil: solicitacoes pessoais para usuarios, atendimento
  para tecnicos e visao da operacao para administradores. Sem o indicador Perfil OK.
- No celular, a navegacao fica em uma unica faixa horizontal rolavel, com
  nomes completos, tanto no navegador quanto no PWA. A area de seguranca do
  iPhone continua reservada; o atalho Inicio tem tamanho fixo e icone linear.
- Cancelamento do proprio chamado somente antes do primeiro atendimento,
  confirmado pelo usuario e validado pela API. Cancelados ficam no filtro
  Excluidos e cancelados, fora dos indicadores; so o administrador recupera.
- Somente administradores podem excluir ou reabrir chamados ja assumidos.
- A lista explica o filtro em uso e diferencia falta de resultados de erro
  de comunicacao. Todos os status inclui resolvidos e fechados.
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
- Detalhe do chamado com comentarios, timeline e status.
- Foto de perfil do usuario.
- Notificacoes internas por perfil: tecnicos recebem novos chamados e atualizacoes dos chamados vinculados; usuarios recebem apenas atualizacoes dos proprios chamados; administradores consultam os eventos pela area administrativa.
- Polling de notificacoes limitado e pausado quando a aba fica em segundo plano, reduzindo carga desnecessaria na API.
- Consultas GET recentes sao deduplicadas por poucos segundos na memoria da aba, evitando chamadas repetidas quando a tela recarrega dados muito rapido.
- Dashboard e relatorios apenas para tecnicos e administradores; administradores veem a operacao global e tecnicos veem somente os proprios atendimentos, com a fila sem responsavel em area separada.
- Relatorios com filtros por periodo, status, prioridade, impacto, setor e categoria.
- Distribuicoes resumidas em seis itens mais Outros, sem perder os totais.
- Evolucao do periodo completo em ate oito intervalos, agrupados automaticamente.
- Atendimento por tecnico com busca e paginacao, sem administradores nessa tabela.
- Indicadores de volume diario, idade da fila ativa, chamados sem tecnico, reaberturas e solicitantes recorrentes.
- Relatorio gerencial com download de PDF real gerado pela API, em formato A4 e com layout proprio de documento administrativo.
- Visualizacao ampliada das fotos anexadas ao chamado, com navegacao entre imagens e controle de zoom.
- Ajustes responsivos para telas intermediarias, tablets e celulares, evitando que cards, tickets e textos longos ultrapassem os blocos.
- Controle de redirecionamento por perfil.
- Setor e categoria de novos chamados usam seletores do catalogo oficial da API.
  Somente administradores podem adicionar, editar, excluir quando nao utilizado,
  desativar ou reativar essas opcoes em **Setores e categorias**. As acoes ficam
  no menu de tres pontos; editar e excluir usam dialogos com confirmacao.
  Equipamento continua aceitando texto e sugestoes.
- Os indicadores de apoio dos relatorios usam quatro areas separadas com
  cabecalhos destacados e rolagem interna. A impressao remove a restricao de
  altura para nao cortar dados. Titulos de indicadores seguem a mesma
  hierarquia visual no inicio, dashboard, chamados e relatorios.
- Filtros de chamados, relatorios e selecao de setores dos avisos usam o mesmo
  catalogo, evitando listas fixas divergentes entre telas.
- Avisos operacionais usam o menu de tres pontos para editar, excluir,
  ativar ou desativar. A exclusao exige confirmacao; falhas de edicao mantem
  o formulario aberto. Avisos vencidos precisam de um novo prazo para ativacao.
- O publico dos avisos pode ser usuarios e tecnicos, somente usuarios ou
  somente tecnicos, combinado com os setores selecionados. Administradores
  continuam gerenciando todos os avisos.
- A faixa no topo identifica o nivel do aviso e oferece Marcar como lido.
  A leitura e salva pela API para a conta, nao em armazenamento local do
  navegador, e continua valida apos navegacao, recarga ou uso de outro dispositivo.
  Alteracoes relevantes geram nova versao para leitura; salvar sem mudar os
  dados ou apenas desativar/reativar nao faz o mesmo aviso reaparecer.
  Falhas ao salvar a leitura mantem o aviso visivel e permitem tentar novamente.
- A data e hora de encerramento dos avisos sao selecionadas em um dialogo
  com Confirmar, Cancelar e Limpar. Apenas a confirmacao atualiza o campo;
  publicar ou salvar o aviso continua sendo uma acao separada.
- Login usa cookie HttpOnly emitido pela API; o JavaScript do frontend nao le o JWT.
- Requisicoes autenticadas de alteracao enviam automaticamente o token CSRF recebido em cookie separado; o JWT nunca fica em `localStorage` ou `sessionStorage`.
- Logout chama a API para revogar o token atual e limpar o cookie da sessao.
- Chaves antigas de token em `localStorage`/`sessionStorage` sao removidas ao carregar a aplicacao.
- Servidor estatico de producao inclui headers de seguranca como CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS e Permissions-Policy.
- Servidor estatico aceita apenas `GET` e `HEAD`, limita tamanho de URL/headers e aplica cache longo nos assets gerados pelo build.
- Formatacao de data/hora no fuso `America/Sao_Paulo`.
- O repositorio inclui workflow de GitHub Actions para lint, testes, build e
  `npm audit`, incluindo dependencias de desenvolvimento. Uma auditoria sem
  alertas nao garante ausencia de vulnerabilidades futuras.

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
  VITE_API_URL=https://api.example.com/api/v1
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
npm ci
```

Crie o `.env` apenas se ainda nao existir, preservando sua configuracao local:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

O exemplo aponta para:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Execute o servidor de desenvolvimento:

```bash
npm run dev
```

O servidor usa sempre `localhost:5173`. Se essa porta estiver ocupada, ele
encerra com uma mensagem clara em vez de mudar automaticamente para outra
porta que nao esteja autorizada pela API. Encerre a instancia anterior antes
de iniciar outra pelo terminal do VS Code.

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

Esse comando executa ESLint, testes unitarios e build do Vite. Ele nao acessa a API nem
altera o banco; para testar login e chamados, use os testes locais da API ou
faça um teste manual com a API local em execucao.

Para servir o build localmente:

```bash
npm run start
```

## PWA instalavel

O frontend tambem pode ser instalado como atalho no celular ou no desktop sem
virar um aplicativo nativo. O build publica o manifesto, os icones e o
service worker automaticamente.

- Android, Chrome, Edge e navegadores compativeis exibem a opcao de instalar
  quando os criterios do navegador forem atendidos.
- No iPhone e iPad, abra o sistema pelo Safari e use Compartilhar > Adicionar a
  Tela de Inicio > Abrir como App.
- O service worker armazena somente arquivos estaticos do frontend. Chamados,
  sessoes, notificacoes e respostas da API nao entram no cache.
- Para validar a instalacao, use `npm run build` e depois `npm run start`. O
  PWA exige HTTPS em ambiente publicado; `localhost` e aceito para testes.

### Verificacao de regressao e seguranca

`npm run check` executa lint, testes de regras de negocio, servidor HTTP,
cache do service worker e build. `npm audit` consulta vulnerabilidades
conhecidas nas dependencias, incluindo ferramentas de desenvolvimento.

`npm run test:ui` executa os cenarios de navegador de
`tests/browser/regression.cjs`, com API simulada e sem alterar o banco local.
Playwright e instalado como dependencia de desenvolvimento por `npm ci`.
O navegador padrao e Edge; `UI_TEST_BROWSER=chrome` seleciona Chrome.
Tambem aceita `PLAYWRIGHT_MODULE` apontando para uma instalacao existente.
Com o frontend local em execucao, usa `http://localhost:5173`. Para testar
o build sem outro servidor nessa porta, defina `UI_TEST_SERVE_DIST` para
o caminho absoluto de `dist`. Esse servidor de teste fecha ao terminar.
Resultados visuais ficam em `test-results/ui`, fora dos ZIPs de deploy.
Os cenarios incluem o cabecalho do chamado, espacamento do contador,
limite/envio de comentarios e modo somente leitura dos chamados arquivados,
em quatro larguras e nos dois temas. `UI_TEST_DETAIL_ONLY=1` executa apenas
esse recorte de interface; as requisicoes usam dados simulados.
O filtro atual aparece ao lado do titulo da area de filtros, inclusive quando
recolhida, sem um indicador separado entre as metricas. Os testes tambem
cobrem tablets em retrato/paisagem, navegador e PWA emulado, os tres perfis,
os dois temas, troca de status, limpeza e persistencia apos recarregar.
`npm run test:pwa` testa ativacao, exclusao de dados da API e shell offline
com service worker real no navegador e build servido na porta 5173.
Feche outro frontend nessa porta antes desta verificacao isolada.

Com a API e o frontend clonados em pastas irmas, o roteiro da API
`tools/local_full_check.ps1 -IncludeBrowserTests` executa tambem essas
verificacoes e fecha seus servidores de teste ao terminar. Sem a opcao, roda
os testes e auditorias comuns. Nao cria dados nem configura servicos remotos.

O cache PWA v4 exclui explicitamente `/api/` e `/health`, armazena apenas
HTML como shell de navegacao e aguarda as gravacoes durante o evento.
Atualizacao de cache nao substitui testes no Safari/iPhone real nem
dispensa HTTPS, cookies seguros e configuracao correta do backend.

## Rodape e contatos de suporte

O rodape compartilhado aparece no login, cadastro e paginas autenticadas.
Os dados publicos ficam em `src/config/siteInfo.js`: desenvolvedor Andre
Vilas Boas, tecnologias React, Vite, FastAPI e Python, telefone e email.

Os contatos iniciais sao ficticios, claramente identificados como demonstracao
e sem links de ligacao ou envio de email. Para publicar contatos reais, altere
`support.phone` e `support.email` e defina `support.demonstration: false`.
Telefones invalidos e emails de dominio reservado continuam sem link.

`updatedAt` fica vazio por padrao. Para mostrar a data de uma versao, preencha
uma data fixa valida no formato `YYYY-MM-DD` e gere um novo build. A data nao
muda ao abrir a pagina e nao representa alteracoes no banco de dados.

## Hospedagem opcional

O mesmo frontend funciona na Shard ou em outro provedor. Configure no
ambiente de build a URL da sua propria API, por exemplo:

```env
VITE_API_URL=https://api.example.com/api/v1
```

Comandos:

```bash
npm ci
npm run build
npm run start
```

Se o provedor aceitar um unico comando de inicializacao, use:

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
