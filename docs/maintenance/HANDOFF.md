# Передача: Linux-сервер и уборка корня

## Текущий этап

По уточнению пользователя поддерживается Linux-сервер; PowerShell удалён. Предыдущий отчёт ниже сохранён как история и не является свежим результатом текущего frontend.

- Docker: один основной `docker/compose.yaml`, `docker/Dockerfile`, дополнительный `docker/Dockerfile.web-prebuilt`, Docker-ignore и пример `.env` рядом. Старый backend-only Compose удалён. Контекст сборки по-прежнему корень проекта, имя `fuel-contour` и volume сохранены.
- Зависимости: `requirements/base.txt`, `dev.txt`, `browser.txt`, относительные `-r` обновлены.
- Подготовка: `scripts/prepare.sh`, только Linux. `run.sh` остаётся коротким входом в запуск Linux; все проектные `.ps1` удалены.
- Документы: один корневой README вместо отдельного START_HERE; API в `docs/api/README.md`, исходные контрольные суммы в `docs/archive/DELIVERY_SHA256.txt` без изменения содержимого.
- Навигация, workspace-манифест и тесты обновлены. В `src/README.md` исправлена только ссылка; Python-код приложения не изменён.
- Параллельно другой участник меняет frontend. Его файлы не перемещались и не исправлялись; portable повторно не генерировался из незавершённых исходников.

Проверки текущей раскладки (логи `.local/maintenance/linux-*`):

| Проверка | Результат |
|---|---|
| `bash -n scripts/prepare.sh run.sh` | PASS |
| `bash scripts/prepare.sh --check` | READY; без установки |
| `python3 tools/workspace.py check` | PASS, включая актуальные ссылки |
| `python3 -m unittest discover -s tests/workspace -p test_depend_scripts.py -v` | 14 passed; Windows-тесты удалены вместе с Windows-скриптами |
| `.local/maintenance/venv/bin/python -m pytest -q` | **159 passed, 27 subtests passed, 1 failed** |
| `docker compose --env-file docker/.env.example -f docker/compose.yaml -p fuel-linux-check build` | PASS: npm ci, TypeScript/Vite и Python runtime |
| Временный `up --no-build --wait` нового образа | HTTP 200: `/`, `/api/health`, `/api/calc/template`; контейнер остановлен и удалён |
| Compose без тестового `-p` | имя `fuel-contour`, volume `fuel-contour_project_data` сохранены |
| Архивные контрольные суммы | SHA-256 файла до/после переноса совпадает; содержимое не изменено |
| `git diff --check` | PASS |

Оставшийся тест — `tests/web/test_prebuilt_recipe.py::test_prebuilt_docker_copies_every_verified_input`: manifest prebuilt не совпадает с параллельно изменяемыми исходниками UI. Этот тест не ослаблялся и не пропускался. После завершения frontend-этапа его владелец должен реально пересобрать portable-пакет. Новый основной образ через Vite собран и запущен; повторная browser-приёмка чужих текущих UI-изменений в эту уборку не входит.

Контрольный запуск использовал отдельный `fuel-linux-check`; его контейнер, сеть и временный volume удалены. Реальные проекты и пользовательские `.env` не переносились и не удалялись. При обновлении существующего сервера скопируйте его конфигурацию из прежнего `.env` в `docker/.env`, сохранив доступ и параметры; не заменяйте рабочий файл пустым примером. Коммиты/push не выполнялись.

## История предыдущего этапа

### Рабочая обвязка до переноса файлов

Дата: 2026-09-19. Задача: бережная уборка документации, bootstrap и Docker для общего сайта команды. Исходники приложения и UI не входят в scope; сгенерированная portable-поставка пересобрана для совместимости с уже имеющимися исходниками.

Источники: START_HERE, PRODUCT, T04, frontend/HANDOFF, действующие скрипты и Compose. Решения согласованы в текущем диалоге; Git-операции и публикация сервера не разрешены.

## Изменения

- README и START_HERE ведут к единому запуску; DEPLOYMENT описывает сервер, доступ, backup и откат.
- Bootstrap использует реальные манифесты и приоритет корневого Compose. Предпочтительные версии установки — Python 3.13 / Node 22.16.0; уже установленные Python 3.12–3.13 и Node >=22.12,<25 принимаются. Валидные version-файлы сохраняют строгие pins, невалидные игнорируются с предупреждением. Windows-вариант сохранён; winget получает явную версию Node.
- `run.sh` учитывает явно заданный `PYTHON` перед `.venv`. Dev-режим использует отдельные группы процессов, завершает API/Vite по сигналу и дожидается их остановки; тесты воспроизводят прежнее игнорирование override и зависание при TERM.
- Portable-пакет реально пересобран из неизменённых текущих исходников: прежний manifest не учитывал Overview.tsx. Старые assets удалены штатным сборщиком, provenance не подменён.
- Docker frontend устанавливается через существующий lockfile и npm ci; API-only и portable сохранены.
- Исправлены устаревшие утверждения о frontend, lockfile и Overview; старые планы и отчёты помечены как исторические.
- Удалены два Zone.Identifier; requirements, лицензии, checksum-файлы и исходные материалы сохранены.

## Контракты и решения

API, DTO, математические правила, формат проектов и исходники frontend не меняются. Новый публичный интерфейс не вводится. Сохраняются существующие переменные FUEL_* и режимы запуска. Выбран один экземпляр сайта с общими проектами команды, без аккаунтов.

Работа выполняется в текущем workspace без создания веток и коммитов: это граница согласованного плана. Обнаруженные ошибки вне scope фиксируются отдельно.

## Проверки

