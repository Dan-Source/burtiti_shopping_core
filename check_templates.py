#!/usr/bin/env python
"""
Template Precedence Checker for Django Oscar
Verifies that custom templates are loaded from the correct location
and have proper namespace organization.

Usage: uv run python check_templates.py
"""

import os
import sys
from pathlib import Path

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django

django.setup()

from django.conf import settings
from django.template.loader import get_template

# Define templates that should be loaded from root templates/ (not oscar/)
STRUCTURAL_TEMPLATES = [
    "base.html",
    "layout.html",
    "layout_2_col.html",
    "layout_3_col.html",
]

# Define templates that should be loaded from templates/oscar/ (module-specific)
OSCAR_NAMESPACE_TEMPLATES = [
    "oscar/layout.html",
    "oscar/checkout/layout.html",
    "oscar/checkout/checkout.html",
    "oscar/catalogue/browse.html",
    "oscar/catalogue/detail.html",
    "oscar/catalogue/category.html",
    "oscar/basket/basket.html",
    "oscar/partials/nav_primary.html",
    "oscar/partials/mini_basket.html",
    "oscar/partials/nav_accounts.html",
    "oscar/partials/nav_primary_logo_menu.html",
    "oscar/partials/nav_primary_search_group.html",
    "oscar/partials/nav_primary_cart_button.html",
    "oscar/customer/login_registration.html",
]

BASE_DIR = Path(settings.BASE_DIR)
TEMPLATES_DIR = BASE_DIR / "templates"


def check_template(name, should_be_in_root=True):
    """
    Check if a template is loaded from the expected location.

    Args:
        name (str): Template name as referenced in Django
        should_be_in_root (bool): True if should load from templates/ root,
                                  False if should load from templates/oscar/

    Returns:
        tuple: (status, actual_path, expected_path, is_correct)
    """
    try:
        template = get_template(name)
        actual_path = Path(template.origin.name)
        expected_path = TEMPLATES_DIR / name

        if should_be_in_root:
            # Should be in templates/ root but NOT in templates/oscar/
            is_root = str(actual_path) == str(expected_path)
            is_in_library = ".venv" in str(actual_path)

            if is_root and not is_in_library:
                status = "✅ OK"
                is_correct = True
            elif is_in_library:
                status = "⚠️  LIBRARY"
                is_correct = False
            else:
                status = "❌ WRONG"
                is_correct = False
        else:
            # Should be in templates/oscar/
            is_correct = str(actual_path) == str(expected_path)
            status = "✅ OK" if is_correct else "❌ WRONG"

        return status, actual_path, expected_path, is_correct

    except Exception as e:
        return f"❌ MISSING", None, TEMPLATES_DIR / name, False


def format_path_short(path, base_dir):
    """Format path relative to project root for readability."""
    if path is None:
        return "NOT FOUND"
    try:
        return str(Path(path).relative_to(base_dir))
    except ValueError:
        return str(path)


def main():
    print("\n" + "=" * 80)
    print("DJANGO OSCAR TEMPLATE PRECEDENCE CHECKER")
    print("=" * 80 + "\n")

    # Check structural templates
    print(
        "📌 STRUCTURAL TEMPLATES (should be in templates/ root, NOT templates/oscar/)"
    )
    print("-" * 80)

    structural_results = []
    for template_name in STRUCTURAL_TEMPLATES:
        status, actual_path, expected_path, is_correct = check_template(
            template_name, should_be_in_root=True
        )
        structural_results.append((template_name, status, actual_path, is_correct))

        actual_short = format_path_short(actual_path, BASE_DIR)
        expected_short = format_path_short(expected_path, BASE_DIR)

        print(f"{status} {template_name:<30} <- {actual_short}")

    # Check Oscar namespace templates
    print("\n📦 OSCAR NAMESPACE TEMPLATES (should be in templates/oscar/)")
    print("-" * 80)

    oscar_results = []
    for template_name in OSCAR_NAMESPACE_TEMPLATES:
        status, actual_path, expected_path, is_correct = check_template(
            template_name, should_be_in_root=False
        )
        oscar_results.append((template_name, status, actual_path, is_correct))

        actual_short = format_path_short(actual_path, BASE_DIR)
        expected_short = format_path_short(expected_path, BASE_DIR)

        print(f"{status} {template_name:<40} <- {actual_short}")

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    all_results = structural_results + oscar_results
    total = len(all_results)
    correct = sum(1 for _, _, _, is_correct in all_results if is_correct)
    errors = total - correct

    print(f"\n✅ Correct:  {correct}/{total}")
    print(f"❌ Errors:   {errors}/{total}")

    if errors > 0:
        print("\n⚠️  Issues found:")
        for name, status, actual_path, is_correct in all_results:
            if not is_correct:
                print(f"  - {name}: {status}")
                if actual_path:
                    print(f"    Found: {format_path_short(actual_path, BASE_DIR)}")
    else:
        print("\n🎉 All templates are correctly configured!")

    print("\n" + "=" * 80 + "\n")

    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
