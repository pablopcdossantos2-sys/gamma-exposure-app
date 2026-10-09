# Tutorial — Executar o Gamma Exposure localmente no Windows

Este tutorial foi escrito para pessoas que **não têm familiaridade com terminal, GitHub, Python ou compilação**.

A boa notícia é que o Gamma Exposure **não precisa ser compilado** para funcionar localmente. A interface é feita em HTML, CSS e JavaScript. O pequeno programa Python incluído no projeto apenas cria um servidor no seu próprio computador para que o navegador consiga carregar os arquivos corretamente.

---

## 1. O que significa “executar localmente”?

Significa abrir o Gamma Exposure usando os arquivos que estão no seu computador, em vez de depender da GitHub Page.

Quando o programa estiver aberto, o endereço será parecido com:

```text
http://127.0.0.1:8000
```

Esse endereço aponta para **o seu próprio computador**. Ele não publica o sistema na internet.

Você deve manter a janela preta do programa aberta enquanto estiver usando o dashboard.

---

## 2. O que você precisa?

Para o modo mais simples:

- Windows 10 ou Windows 11;
- Python 3 instalado;
- a pasta do projeto extraída no computador;
- um navegador como Edge, Chrome ou Firefox.

Para **atualizar os dados** antes de abrir, também será necessária conexão com a internet.

---

## 3. Baixar o projeto sem usar Git

Este é o método recomendado para usuários iniciantes.

1. Abra o repositório do Gamma Exposure no GitHub.
2. Clique no botão **Code**.
3. Clique em **Download ZIP**.
4. Aguarde o download.
5. No Explorador de Arquivos, localize o arquivo ZIP.
6. Clique com o botão direito nele.
7. Escolha **Extrair Tudo...**.
8. Escolha uma pasta de fácil acesso, por exemplo:

```text
C:\Users\SEU_USUARIO\Documents\Gamma-Exposure
```

9. Entre na pasta extraída.

**Importante:** não execute o sistema de dentro do arquivo ZIP. Extraia os arquivos primeiro.

---

## 4. Verificar se o Python já está instalado

Abra o **PowerShell**:

1. pressione a tecla Windows;
2. digite `PowerShell`;
3. abra **Windows PowerShell** ou **Terminal**.

Digite:

```powershell
python --version
```

Se aparecer algo semelhante a:

```text
Python 3.12.10
```

ou outra versão Python 3 recente, pode seguir para a seção 6.

Se aparecer uma mensagem dizendo que `python` não foi encontrado, faça a instalação da seção seguinte.

---

## 5. Instalar o Python pelo WinGet

No PowerShell, execute:

```powershell
winget install -e --id Python.Python.3.12
```

Aceite os termos caso o Windows solicite confirmação.

Quando a instalação terminar:

1. feche o PowerShell;
2. abra-o novamente;
3. execute:

```powershell
python --version
```

Se o comando `python` ainda não funcionar, teste:

```powershell
py -3 --version
```

O arquivo de inicialização do projeto aceita automaticamente tanto `python` quanto `py -3`.

---

## 6. Método mais fácil: duplo clique

Na pasta do projeto, localize:

```text
Executar-Gamma-Exposure.bat
```

Dê **duplo clique** nele.

Será exibido um menu:

```text
1 - Abrir com os dados já salvos
2 - Atualizar dados gratuitos e depois abrir
3 - Sair
```

### Opção 1 — Abrir com os dados já salvos

Escolha `1` e pressione Enter.

Esse modo:

- inicia mais rápido;
- não precisa instalar as bibliotecas de coleta;
- usa os arquivos JSON que já vieram no projeto;
- é útil para estudar o sistema mesmo sem atualizar a cadeia de opções.

O navegador deverá abrir automaticamente.

### Opção 2 — Atualizar dados e depois abrir

Escolha `2` e pressione Enter.

Na primeira execução, o programa criará uma pasta chamada:

```text
.venv-local
```

Ela é um **ambiente Python isolado** usado somente pelo Gamma Exposure.

Depois, o programa instala automaticamente as duas bibliotecas necessárias à coleta e tenta atualizar:

- Gamma Exposure do EWZ via CBOE;
- candles de EWZ;
- candles de WIN1!.

Quando terminar, o navegador será aberto.

Nas próximas execuções, a preparação será muito mais rápida porque o ambiente já existirá.

---

## 7. O navegador não abriu automaticamente

Olhe a janela do programa.

Ela mostrará algo semelhante a:

```text
Endereço : http://127.0.0.1:8000/
```

Copie esse endereço e cole manualmente na barra do navegador.

Se a porta 8000 já estiver sendo usada por outro programa, o Gamma Exposure procurará automaticamente outra porta, como:

```text
http://127.0.0.1:8001/
```

Use exatamente o endereço mostrado na janela.

---

## 8. Como encerrar corretamente

