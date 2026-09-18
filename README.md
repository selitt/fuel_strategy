# Топливный космоконтур 2035

Рабочий FastAPI-слой для интерфейса оператора: расчёт через подключаемый адаптер, проекты, JSON-импорт, сравнение и экспорт JSON/CSV. UI ещё не реализован; текущий `pseudo_engine` — прототип, а не подтверждённая конкурсная модель.

[Запуск и API](API_README.md) · [Роли и следующий этап](docs/api/TEAM_AND_NEXT.md) · [Проверки этой передачи](docs/api/HANDOFF.md) · [С чего начать](START_HERE.md)

## Запуск backend в Docker

```bash
docker compose up --build -d backend
```

Swagger: `http://127.0.0.1:8000/docs`. Health: `http://127.0.0.1:8000/api/health`.
Compose пока поднимает только backend. Данные сохраняются в volume `project_data`; `docker compose down -v` их удалит.

## Локальная разработка без Docker

Python 3.12–3.13; проверенная в этой передаче среда — Python 3.13.5. Linux/WSL:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m uvicorn src.app.api.main:app --reload --host 127.0.0.1 --port 8000
```

Windows-команды и отдельный режим `depend.sh --backend-only` — в [инструкции](API_README.md).

## Проверка

```bash
python -m pytest -q
python tools/export_openapi.py --check
python tools/workspace.py check
```

Схема для frontend: [openapi.json](docs/api/openapi.json), генерируется из реального приложения. Существующие расчётные DTO, сервис и `src/engine/` сохранены. Не переносите формулы на клиент.

## Исходные материалы

[Постановка продукта](docs/PRODUCT.md), [правила](docs/regulation/RULES.md), [источники](docs/SOURCES.md). `fuel-hackathon/test_oil/` — снимок нужного кейса; `fuel-hackathon/test/` — другой кейс, сохранённый для provenance. SHA-256 исходников — [sources.lock.json](sources.lock.json).

Полный архив — отдельный snapshot без Git-метаданных и локальных кэшей. Для текущего командного репозитория используйте overlay после сверки файлов; исходный `.git` не удаляйте. Подробности — [IMPORT_AND_GIT](docs/IMPORT_AND_GIT.md).