Все результаты ниже получены в этом этапе, 2026-09-19. Локальные логи и временные проверочные сценарии сохранены в `.local/maintenance/` (игнорируются Git).

Среда хоста: Linux, Python 3.12.3, Node 24.21.0, Docker 29.1.3, Compose 2.40.3. Изолированное тестовое окружение: `.local/maintenance/venv`; исходная `.venv` не изменена. Docker runtime: Python 3.13.15; ветка Node 22 образа сборки — 22.23.2. Теги веток не фиксируют digest для будущих сборок.

В командах ниже `PY=.local/maintenance/venv/bin/python`.

| Команда / сценарий | Фактический результат | Лог / артефакт в .local/maintenance |
|---|---|---|
| `bash -n depend.sh run.sh` | exit 0 | проверка синтаксиса |
| `bash depend.sh --check` | READY, без установки | `bootstrap-check.log` |
| `$PY -m pytest -q` | **164 passed, 27 subtests passed** | `pytest.log` |
| `python3 tools/workspace.py check` | PASS всех 8 областей | `workspace-check.log` |
| `$PY tools/export_openapi.py --check` | snapshot current | stdout проверки |
| `$PY tools/generate_frontend_types.py --check` | types current | stdout проверки |
| `npm --prefix frontend test` | **38 passed** | `frontend-tests.log` |
| `npm --prefix frontend run build` | полный `tsc --noEmit` и Vite: exit 0 | `frontend-build.log` |
| `node frontend/scripts/build-portable.mjs` и `python3 tools/verify_prebuilt.py` | реальная пересборка; hashes совпадают | `portable-build.log` |
| `docker compose -p fuel-maintenance-check --env-file .env.example build` | обычный образ собран | `docker-build.log` |
| `FUEL_DOCKERFILE=docker/Dockerfile.web-prebuilt docker compose -p fuel-maintenance-prebuilt --env-file .env.example build` | portable-образ собран | `docker-prebuilt-build.log` |
| `docker compose ... config --quiet` для корневого и API-only Compose | оба exit 0 | stdout проверки |
| `$PY tests/web/launch_smoke.py --artifacts .local/maintenance/launch` | **7 checks**, HTTP, assets, создание/расчёт, сохранность после перезапуска процесса | `launch.log`, `launch/report.json` |
| `$PY .local/maintenance/dev_smoke.py` | Vite, API и proxy через `run.sh dev` доступны; после остановки reloader завершён, слушателей нет | `dev-smoke.log` |
| `$PY .local/maintenance/docker_smoke.py` | **22 checks**: оба образа, UI/assets/API, Basic-доступ, неверный пароль, сохранность после пересоздания контейнера, backup/restore | `docker-smoke.log`, `docker-smoke-report.json` |
| `python3 .local/maintenance/check_backup_doc.py` | 3 случая: ошибка команды, повреждённый архив, успешный архив; восстановление запуска и отсутствие финального файла при ошибке | `backup-doc.log` |
| `tests/web/compact_smoke.py --site frontend/dist --artifacts /artifacts` в тестовом Docker-образе | **74 checks, native-navigation**, без relay; uncaught errors нет | `browser-container.log`, `browser-container/report.json`, PNG в `browser-container/` |
| `git diff --check` | exit 0 | проверка diff |

Браузерный образ собирался из локального `.local/maintenance/Dockerfile.browser` на основе проверенного runtime-образа с Playwright 1.57.0 / Chromium 143. Запуск: `docker run --rm --name fuel-maintenance-browser-check -v "$PWD:/workspace:ro" -v "$PWD/.local/maintenance/browser-container:/artifacts" -w /workspace --entrypoint python fuel-maintenance-browser:local tests/web/compact_smoke.py --site frontend/dist --artifacts /artifacts`. Системные пакеты хоста не устанавливались.

Первый запуск pytest обнаружил старый stale prebuilt из-за присутствующего Overview.tsx; после штатной компиляции ошибка устранена. Регрессионные тесты воспроизвели выбор неправильного Compose, игнорирование PYTHON, зависание dev-launcher при TERM и блокировку поддерживаемых версий до исправления. Неактуальные version-файлы также проверены.

Временные процессы и контейнеры остановлены, UUID-volumes Docker-сценария удалены. Кэш образов, отдельная venv, скачанный Chromium и логи оставлены в качестве результатов проверки. `src/`, `frontend/src/`, package manifests/lockfile и исходные данные не изменены. Коммиты и push не выполнялись.

## Границы и следующий стык

- Dev-launcher корректно завершается по сигналу; прежний сценарий отдельного раннего падения API всё ещё требует остановить Vite вручную (скрипт ждёт frontend). Полная супервизия обоих сервисов в этот этап не добавлялась.
- Windows/PowerShell и установка инструментов через winget/системные менеджеры не запускались.
- Первичный Chromium на хосте не стартовал из-за отсутствия `libnspr4.so`; браузерная проверка успешно выполнена в отдельном Docker-образе. Хостовые библиотеки не менялись.
- Vite выдаёт три предупреждения `invalid-calc` в `frontend/src/styles.css`: строки 1891, 1903, 1957 (пробелы вокруг минуса). Это существующий CSS, оставлен для следующего frontend-этапа. Сборка и браузерный сценарий прошли.
- Реальная площадка, публичная ссылка, DNS/TLS, серверная конфигурация Nginx и Windows требуют отдельной проверки.
- Откат образа описан; самостоятельный сценарий rollback на реальном сервере не выполнялся. Backup/restore проверены на временном Docker-volume.

Приёмка математической модели остаётся у её владельцев. Следующий этап — отдельные изменения frontend после согласования; src/ может параллельно меняться другим участником.
