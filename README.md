# Контур · Топливное планирование

Одностраничное приложение для кейса **«Топливный космоконтур 2035»**: React-интерфейс, HTTP API на FastAPI и исходный прототип расчётного движка. Интерфейс и API работают, но математическая приёмка модели ещё не завершена. API подключён к существующему `SimulationEngine`; `pseudo_engine` удалён. Дневной график и отдельный анализ рисков описаны в [актуальной передаче](docs/frontend/DAILY_ENGINE_REPORT.md).

Объединение с новым FastAPI: [передача интеграции](docs/maintenance/INTEGRATION_D79C681.md).

## С чего начать

1. Прочитать [описание продукта](docs/PRODUCT.md) и выбрать одну карточку из [списка задач](tasks/README.md).
2. Для смысловой работы открыть только связанные первоисточники и [правила регламента](docs/regulation/RULES.md).
3. Для интерфейса использовать [актуальную передачу frontend](docs/frontend/HANDOFF.md), для сервера — [инструкцию деплоя](docs/DEPLOYMENT.md).
4. Фактические проверки обвязки записаны в [maintenance handoff](docs/maintenance/HANDOFF.md); прежние результаты UI сохранены как [исторический отчёт](docs/frontend/TEST_REPORT.md).

Основные источники находятся в `docs/Task/`, `data/` и `fuel-hackathon/test_oil/`. Каталог `fuel-hackathon/test/` относится к другому кейсу. Неизвестные параметры нельзя заменять правдоподобными числами, а проверки каркаса не доказывают корректность модели.

## Запуск на Linux-сервере

Из корня проекта выполните:

```bash
./scripts/prepare.sh
./run.sh
```

Подготовка устанавливает поддерживаемые инструменты, синхронизирует Python- и npm-зависимости и собирает production frontend. `run.sh` собирает Docker-образ, запускает сайт и API в фоне и ждёт успешный healthcheck. В GigaIDE откройте порт `8080`, задайте видимость **Public** и выберите **Open in new tab**. Встроенный Preview не подходит: политика сайта запрещает встраивание в iframe.

Пока `FUEL_HTTP_USER` и `FUEL_HTTP_PASSWORD` пустые, любой обладатель публичной ссылки может смотреть, рассчитывать, сохранять и изменять общие проекты. Для постоянного публичного сервера настройте пароль и HTTPS по [инструкции деплоя](docs/DEPLOYMENT.md).

Управление запущенным контейнером:

```bash
./run.sh status
./run.sh logs
./run.sh stop
```

Контейнер работает не от root, использует один worker и хранит проекты в named volume.

Обычный образ собирает frontend через npm, TypeScript и Vite. Если на сервере нужен поставленный portable-пакет, задайте в `docker/.env`:

```dotenv
FUEL_DOCKERFILE=docker/Dockerfile.web-prebuilt
```

Portable-вариант не заменяет полноценную frontend-сборку после изменения исходников.

## Подготовка Linux и локальная разработка

Проверить инструменты без установки и изменения системы:

```bash
./scripts/prepare.sh --check
```

Запуск `./scripts/prepare.sh` без `--check` может установить недостающие host-инструменты и зависимости, выполнить `npm ci` и собрать frontend; используйте его только явно на подготовляемом Linux-хосте. Скрипт не запускает приложение.

Для ручной установки Python-части рекомендуются Python 3.13 и отдельная `.venv`:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements/base.txt
./run.sh local
```

Готовый сайт откроется на `http://127.0.0.1:8080`. `run.sh local` использует `frontend/dist`, а при его отсутствии проверяет и запускает `frontend/prebuilt`.

Для разработки frontend нужен Node.js >=22.12,<25 (рекомендуется ветка 22):

```bash
python -m pip install -r requirements/dev.txt
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
./run.sh dev
```

Dev-режим запускает API на `127.0.0.1:8000` и Vite на `localhost:5173`; запросы `/api` проксируются в FastAPI. Скрипт читает переменные текущего процесса, а не `docker/.env`.

После согласованного изменения веб-контракта:

```bash
python tools/export_openapi.py
python tools/generate_frontend_types.py
```

`frontend/src/api/schema.d.ts` вручную не редактируется. Бизнес-формулы остаются в общем ядре, браузер получает готовый результат API.

## Что уже работает

Оператор может создать и сохранить проект, редактировать матрицу заказов и брони, запустить BASE или MANDATORY_STRESS, сравнить одинаковые решения в двух сценариях, открыть результаты и выгрузить данные. Неизвестные поля плана, нестандартные источники и будущие периоды сохраняются; конфликт ревизий и устаревший результат показываются явно.

Прохождение UI/API-тестов не подтверждает V01–V10, K01–K20, прогнозирование, оптимизацию или математическую корректность. Пользовательские CSV/XLSX пока не подключены к отдельному dataset contract. Один общий HTTP Basic-доступ не создаёт пользовательских аккаунтов; несколько контейнеров нельзя запускать поверх одного JSON-хранилища.

## Карта проекта

- `src/` — API, хранение и расчётный прототип;
- `frontend/` — интерфейс, тесты и portable-поставка;
- `docker/` — единый серверный Compose, Dockerfiles и пример окружения;
- `requirements/` — Python-зависимости для runtime, разработки и browser-проверок;
- `scripts/` — подготовка Linux-хоста;
- `tools/` — проверки workspace, OpenAPI, frontend-типов и prebuilt;
- `docs/`, `tasks/`, `plans/`, `prompts/` — документация, задачи и история планирования;
- `data/`, `contracts/`, `fuel-hackathon/` — данные, контракты и исходные материалы.

Описание HTTP API: [docs/api/README.md](docs/api/README.md). Архивные контрольные суммы исходной поставки: [docs/archive/DELIVERY_SHA256.txt](docs/archive/DELIVERY_SHA256.txt); их не перегенерируют после рабочих изменений.
