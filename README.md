# Buriti Shopping Core

Django Oscar project with Bootstrap + SCSS styling.

Important:
- This project is not using Tailwind CSS anymore.
- Frontend styling is based on Oscar CSS + SCSS overrides in static/src/bootstrap_theme.scss.

## Requirements

- Python 3.14+
- uv

Optional:
- Node.js and npm (only if you still need npm tooling for anything else in your local workflow)

## Quick Start

1. Install Python dependencies

```bash
uv sync
```

2. Apply migrations

```bash
uv run python manage.py migrate
```

3. Create admin user

```bash
uv run python manage.py createsuperuser
```

4. Run development server

```bash
uv run python manage.py runserver
```

Open:
- Shop: http://127.0.0.1:8000/
- Admin: http://127.0.0.1:8000/admin/
- Dashboard: http://127.0.0.1:8000/dashboard/

## Daily Commands

Run dev server:

```bash
uv run python manage.py runserver
```

Run tests:

```bash
uv run python manage.py test
```

Run a specific app test module:

```bash
uv run python manage.py test shop.store.tests
```

Create migrations:

```bash
uv run python manage.py makemigrations
```

Apply migrations:

```bash
uv run python manage.py migrate
```

Check templates precedence:

```bash
uv run python check_templates.py
```

Collect static files:

```bash
uv run python manage.py collectstatic --noinput
```

Build compressed static bundle (production-like):

```bash
uv run python manage.py compress --force
```

## Frontend Styling Workflow (Bootstrap + SCSS)

Main global style override file:
- static/src/bootstrap_theme.scss

Template compression is enabled through django-compressor and django-libsass.
Global styles are loaded in templates/base.html with:
- Oscar base CSS
- SCSS file static/src/bootstrap_theme.scss

After SCSS changes, you can usually just refresh in development.
If styles look stale, run:

```bash
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
```

## Common Troubleshooting

### 1. ModuleNotFoundError or Django import error

Symptoms:
- Could not import Django
- Missing package errors

Fix:

```bash
uv sync
```

If still failing, verify Python version:

```bash
python --version
```

This project requires Python 3.14+.

### 2. sqlite OperationalError: no such table

Cause:
- Database schema not migrated.

Fix:

```bash
uv run python manage.py migrate
```

### 3. Port already in use when running server

Symptoms:
- Error: That port is already in use.

Fix:

```bash
uv run python manage.py runserver 8001
```

Or stop the process currently using port 8000.

### 4. SCSS or static changes not showing

Cause:
- Old compressed static cache.

Fix:

```bash
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
```

Then hard refresh the browser.

### 5. Template override not being picked

Cause:
- Wrong template namespace or incorrect override location.

Fix:

```bash
uv run python check_templates.py
```

This validates whether templates are resolved from the expected locations.

### 6. Whoosh index lock issues

Symptoms:
- Search-related errors mentioning lock files.

Cause:
- Stale lock in whoosh_index after interrupted process.

Fix:
- Stop running Django processes.
- Remove stale lock file from whoosh_index only when no process is using it.
- Start server again.

### 7. Static files missing in non-debug environment

Cause:
- staticfiles not collected/compressed.

Fix:

```bash
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
```

## Production-Oriented Command Order

Use this sequence when preparing a deployment build:

```bash
uv sync
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
```

## Notes

- Tailwind CSS is not part of the active frontend pipeline.
- Prefer editing SCSS in static/src/bootstrap_theme.scss for global styling changes.
