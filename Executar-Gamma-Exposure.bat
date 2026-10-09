@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Gamma Exposure - Execucao Local

echo.
echo ============================================================
echo  Gamma Exposure - EWZ para WIN
echo  Execucao local para Windows
echo ============================================================
echo.
echo  1 - Abrir com os dados ja salvos
echo      (mais rapido; nao precisa instalar bibliotecas extras)
echo.
echo  2 - Atualizar dados gratuitos e depois abrir
echo      (precisa de internet; na primeira vez prepara o ambiente)
echo.
echo  3 - Sair
echo.
set /p OPCAO=Escolha 1, 2 ou 3 e pressione Enter: 

if "%OPCAO%"=="1" goto ABRIR
if "%OPCAO%"=="2" goto ATUALIZAR
if "%OPCAO%"=="3" goto FIM

echo.
echo Opcao invalida.
pause
goto FIM

:LOCALIZAR_PYTHON
where py >nul 2>nul
if %errorlevel%==0 (
    set "PY_CMD=py -3"
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    set "PY_CMD=python"
    goto :eof
)
echo.
echo [ERRO] Python nao foi encontrado neste computador.
echo.
echo Consulte o arquivo:
echo   Tutorial-Execucao-Local-Windows.md
echo.
echo O tutorial explica como instalar o Python pelo WinGet.
echo.
pause
exit /b 1

:ABRIR
call :LOCALIZAR_PYTHON
if errorlevel 1 goto FIM
echo.
echo Abrindo o sistema localmente...
%PY_CMD% local_app.py
goto FIM

:ATUALIZAR
call :LOCALIZAR_PYTHON
if errorlevel 1 goto FIM

if not exist ".venv-local\Scripts\python.exe" (
    echo.
    echo Primeira configuracao: criando ambiente Python isolado...
    %PY_CMD% -m venv .venv-local
    if errorlevel 1 (
        echo.
        echo [ERRO] Nao foi possivel criar o ambiente local.
        echo Consulte Tutorial-Execucao-Local-Windows.md
        pause
        goto FIM
    )
)

echo.
echo Verificando as bibliotecas necessarias para atualizar os dados...
".venv-local\Scripts\python.exe" -m pip install --disable-pip-version-check -r collector\requirements.txt
if errorlevel 1 (
    echo.
    echo [AVISO] Nao foi possivel instalar/atualizar as bibliotecas.
    echo Verifique sua conexao com a internet.
    echo.
    echo O dashboard ainda pode ser aberto com os dados ja salvos.
    pause
    goto ABRIR
)

echo.
echo Atualizando dados e iniciando o dashboard...
".venv-local\Scripts\python.exe" local_app.py --update-data
goto FIM

:FIM
endlocal
