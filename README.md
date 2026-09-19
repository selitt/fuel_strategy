# Контур · топливное планирование

Состояние на **19 сентября 2026 года**. Это одностраничное приложение для кейса «Топливный космоконтур 2035»: React/Vite frontend, FastAPI API, JSON-хранилище проектов и исходный расчётный движок.

Оператор может редактировать план поставок и инвестиций на 2035–2040 годы, рассчитывать BASE и MANDATORY_STRESS, сравнивать одинаковые решения, сохранять проекты и выгружать JSON/CSV. Интерфейс и HTTP API работают. Математическая приёмка модели не завершена: API честно возвращает `engine.status=prototype` и `model_verified=false`.

Критические правила и ограничения расчёта собраны в [docs/MODEL.md](docs/MODEL.md). Рабочие входы, схемы и контрольные примеры находятся только в `data/`.

## Структура

- `src/engine/` — расчётный прототип;
- `src/app/` — FastAPI, DTO, проекты, импорт и экспорт;
- `frontend/` — React/TypeScript/Vite интерфейс и тесты;
- `data/` — CSV/YAML входы, JSON Schema и контрольные примеры;
- `docker/` — единственная production-сборка и Compose;
- `tests/` — Python, API, frontend delivery и tooling tests;
- `tools/` — генерация и проверка OpenAPI/TypeScript-контракта.

## Локальный запуск

Нужны Linux, Python 3.13, Node.js 22.12–24 и npm. Автоматическая подготовка устанавливает проектные зависимости и собирает frontend:

```bash
./scripts/prepare.sh
./run.sh local
```

Сайт откроется на <http://127.0.0.1:8080>. `run.sh local` использует только штатную Vite-сборку `frontend/dist`; если её нет, выполните:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
./run.sh local
```

Для разработки с Vite proxy:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements/dev.txt
npm --prefix frontend ci
./run.sh dev
```

Frontend будет доступен на `http://localhost:5173`, API — на `http://127.0.0.1:8000`.

## Docker и GitVerse Cloud

Локальный сервер и облачная площадка используют один путь: `docker/Dockerfile` собирает Vite frontend, затем FastAPI обслуживает UI и API из одного контейнера.

```bash
test -f docker/.env || cp docker/.env.example docker/.env
./run.sh
```

По умолчанию контейнер публикует порт `8080`. В GitVerse Cloud/GigaIDE откройте этот порт как Public и используйте отдельную вкладку. Если `FUEL_HTTP_USER` и `FUEL_HTTP_PASSWORD` пустые, любой обладатель ссылки может просматривать, рассчитывать и изменять общие проекты. Для постоянного публичного доступа задайте обе переменные в `docker/.env` и завершайте HTTPS на стороне площадки или reverse proxy. Не заменяйте существующий `docker/.env` примером: так можно стереть действующие credentials.

```bash
./run.sh status
./run.sh logs
./run.sh stop
```

Проекты хранятся в named volume `fuel-contour_project_data`. Не выполняйте `docker compose down -v`, если данные нужно сохранить. Один JSON-store рассчитан на один контейнер и один worker.

## Проверки

```bash
.venv/bin/python -m pytest -q
.venv/bin/python tools/export_openapi.py --check
.venv/bin/python tools/generate_frontend_types.py --check
npm --prefix frontend test
npm --prefix frontend run build
docker compose --env-file docker/.env.example -f docker/compose.yaml config --quiet
```

OpenAPI хранится в `docs/api/openapi.json`, TypeScript-типы — в `frontend/src/api/schema.d.ts`. После изменения HTTP-контракта обновляйте их только штатными генераторами:

```bash
.venv/bin/python tools/export_openapi.py
.venv/bin/python tools/generate_frontend_types.py
```

Эти проверки подтверждают транспорт, хранение, сборку и согласованность контрактов. Они не доказывают математическую корректность модели или конкурсные показатели.

## Известные границы

- модель использует 365 дней в каждом году;
- Monte Carlo возвращает сводку без истории отдельных случайных событий;
- пользовательские CSV/XLSX не подключены как отдельный набор расчётных данных;
- общий HTTP Basic-доступ не создаёт пользователей и ролей;
- автоматический оптимизатор и подтверждённая «лучшая стратегия» отсутствуют.
