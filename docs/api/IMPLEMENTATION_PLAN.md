> Исторический план/отчёт предыдущего этапа, не текущий статус. Актуальная работа: [роли и следующий этап](TEAM_AND_NEXT.md).

# HTTP/UI bridge — план выполнения

**Основание:** пользователь разрешил доделать веб-часть, затем заменил 5.zip на 6.zip.
**Цель:** сохранить REST/DTO Васи и подготовить API для будущего UI, без правок engine.
**Архитектура:** существующий CalculationService → DI FastAPI; отдельные web DTO, JSON-хранилище и экспорт. Формулы и предметные defaults не меняются.
**Стек:** FastAPI/Pydantic/Uvicorn; pytest/HTTPX/jsonschema.
**Спецификация:** src/app/api/KosmoAPI.yaml, src/app/dto/calc_dto.py, исходные plan.schema.json/export.schema.json.

## Неподвижная область
Не менять src/engine/**, src/app/dto/calc_dto.py, src/app/service/calc_service.py, src/app/api/KosmoAPI.yaml, fuel-hackathon/**, sources.lock.json. Не создавать UI/оптимизатор/новую математику. Существующие GET /hello, GET /hello/{name}, GET /api/calc/template, POST /api/calc сохраняют operationId и JSON-смысл.

## 1. HTTP и совместимость
- [x] Написать tests/api/test_http_contract.py: сохранённые operationId, семантические схемы с разрешением $ref, 422, безопасные 500, request-id, finite JSON, health/meta, подстановка CalculationService.
- [x] Запустить `python -m pytest tests/api/test_http_contract.py -q` и сохранить RED.
- [x] Реализовать src/app/config.py, api/dependencies.py, api/errors.py, api/middleware.py, api/system_controller.py; расширить api/main.py и подключить DI к calc_controller.py.
- [x] Повторить тест и сохранить GREEN. Расчёт не выполняется в event loop; engine неизменён.

## 2. Импорт и проекты
- [x] Написать tests/api/test_projects.py: JSON-план с extra полями, сохранение/повторное открытие, revision conflict, stale result, UUID/path traversal, failed calculation without destroying last result, application restart.
- [x] Получить RED до реализации.
- [x] Добавить dto/web_dto.py, service/plan_io.py, persistence/project_store.py, service/project_service.py, api/plan_controller.py и api/project_controller.py.
- [x] Повторить тесты. Входы сохраняются вместе с результатом; изменения не затирают текущие данные другим запросом.

## 3. Выгрузка и сравнение
- [x] Написать tests/api/test_exports.py: точный JSON, CSV ZIP с метаданными/единицами, защита formula injection, отказ выдавать stale как current, импорт проекта как недоверенного snapshot.
- [x] Получить RED.
- [x] Добавить service/export_service.py и соответствующие additive endpoints. Никаких повторных формул. Сравнение возвращает сохранённые результаты без выбора стратегии.
- [x] Повторить тесты и проверить schemas организатора.

## 4. Передача
- [x] Зафиксировать проверенные версии зависимостей, Dockerfile/Compose (backend-only), local run, актуальный OpenAPI отдельно от YAML Васи. Сетевой `uv lock` заблокирован отсутствием DNS; lock не создан и не заявлен. См. API_README и лог попытки.
- [x] Запустить API-тесты, исходные тесты, реальный Uvicorn HTTP smoke; документировать известные исходные 3 workspace failure, не скрывать их.
- [x] Сверить SHA-256 engine/DTO/service/YAML/reference: 50 файлов не изменены.
- [x] Проверить полный snapshot и overlay-архив с manifest после упаковки. После распаковки: 63 API-теста проходят; полный набор — 89 passed / те же 3 исходных failed. CRC ZIP и 50 protected SHA-256 проверены.

## Уже обнаружено на исходном архиве
`python -m pytest tests -q`: 29 passed, 3 failed; все 3 — tests/workspace/test_workspace.py, missing task scope directories. Не исправлять их созданием фиктивных engine/physical и engine/economics.

## Фактический итог перед упаковкой

API и исходные API-тесты: 63 passed. Полный набор: 89 passed, 3 исходных workspace failure; новых причин падений не добавлено. Реальный Uvicorn/TCP: 9 проверок, включая перезапуск процесса с сохранённым проектом. Научная приёмка модели, Docker build и чистая установка не выполнены.