Não feche apenas a aba do navegador.

Na janela onde aparece o servidor local:

1. pressione `Ctrl + C`;
2. aguarde a mensagem de encerramento.

Também é possível fechar a janela do terminal, mas `Ctrl + C` é a forma recomendada.

Depois que o servidor for encerrado, o endereço `127.0.0.1` deixará de funcionar até você iniciar o programa novamente.

---

## 9. O Windows mostrou um aviso de segurança

Dependendo da configuração do Windows, pode aparecer uma tela do Microsoft Defender SmartScreen porque o arquivo `.bat` foi baixado da internet.

Confira se o arquivo veio do repositório oficial do projeto.

Se estiver seguro de que baixou o repositório correto, use as opções do próprio Windows para permitir a execução.

O projeto não precisa abrir uma porta pública: por padrão o servidor usa apenas:

```text
127.0.0.1
```

Esse endereço aceita conexões apenas do próprio computador.

---

## 10. A atualização dos dados falhou

Isso pode acontecer por:

- falta de internet;
- indisponibilidade temporária do CBOE;
- mudança no feed público usado para os candles;
- bloqueio de rede/firewall;
- bibliotecas Python ainda não instaladas.

Mesmo que a atualização falhe, o sistema pode continuar sendo aberto com os últimos arquivos salvos no projeto.

Tente novamente mais tarde ou use a **Opção 1**.

---

## 11. Erro “Python não foi encontrado”

Volte às seções 4 e 5.

No PowerShell, confirme um destes comandos:

```powershell
python --version
```

ou:

```powershell
py -3 --version
```

Se ambos falharem, reinstale Python pelo WinGet.

---

## 12. Erro ao criar `.venv-local`

Verifique se:

- Python está instalado;
- a pasta do projeto não está em uma localização protegida do Windows;
- você possui permissão de escrita na pasta.

Uma localização simples costuma funcionar bem:

```text
C:\Users\SEU_USUARIO\Documents\Gamma-Exposure
```

Você pode apagar a pasta `.venv-local` e escolher novamente a opção 2. Ela será recriada automaticamente.

---

## 13. Preciso usar o terminal toda vez?

**Não.**

No Windows, depois que o Python estiver instalado, o uso normal pode ser feito com duplo clique em:

```text
Executar-Gamma-Exposure.bat
```

O terminal aparecerá porque o servidor precisa permanecer em execução, mas você não precisa digitar comandos nele.

---

## 14. Preciso instalar Node.js ou npm?

**Não.**

A versão atual do Gamma Exposure não depende de Node.js, npm, Vite, React ou outro processo de compilação frontend.

O navegador executa diretamente HTML/CSS/JavaScript e o Python fornece o servidor local e, quando solicitado, os coletores.

---

## 15. Execução manual — somente para usuários que quiserem

Se quiser iniciar diretamente pelo PowerShell, entre na pasta do projeto:

```powershell
cd "C:\caminho\para\gamma-exposure-app"
```

Para abrir com os dados já salvos:

```powershell
python local_app.py
```

Para atualizar os dados e abrir, depois de instalar as dependências:

```powershell
python -m pip install -r collector\requirements.txt
python local_app.py --update-data
```

Para não abrir o navegador automaticamente:

```powershell
python local_app.py --no-browser
```

---

## 16. Atualizar o projeto no futuro

### Método simples — baixar um novo ZIP

Quando houver uma nova versão:

1. baixe novamente **Code → Download ZIP**;
2. extraia em uma nova pasta;
3. execute `Executar-Gamma-Exposure.bat`.

Esse é o método mais fácil para quem não usa Git.

### Método com Git — opcional

Se você já utiliza Git, dentro da pasta clonada execute:

```powershell
git pull origin main
```

Depois execute normalmente o arquivo `.bat`.

---

## 17. Resumo para quem quer apenas usar

Na primeira vez:

1. instale Python;
2. baixe o ZIP;
3. extraia a pasta;
4. dê duplo clique em `Executar-Gamma-Exposure.bat`;
5. escolha `1` para abrir imediatamente ou `2` para atualizar os dados;
6. use o dashboard no navegador;
7. pressione `Ctrl + C` quando terminar.

Depois da primeira configuração, normalmente basta repetir os passos 4 a 7.

---

## 18. Observação sobre os dados

A execução local não transforma as fontes públicas em feeds profissionais ou real-time.

Continuam válidas as mesmas limitações da versão online:

- a cadeia pública do CBOE pode ser delayed;
- o feed público usado para candles pode apresentar atraso ou indisponibilidade;
- GEX é um modelo e não revela a carteira real dos dealers;
- a projeção EWZ → WIN é uma referência, não equivalência econômica perfeita.

O fato de o sistema estar rodando no seu computador muda **onde a interface é servida**, mas não muda as características das fontes de mercado.
