# Один Linux-сервер для команды

Поставка рассчитана на Linux с Docker Engine и Compose v2. Один контейнер обслуживает сайт и API, один worker работает с общим JSON-хранилищем. Все участники видят и меняют одни проекты; отдельных аккаунтов и персональных пространств нет.

Установка Docker, DNS, TLS и публикация сервера выполняются администратором площадки. Для сборки обычного образа серверу нужны доступ к registry базовых образов, npm и Python package index.

Во всех командах ниже рабочий каталог — корень проекта, а основной Compose-файл — `docker/compose.yaml`.

## Первая установка

```bash
cp docker/.env.example docker/.env
chmod 600 docker/.env
```

В `docker/.env` задайте оба значения `FUEL_HTTP_USER` и `FUEL_HTTP_PASSWORD`. Пароль храните только на сервере. Значения с `$` экранируйте для синтаксиса Compose. Оставьте `FUEL_BIND_HOST=127.0.0.1` и `FUEL_WEB_PORT=8080`, если reverse proxy работает на том же хосте.

```bash
docker compose --env-file docker/.env -f docker/compose.yaml config --quiet
docker compose --env-file docker/.env -f docker/compose.yaml up --build -d
docker compose --env-file docker/.env -f docker/compose.yaml ps
docker compose --env-file docker/.env -f docker/compose.yaml logs --tail=100 web
curl --fail http://127.0.0.1:8080/api/health
```

Health endpoint открыт; сайт, API и OpenAPI требуют общего пароля. Успешный health не доказывает корректность модели. Не печатайте полный результат `docker compose config` в общие логи: он может содержать секреты.

Основной `docker/Dockerfile` собирает React/TypeScript через npm и Vite, затем создаёт Python runtime. Чтобы использовать проверенный portable-пакет без npm-сборки frontend, задайте в `docker/.env`:

```dotenv
FUEL_DOCKERFILE=docker/Dockerfile.web-prebuilt
```

Этот вариант всё равно загружает Python-зависимости и базовый образ. После изменения frontend используйте обычный Dockerfile либо заново соберите portable-пакет штатной командой.

## HTTPS и доступ

Размещайте reverse proxy перед `127.0.0.1:8080`. Направьте DNS на сервер и получите действующий сертификат средствами площадки. Пример фрагмента уже существующего HTTPS `server` Nginx:

```nginx
client_max_body_size 8m;
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}
```

Это не полный TLS-vhost. Порт 8080 оставьте доступным только локально. Для контейнерного reverse proxy нужна согласованная Docker-сеть: `127.0.0.1` внутри другого контейнера не указывает на хост.

После настройки проверьте в браузере запрос пароля, загрузку сайта, сохранение и повторное открытие проекта, расчёт, выгрузку и сохранность проекта после перезапуска контейнера. Без пароля любой посетитель общего workspace сможет менять проекты.

## Резервная копия

Named volume хранит `/data/projects`. Не запускайте несколько экземпляров приложения поверх одного volume. Для согласованной копии остановите запись на короткое время:

```bash
(
set -e
umask 077
mkdir -p .local/backups
backup_file=".local/backups/projects-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
partial_file="$backup_file.partial"
trap 'rm -f "$partial_file"; docker compose --env-file docker/.env -f docker/compose.yaml start web' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
docker compose --env-file docker/.env -f docker/compose.yaml stop web
docker compose --env-file docker/.env -f docker/compose.yaml run --rm --no-deps -T web python -c 'import sys,tarfile; t=tarfile.open(fileobj=sys.stdout.buffer,mode="w|gz"); t.add("/data/projects",arcname="projects"); t.close()' > "$partial_file"
tar -tzf "$partial_file"
mv "$partial_file" "$backup_file"
printf 'Backup: %s\n' "$backup_file"
)
```

Архив получает итоговое имя только после проверки. При ошибке частичный файл удаляется, а EXIT-trap пытается снова запустить сайт. После прерывания проверьте `docker compose --env-file docker/.env -f docker/compose.yaml ps`.

Копируйте архив в защищённое хранилище вне сервера. `docker/.env` и конфигурацию HTTPS сохраняйте отдельно. Обычный `down` сохраняет volume; `down -v` удаляет данные и не используется при обновлении.

## Обновление и откат

1. Сохраните предыдущую копию исходников и `docker/.env`, сделайте backup данных.
2. Пока старый контейнер работает, сохраните его образ:

   ```bash
   docker image tag "$(docker compose --env-file docker/.env -f docker/compose.yaml images -q web)" fuel-contour:rollback
   ```

3. Доставьте новую согласованную копию исходников, сохранив `docker/.env` и имя Compose-проекта `fuel-contour`. Соберите образ:

   ```bash
   docker compose --env-file docker/.env -f docker/compose.yaml build
   ```

   При ошибке сборки работающий контейнер остаётся прежним.
4. Переключите контейнер и проверьте health, вход, сохранённый проект и логи:

   ```bash
   docker compose --env-file docker/.env -f docker/compose.yaml up -d --no-build
   ```

5. Верните сохранённую копию исходников и `docker/.env`, чтобы настройки соответствовали прежнему образу. Для запуска сохранённого образа создайте `.local/rollback.yaml`:

   ```yaml
   services:
     web:
       image: fuel-contour:rollback
   ```

   Затем запустите Compose с обоими файлами:

   ```bash
   docker compose --env-file docker/.env -f docker/compose.yaml -f .local/rollback.yaml up -d --no-build --pull never web
   ```

Откат образа не отменяет изменения данных. Если будущая версия меняет формат хранения, миграцию и обратную совместимость нужно согласовать до обновления.

## Восстановление данных

Сначала сохраните текущее состояние и остановите `web`. Восстановление выполняется в новый пустой volume, чтобы не смешивать snapshots. Создайте `.local/restore.yaml`:

```yaml
services:
  web:
    volumes:
      - restored_data:/data
volumes:
  restored_data:
```

```bash
backup_file=".local/backups/ИМЯ-ПРОВЕРЕННОГО-АРХИВА.tar.gz"
docker compose --env-file docker/.env -f docker/compose.yaml -f .local/restore.yaml run --rm --no-deps -T web python -c 'import pathlib,sys,tarfile; p=pathlib.Path("/data/projects"); assert not any(p.iterdir()), "target must be empty"; t=tarfile.open(fileobj=sys.stdin.buffer,mode="r|gz"); t.extractall("/data",filter="data"); t.close()' < "$backup_file"
docker compose --env-file docker/.env -f docker/compose.yaml -f .local/restore.yaml up -d --no-build web
```

После восстановления используйте тот же набор Compose-файлов для последующих операций, пока не закрепите новый volume в серверной конфигурации. Старый volume остаётся нетронутым. Проверьте проекты через UI до возобновления работы команды.

## Диагностика

```bash
docker compose --env-file docker/.env -f docker/compose.yaml ps
docker compose --env-file docker/.env -f docker/compose.yaml logs --tail=200 web
docker compose --env-file docker/.env -f docker/compose.yaml restart web
curl --fail http://127.0.0.1:8080/api/health
```

Подготовку Linux-хоста и нативный dev-режим описывает [корневой README](../README.md). Фактические результаты прежней проверки обвязки находятся в [maintenance handoff](maintenance/HANDOFF.md); они не подтверждают публичный сервер, DNS/TLS или математическую приёмку.
