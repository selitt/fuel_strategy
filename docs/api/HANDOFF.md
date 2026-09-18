# Передача: рабочий API и очищенная структура

## Область

Корневой FastAPI-слой, JSON-хранилище проектов, импорт/экспорт, OpenAPI и
рабочая раскладка данных/Docker. Полная математическая модель и frontend
по-прежнему не объявлены готовыми.

## Актуальные пути

- рабочие входы: `data/`;
- оригинальные snapshots: `fuel-hackathon/test_oil/` и `fuel-hackathon/test/`;
- HTTP-контракт: `docs/api/openapi.json` и `src/app/api/KosmoAPI.yaml`;
- runtime-проекты: `.local/projects`;
- Docker: `docker/Dockerfile` и `docker/compose.yaml`.

## Границы

API читает root `data/`, а submodule остаются неизменяемыми reference snapshot.
`pseudo_engine` — прототип. Транспортные тесты не подтверждают V01–V10,
математические ограничения или конкурсные критерии.

## Команды

```bash
python3 tools/workspace.py check
python3 -m unittest discover -s tests/workspace -v
python3 -m pytest -q
python3 tools/export_openapi.py --check
docker compose -f docker/compose.yaml up --build -d backend
```

Перед Docker-запуском при необходимости скопировать
`docker/.env.example` в `docker/.env`. Не использовать `down -v`, если нужно
сохранить volume `project_data`.

## Следующий стык

Frontend использует `docs/api/openapi.json`. Подключение реального расчётного
адаптера выполняется владельцами модели через `CalculationBackend`; UI не
дублирует формулы.
