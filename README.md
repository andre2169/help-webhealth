# HelpWeb Health Web

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
- Sidebar com navegacao por perfil.
- Tela de inicio autenticada com atalhos, chamados recentes e orientacoes de uso seguro.
- Logo, item Inicio e area do usuario com navegacao direta para inicio/perfil.
- Perfil com telefone, funcao, setor, unidade e preferencia de notificacao.
- Alteracao de email e senha em duas etapas, com codigo de verificacao gerado pela API.
- Recuperacao de conta pela tela de login, com codigo enviado ao email cadastrado.
- Links de login, cadastro e recuperacao separados para evitar confusao em telas pequenas.
- Abertura de chamados com setor, categoria, equipamento, patrimonio, impacto e ate 3 fotos opcionais.
- Fotos tiradas pelo celular sao compactadas antes do envio para reduzir erros de tamanho no deploy com SQLite.
- Lista de chamados com filtros.
- Detalhe do chamado com comentarios, timeline e status.
- Foto de perfil do usuario.
- Dashboard e relatorios apenas para tecnicos e administradores.
- Relatorios com filtros por periodo, status, prioridade, impacto, setor e categoria.
- Indicadores de volume diario, idade da fila ativa, chamados sem tecnico, reaberturas e solicitantes recorrentes.
- Geracao de relatorio em PDF pelo recurso de impressao do navegador, com folha centralizada e campos ajustaveis.
- Visualizacao ampliada das fotos anexadas ao chamado, com navegacao entre imagens e controle de zoom.
- Ajustes responsivos para telas intermediarias, tablets e celulares, evitando que cards, tickets e textos longos ultrapassem os blocos.
- Controle de redirecionamento por perfil.
- Logout chama a API para revogar o token atual e remove o token local.
- Formatacao de data/hora no fuso `America/Sao_Paulo`.
- Em 19/07/2026, as dependencias de producao foram verificadas com `npm audit --omit=dev`, sem vulnerabilidades conhecidas no resultado.

## Comunicacao com backend

O frontend nao acessa o banco de dados diretamente. Toda leitura ou alteracao passa pela API configurada em `VITE_API_URL`.

O arquivo responsavel por centralizar essas chamadas e:

```text
src/api/api.js
```

Isso mantem o SQLite e as regras de negocio protegidos no backend. O navegador recebe apenas as respostas permitidas pelos endpoints da API.

Nao existe conexao do frontend com SQLite, arquivo `.db`, SQLAlchemy ou qualquer credencial de banco. O fluxo correto e sempre:

```text
Navegador -> Frontend React -> API FastAPI -> SQLAlchemy ORM -> Banco SQLite
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
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

Para usar a API hospedada:

```env
VITE_API_URL=https://sua-api.shardweb.app/api/v1
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
VITE_API_URL=http://127.0.0.1:8000/api/v1
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

## Build de producao

```bash
npm run build
```

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
