# Buriti Shopping App

Frontend Next.js com fluxo de autenticacao e seguranca para API JWT.

## Recursos implementados

- Login e cadastro via JWT
- Refresh token automatico apos `401`
- Rotas protegidas com middleware (`/account`, `/checkout`, `/orders`)
- Protecao CSRF com header `X-CSRF-Token` em metodos mutaveis
- Logout sincronizado entre abas com `BroadcastChannel`
- Envio de cookies (`credentials: include`) para integracao segura com backend

## Executar localmente

```bash
pnpm dev
```

Aplicacao: `http://localhost:3000`

## Variaveis de ambiente

```bash
NEXT_PUBLIC_API_URL=http://0.0.0.0:8000
NEXT_PUBLIC_API_TIMEOUT_MS=15000
NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS=true
```

## CORS no backend

Como o backend desta workspace nao esta neste repositorio, a configuracao de CORS precisa ser aplicada no servidor da API.

### Exemplo Django + DRF

```python
# settings.py
INSTALLED_APPS = [
		...,
		"corsheaders",
]

MIDDLEWARE = [
		"corsheaders.middleware.CorsMiddleware",
		...,
]

CORS_ALLOWED_ORIGINS = [
		"http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
		"accept",
		"authorization",
		"content-type",
		"x-csrf-token",
		"x-request-source",
]

CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
```

### Exemplo Node/Express

```ts
import cors from "cors";

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-Source"],
  }),
);
```
