#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

PYTHON=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON="python"
else
  echo "Python 3 não foi encontrado."
  echo "Instale Python 3 e execute novamente."
  exit 1
fi

echo "Gamma Exposure · execução local"
echo "1 - Abrir com os dados salvos"
echo "2 - Atualizar dados e abrir"
read -r -p "Escolha 1 ou 2: " OPTION

if [ "$OPTION" = "1" ]; then
  exec "$PYTHON" local_app.py
fi

if [ "$OPTION" = "2" ]; then
  if [ ! -x ".venv-local/bin/python" ]; then
    "$PYTHON" -m venv .venv-local
  fi
  .venv-local/bin/python -m pip install --disable-pip-version-check -r collector/requirements.txt
  exec .venv-local/bin/python local_app.py --update-data
fi

echo "Opção inválida."
exit 1
