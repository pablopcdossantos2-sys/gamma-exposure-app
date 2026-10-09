#!/usr/bin/env python3
"""Servidor local do Gamma Exposure.

Modo simples:
    python local_app.py

Atualizando dados antes de abrir:
    python local_app.py --update-data

O servidor usa apenas a biblioteca padrão do Python. As dependências em
collector/requirements.txt só são necessárias quando --update-data é usado.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import time
import webbrowser

ROOT = Path(__file__).resolve().parent
DOCS_DIR = ROOT / "docs"
COLLECTOR_DIR = ROOT / "collector"


class LocalHandler(http.server.SimpleHTTPRequestHandler):
    """Serve docs/ e evita cache agressivo dos JSON atualizados."""

    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0]
        if path.startswith("/data/") or path.endswith(".json"):
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        # Log compacto para usuários não técnicos.
        sys.stdout.write("[local] " + (fmt % args) + "\n")


def port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def choose_port(host: str, preferred: int, attempts: int = 20) -> int:
    """Usa a porta solicitada; se ocupada, tenta as seguintes."""
    for port in range(preferred, preferred + attempts):
        if port_is_free(host, port):
            return port
    raise RuntimeError(
        f"Nenhuma porta livre encontrada entre {preferred} e "
        f"{preferred + attempts - 1}."
    )


def run_command(label: str, command: list[str]) -> bool:
    print(f"\n=== {label} ===")
    print("Executando:", " ".join(command))
    result = subprocess.run(command, cwd=ROOT)
    if result.returncode != 0:
        print(f"[AVISO] {label} falhou (código {result.returncode}).")
        return False
    print(f"[OK] {label} concluído.")
    return True


def update_market_data(save_raw: bool = False) -> bool:
    """Atualiza GEX e candles. Se algo falhar, dados anteriores permanecem."""
    collect_cmd = [sys.executable, str(COLLECTOR_DIR / "collect.py")]
    if save_raw:
        collect_cmd.append("--save-raw")

    gex_ok = run_command("Atualizar Gamma Exposure do EWZ", collect_cmd)
    prices_ok = run_command(
        "Atualizar candles de EWZ e WIN",
        [sys.executable, str(COLLECTOR_DIR / "collect_prices.py")],
    )

    if not gex_ok or not prices_ok:
        print(
            "\n[AVISO] Uma das atualizações falhou. "
            "O dashboard ainda pode abrir usando os últimos dados salvos."
        )
    return gex_ok and prices_ok


def open_browser_later(url: str) -> None:
    def _open() -> None:
        time.sleep(0.8)
        try:
            webbrowser.open(url, new=2)
        except Exception as exc:  # pragma: no cover - depende do SO
            print(f"[AVISO] Não consegui abrir o navegador automaticamente: {exc}")
            print(f"Abra manualmente: {url}")

    threading.Thread(target=_open, daemon=True).start()


def build_server(host: str, port: int) -> http.server.ThreadingHTTPServer:
    if not DOCS_DIR.exists():
        raise FileNotFoundError(f"Pasta docs não encontrada: {DOCS_DIR}")
    handler = functools.partial(LocalHandler, directory=str(DOCS_DIR))
    return http.server.ThreadingHTTPServer((host, port), handler)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Executa o Gamma Exposure localmente no navegador."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--update-data",
        action="store_true",
        help="Atualiza CBOE/TradingView antes de abrir.",
    )
    parser.add_argument(
        "--save-raw",
        action="store_true",
        help="Ao atualizar, também guarda a resposta raw do CBOE.",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Não abre o navegador automaticamente.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.update_data:
        try:
            update_market_data(save_raw=args.save_raw)
        except ModuleNotFoundError as exc:
            print("\n[ERRO] Falta uma dependência Python:", exc)
            print(
                "Use o arquivo Executar-Gamma-Exposure.bat e escolha a opção "
                "'Atualizar dados e abrir'. Ele instala as dependências automaticamente."
            )

    try:
        port = choose_port(args.host, args.port)
        server = build_server(args.host, port)
    except Exception as exc:
        print(f"\n[ERRO] Não foi possível iniciar o servidor local: {exc}")
        return 1

    url = f"http://{args.host}:{port}/"
    print("\n" + "=" * 68)
    print(" Gamma Exposure · execução local")
    print("=" * 68)
    print(f" Pasta servida : {DOCS_DIR}")
    print(f" Endereço      : {url}")
    if port != args.port:
        print(
            f" Observação    : a porta {args.port} estava ocupada; "
            f"foi usada a porta {port}."
        )
    print("\nPara encerrar: pressione Ctrl+C nesta janela.")
    print("Enquanto esta janela estiver aberta, o dashboard continuará disponível.")
    print("=" * 68 + "\n")

    if not args.no_browser:
        open_browser_later(url)

    try:
        server.serve_forever(poll_interval=0.3)
    except KeyboardInterrupt:
        print("\nEncerrando o servidor local...")
    finally:
        server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
