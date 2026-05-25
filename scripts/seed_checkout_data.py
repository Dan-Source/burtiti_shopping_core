#!/usr/bin/env python
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import django


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera dados reutilizaveis para testar catalogo e checkout."
    )
    parser.add_argument(
        "--users",
        type=int,
        default=3,
        help="Quantidade de usuarios de teste com endereco padrao.",
    )
    parser.add_argument(
        "--password",
        default="Teste@123",
        help="Senha definida para todos os usuarios de teste.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
    django.setup()

    from core.seed_checkout_data import seed_checkout_data

    result = seed_checkout_data(user_count=args.users, password=args.password)

    print("Dados de checkout prontos.")
    print(
        f"- Parceiro: {result['partner']['code']}"
        f" | Produtos preparados: {len(result['products'])}"
        f" | Usuarios preparados: {len(result['users'])}"
    )
    print("- Produtos:")
    for product in result["products"]:
        print(
            f"  * {product['title']} [{product['type']}]"
            f" - {product['category']} - slug: {product['slug']}"
        )

    print("- Usuarios:")
    for user in result["users"]:
        print(
            f"  * {user['username']} | {user['email']} | senha: {user['password']}"
        )

    print("- Pais de entrega habilitado: BR")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
