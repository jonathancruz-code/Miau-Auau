# Miau & Auau — Sistema Interno de Banho e Tosa

Sistema web full-stack para cadastro de tutores e pets e controle de entrada e saída de animais em pet shops de banho e tosa.

---

## O que tem dentro deste projeto

- **Frontend (`src/` e `index.html`)**: interface web responsiva em React + TypeScript + Tailwind CSS com todas as 9 telas do sistema.
- **Backend (`server.ts` e `server/db.ts`)**: servidor web em Node.js + Express com API REST (`/api/*`), autenticação por sessão com cookie `HttpOnly` e regras de negócio e perfil (`gerente` e `funcionario`).
- **Banco de Dados (`data/miau-auau.db`)**: banco relacional SQLite já preenchido com os dados iniciais de teste (usuários, serviços, tutores, pets, pessoas autorizadas, atendimentos e agendamentos).

---

## O que você precisa ter baixado no computador (Windows)

Para rodar este projeto no seu computador, você precisa apenas de **2 programas gratuitos** (ou 3, se quiser baixar do GitHub usando comando `git`):

1. **Visual Studio Code (VS Code)**
   - Download oficial: https://code.visualstudio.com/
   - Instale clicando em **Avançar** até concluir.

2. **Node.js versão 22 LTS ou superior (OBRIGATÓRIO ser 22+)**
   - Download oficial: https://nodejs.org/
   - Baixe a versão **LTS** (`v22.x` ou maior).
   - **Por que precisa ser 22+?** Porque o banco de dados **SQLite** já vem embutido nativamente dentro do Node.js 22+ (junto com o comando `npm`).
   - *Atenção:* se o VS Code já estava aberto quando você instalou o Node.js, **feche o VS Code e abra de novo** para ele reconhecer o comando `node`.

3. **Git** *(opcional — só se quiser clonar pelo terminal; você também pode baixar pelo botão verde `<> Code > Download ZIP` no GitHub)*
   - Download oficial: https://git-scm.com/

### O que você NÃO precisa baixar
- **Não** precisa instalar MySQL, PostgreSQL, SQL Server, XAMPP ou WAMP.
- **Não** precisa instalar Python.
- **Não** precisa configurar nenhuma chave de API.

### Extensão recomendada no VS Code *(opcional)*
- Para visualizar as tabelas do arquivo `data/miau-auau.db` dentro do próprio VS Code, abra a aba **Extensões** (ícone de 4 quadradinhos na esquerda), procure por **SQLite Viewer** (de Florian Klampfer) e clique em **Install**. Depois basta clicar no arquivo `data/miau-auau.db`.

---

## Como baixar o projeto do GitHub para o seu computador

Escolha **uma** das duas formas abaixo:

### Forma 1 — Sem usar comandos (Download ZIP direto do GitHub)
1. Abra a página do seu repositório no GitHub.
2. Clique no botão verde **`<> Code`** e depois em **`Download ZIP`**.
3. Vá na pasta **Downloads** do Windows, clique com o botão direito no `.zip` e escolha **Extrair Tudo...** (extraia para Documentos ou Área de Trabalho).

### Forma 2 — Usando Git no terminal
1. No GitHub, clique no botão verde **`<> Code`** e copie o link HTTPS do repositório.
2. Abra o terminal do Windows (ou do VS Code) na pasta onde quer salvar e rode:
   ```bash
   git clone LINK_DO_SEU_REPOSITORIO
   ```

---

## Passo a passo para rodar o sistema no VS Code

### 1. Abrir a pasta do projeto no VS Code
1. Abra o **VS Code**.
2. No menu superior, clique em **Arquivo > Abrir Pasta...** (*File > Open Folder...*).
3. Selecione a pasta do projeto (confira na barra lateral se arquivos como `package.json`, `server.ts` e as pastas `src`, `server` e `data` aparecem logo de cara).
4. Se aparecer o aviso *"Você confia nos autores dos arquivos?"*, clique em **Sim, confio nos autores**.

### 2. Abrir o terminal integrado do VS Code
1. No menu superior do VS Code, clique em **Terminal > Novo Terminal** (ou aperte **`Ctrl + '`**).
2. Uma janela de comandos será aberta na parte inferior da tela.

> **Dica importante para Windows (PowerShell):**
> Se ao digitar `npm` aparecer um erro vermelho dizendo que *"a execução de scripts foi desabilitada neste sistema"*, clique na **setinha para baixo** ao lado do sinal **`+`** no canto direito do terminal, escolha **Command Prompt** (Prompt de Comando) e feche a aba do PowerShell.

### 3. Conferir se o Node.js 22+ está instalado
No terminal do VS Code, digite e aperte **Enter**:
```bash
node -v
```
Deve aparecer algo como `v22.x.x` (ou versão superior).

### 4. Instalar as dependências do projeto (somente na primeira vez)
No mesmo terminal, digite e aperte **Enter**:
```bash
npm install
```
Aguarde alguns segundos enquanto ele baixa os pacotes (`express`, `react`, `vite`, `tailwindcss`, `lucide-react`, `typescript`, `tsx`) e cria a pasta `node_modules`.

### 5. Ligar o servidor web (Backend + Frontend + Banco)
O arquivo `server.ts` já é o servidor web Express pronto. Para iniciá-lo, digite no terminal e aperte **Enter**:
```bash
npm run dev
```
Quando aparecer a mensagem:
```text
Miau & Auau server running on http://0.0.0.0:3000
```
o servidor web local está ligado, conectado ao banco `data/miau-auau.db` e entregando a interface na porta `3000`. **Mantenha esse terminal aberto enquanto estiver usando o sistema.**

### 6. Abrir no navegador
Abra o Google Chrome, Microsoft Edge ou outro navegador e acesse:
```text
http://localhost:3000
```

---

## Contas iniciais para testar

O banco já vem preenchido com os usuários abaixo:

| Perfil | E-mail | Senha | Acesso |
| :--- | :--- | :--- | :--- |
| **Gerente** | `carla@petshop.com` | `gerente123` | Todas as telas, incluindo **Administração** |
| **Funcionário** | `pedro@petshop.com` | `func123` | Início, Pets, Cadastro, Novo atendimento, Retirada e Agenda |
| **Funcionário** | `livia@petshop.com` | `func123` | Início, Pets, Cadastro, Novo atendimento, Retirada e Agenda |

Tudo o que você cadastrar, editar ou finalizar é salvo de forma persistente no arquivo `data/miau-auau.db`.

---

## Como desligar e ligar novamente outro dia

- **Para desligar o servidor:** clique no terminal do VS Code e aperte **`Ctrl + C`** (se perguntar `S/N`, digite `S` e aperte **Enter**).
- **Para ligar novamente outro dia:**
  1. Abra a pasta do projeto no VS Code.
  2. Abra o terminal (**`Ctrl + '`**).
  3. Rode apenas:
     ```bash
     npm run dev
     ```
  4. Acesse `http://localhost:3000`. *(Não precisa rodar `npm install` de novo.)*

---

## Modo Produção *(opcional)*

Se quiser compilar a versão final otimizada do frontend e rodar o servidor diretamente com o Node:

```bash
npm run build
```

E depois iniciar o servidor em modo produção:
- **No Command Prompt (CMD) do Windows:**
  ```cmd
  set NODE_ENV=production && node server.ts
  ```
- **No PowerShell do Windows:**
  ```powershell
  $env:NODE_ENV="production"; node server.ts
  ```
- **No Linux / macOS:**
  ```bash
  NODE_ENV=production node server.ts
  ```
