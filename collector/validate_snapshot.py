#!/usr/bin/env python3
"""Valida o contrato JSON publicado pelo coletor antes do deploy.

A validação é intencionalmente independente do front-end: ela garante que
latest.json contém um perfil GEX internamente consistente, ordenado e derivável
dos próprios valores publicados.
"""
import argparse
import json
import math
import sys


REQUIRED_TOP = {
    "symbol", "demo", "generated_at", "spot", "net_gex",
    "call_wall", "put_wall", "max_abs_strike", "strikes",
}


def _finite_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_payload(data):
    errors = []

    missing = sorted(REQUIRED_TOP.difference(data))
    if missing:
        errors.append("campos ausentes: " + ", ".join(missing))
        return errors

    if data.get("demo") is True:
        errors.append("latest.json está marcado como demo=true")

    spot = data.get("spot")
    if not _finite_number(spot) or spot <= 0:
        errors.append("spot deve ser numérico e > 0")

    generated_at = str(data.get("generated_at") or "")
    if not generated_at:
        errors.append("generated_at ausente")

    rows = data.get("strikes")
    if not isinstance(rows, list) or not rows:
        errors.append("strikes deve ser uma lista não vazia")
        return errors

    ks = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict):
            errors.append(f"strikes[{i}] não é objeto")
            continue
        for key in ("k", "call", "put", "net"):
            if not _finite_number(row.get(key)):
                errors.append(f"strikes[{i}].{key} deve ser numérico e finito")
        if errors and not all(_finite_number(row.get(k)) for k in ("k", "call", "put", "net")):
            continue

        k = float(row["k"])
        call = float(row["call"])
        put = float(row["put"])
        net = float(row["net"])
        ks.append(k)

        if call < 0:
            errors.append(f"strike {k}: Call GEX negativo")
        if put > 0:
            errors.append(f"strike {k}: Put GEX positivo")
        if abs((call + put) - net) > 1.0:
            errors.append(f"strike {k}: net != call + put")

    if ks:
        if ks != sorted(ks):
            errors.append("strikes não estão em ordem crescente")
        if len(ks) != len(set(ks)):
            errors.append("há strikes duplicados")

    numeric_rows = [
        r for r in rows
        if isinstance(r, dict) and all(_finite_number(r.get(k)) for k in ("k", "call", "put", "net"))
    ]
    if numeric_rows:
        call_wall = max(numeric_rows, key=lambda r: r["call"])["k"]
        put_wall = min(numeric_rows, key=lambda r: r["put"])["k"]
        max_abs = max(numeric_rows, key=lambda r: abs(r["net"]))["k"]
        if float(data.get("call_wall")) != float(call_wall):
            errors.append(f"call_wall inconsistente: publicado={data.get('call_wall')} calculado={call_wall}")
        if float(data.get("put_wall")) != float(put_wall):
            errors.append(f"put_wall inconsistente: publicado={data.get('put_wall')} calculado={put_wall}")
        if float(data.get("max_abs_strike")) != float(max_abs):
            errors.append(
                f"max_abs_strike inconsistente: publicado={data.get('max_abs_strike')} calculado={max_abs}"
            )

        rounded_sum = sum(float(r["net"]) for r in numeric_rows)
        published = data.get("net_gex")
        if _finite_number(published):
            # As linhas são arredondadas no JSON; toleramos até 1 dólar por strike.
            tolerance = max(1.0, len(numeric_rows) * 1.0)
            if abs(float(published) - rounded_sum) > tolerance:
                errors.append(
                    f"net_gex inconsistente: publicado={published} soma_strikes={rounded_sum} "
                    f"(tolerância={tolerance})"
                )
        else:
            errors.append("net_gex deve ser numérico e finito")

    quality = data.get("quality")
    if isinstance(quality, dict):
        if int(quality.get("contracts_used") or 0) <= 0:
            errors.append("quality.contracts_used deve ser > 0")
        if int(quality.get("strikes") or 0) <= 0:
            errors.append("quality.strikes deve ser > 0")

    profiles = data.get("expiry_profiles")
    if profiles is not None and not isinstance(profiles, list):
        errors.append("expiry_profiles deve ser lista quando presente")

    return errors


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default="docs/data/latest.json")
    args = ap.parse_args()

    with open(args.path, encoding="utf-8") as f:
        data = json.load(f)

    errors = validate_payload(data)
    if errors:
        print("VALIDAÇÃO FALHOU", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(
        "OK: latest.json consistente — "
        f"{len(data['strikes'])} strikes, spot={data['spot']}, "
        f"Call Wall={data['call_wall']}, Put Wall={data['put_wall']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
