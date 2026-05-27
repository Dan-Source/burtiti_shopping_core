# Manual de Deploy AWS EC2 (Producao)

Este guia descreve o deploy da aplicacao em EC2 com:

- Nginx + Gunicorn + systemd na instancia
- RDS PostgreSQL para banco
- ElastiCache Redis para Celery e cache

Escopo: producao, deploy manual, sem Elastic Beanstalk.

## 1. Pre-requisitos

- Conta AWS com acesso a EC2, VPC, RDS, ElastiCache, IAM e CloudWatch
- Dominio configurado (recomendado)
- Repositorio acessivel pela instancia
- Chave SSH (ou acesso por SSM)

## 2. Arquitetura alvo

- 1 EC2 Ubuntu 22.04/24.04 (app web + workers)
- 1 RDS PostgreSQL (subnet privada)
- 1 ElastiCache Redis (subnet privada)
- Security groups com acesso minimo necessario

## 3. Infraestrutura AWS

### 3.1 Security Groups

Crie os grupos:

- `sg-ec2-app`
  - Inbound 80 e 443 de internet
  - Inbound 22 somente do seu IP (ou sem 22 se usar SSM)
- `sg-rds-postgres`
  - Inbound 5432 somente de `sg-ec2-app`
- `sg-redis-cache`
  - Inbound 6379 somente de `sg-ec2-app`

### 3.2 RDS PostgreSQL

- Engine: PostgreSQL
- Backup automatico: habilitado
- Public access: desabilitado
- Security group: `sg-rds-postgres`

Anote endpoint, database, usuario e senha.

### 3.3 ElastiCache Redis

- Engine: Redis
- Endpoint privado
- Security group: `sg-redis-cache`

Anote endpoint e porta.

### 3.4 EC2

- Ubuntu 22.04/24.04
- Tipo recomendado: t3.medium ou superior
- IAM role: CloudWatchAgentServerPolicy (e acesso S3 se necessario)
- Security group: `sg-ec2-app`

## 4. Bootstrap da EC2

Conecte na instancia e execute:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx build-essential libpq-dev python3 python3-venv python3-pip curl
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
```

Crie pasta da aplicacao e clone repo:

```bash
sudo mkdir -p /srv/buriti
sudo chown -R $USER:$USER /srv/buriti
cd /srv/buriti
git clone <URL_DO_REPOSITORIO> app
cd app
uv sync
```

## 5. Variaveis de ambiente

Crie arquivo de ambiente:

```bash
sudo nano /etc/buriti.env
```

Conteudo minimo:

```env
DJANGO_SETTINGS_MODULE=core.settings.production
DJANGO_SECRET_KEY=trocar_por_chave_forte
DJANGO_ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com,IP_PUBLICO

POSTGRES_HOST=endpoint-rds
POSTGRES_PORT=5432
POSTGRES_DB=buriti
POSTGRES_USER=usuario
POSTGRES_PASSWORD=senha

CELERY_BROKER_URL=redis://endpoint-redis:6379/0
CELERY_RESULT_BACKEND=redis://endpoint-redis:6379/0
REDIS_URL=redis://endpoint-redis:6379/0
```

Ajuste permissoes:

```bash
sudo chmod 600 /etc/buriti.env
```

## 6. Preparacao Django

No diretorio da app:

```bash
cd /srv/buriti/app
export $(grep -v '^#' /etc/buriti.env | xargs)
uv run python manage.py migrate --noinput
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
uv run python manage.py check --deploy
```

## 7. Gunicorn via systemd

Crie o servico:

```bash
sudo nano /etc/systemd/system/buriti-gunicorn.service
```

```ini
[Unit]
Description=Buriti Gunicorn
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/srv/buriti/app
EnvironmentFile=/etc/buriti.env
ExecStart=/home/ubuntu/.local/bin/uv run gunicorn core.wsgi:application --bind 127.0.0.1:8000 --workers 3
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Habilite:

```bash
sudo systemctl daemon-reload
sudo systemctl enable buriti-gunicorn
sudo systemctl start buriti-gunicorn
sudo systemctl status buriti-gunicorn
```

## 8. Celery Worker e Beat via systemd

### 8.1 Worker

```bash
sudo nano /etc/systemd/system/buriti-celery-worker.service
```

```ini
[Unit]
Description=Buriti Celery Worker
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/srv/buriti/app
EnvironmentFile=/etc/buriti.env
ExecStart=/home/ubuntu/.local/bin/uv run celery -A core worker -l info
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 8.2 Beat

```bash
sudo nano /etc/systemd/system/buriti-celery-beat.service
```

```ini
[Unit]
Description=Buriti Celery Beat
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/srv/buriti/app
EnvironmentFile=/etc/buriti.env
ExecStart=/home/ubuntu/.local/bin/uv run celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Habilite:

```bash
sudo systemctl daemon-reload
sudo systemctl enable buriti-celery-worker buriti-celery-beat
sudo systemctl start buriti-celery-worker buriti-celery-beat
```

## 9. Nginx

Crie configuracao:

```bash
sudo nano /etc/nginx/sites-available/buriti
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;

    client_max_body_size 20M;

    location /static/ {
        alias /srv/buriti/app/staticfiles/;
    }

    location /media/ {
        alias /srv/buriti/app/media/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ative e reinicie:

```bash
sudo ln -s /etc/nginx/sites-available/buriti /etc/nginx/sites-enabled/buriti
sudo nginx -t
sudo systemctl restart nginx
```

## 10. HTTPS com Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
sudo certbot renew --dry-run
```

## 11. Deploy de nova versao

```bash
cd /srv/buriti/app
git pull origin main
uv sync
export $(grep -v '^#' /etc/buriti.env | xargs)
uv run python manage.py migrate --noinput
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
sudo systemctl restart buriti-gunicorn buriti-celery-worker buriti-celery-beat
```

## 12. Validacao pos deploy

- Abrir home da loja e admin
- Validar login e fluxo de carrinho/checkout
- Validar task Celery
- Verificar status dos servicos:

```bash
sudo systemctl status buriti-gunicorn buriti-celery-worker buriti-celery-beat
```

Logs:

```bash
sudo journalctl -u buriti-gunicorn -f
sudo journalctl -u buriti-celery-worker -f
sudo journalctl -u buriti-celery-beat -f
sudo tail -f /var/log/nginx/error.log
```

## 13. Rollback rapido

```bash
cd /srv/buriti/app
git checkout <TAG_ANTERIOR>
uv sync
export $(grep -v '^#' /etc/buriti.env | xargs)
uv run python manage.py migrate --noinput
uv run python manage.py collectstatic --noinput
uv run python manage.py compress --force
sudo systemctl restart buriti-gunicorn buriti-celery-worker buriti-celery-beat
```

## 14. Checklist final

- `DEBUG=False`
- `DJANGO_SECRET_KEY` definido por ambiente
- `DJANGO_ALLOWED_HOSTS` correto
- RDS e Redis sem acesso publico
- HTTPS ativo
- Backup de RDS habilitado
- Servicos com restart automatico

## 15. Referencias no projeto

- [README.md](../README.md)
- [docker-compose.yml](../docker-compose.yml)
- [core/settings/base.py](../core/settings/base.py)
- [core/settings/production.py](../core/settings/production.py)
- [Dockerfile](../Dockerfile)
