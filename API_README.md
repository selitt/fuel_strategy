# Backend → FastAPI → UI

Это инструкция рабочего HTTP-слоя. Математика находится за адаптером; здесь нет второй реализации расчёта. `frontend/` пока содержит только инструкцию для разработчика.

Текущая передача и ограничения: [HANDOFF](docs/api/HANDOFF.md).

## Запуск

Из корня проекта, Docker Compose:

```bash
docker compose -f docker/compose.yaml up --build -d backend
docker compose -f docker/compose.yaml logs -f backend
```

`http://127.0.0.1:8000/docs` — Swagger, `/openapi.json` — схема, `/api/health` — состояние HTTP.
Compose поднимает только backend на loopback. Один worker: JSON-store использует блокировку внутри процесса. Не запускайте несколько процессов backend на одном каталоге проектов.

Изменение порта/CORS/лимитов: скопировать `docker/.env.example` в `docker/.env`, отредактировать и пересоздать контейнер. Проекты лежат в volume `project_data`; не применять `docker compose -f docker/compose.yaml down -v`, если их нужно сохранить.

Без Docker, Linux/WSL (Python 3.12–3.13):

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m uvicorn src.app.api.main:app --reload --host 127.0.0.1 --port 8000
```

Windows PowerShell, без обязательной активации окружения:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn src.app.api.main:app --reload --host 127.0.0.1 --port 8000
```

Проверить версию выбранного Python перед созданием окружения. Локальное приложение не читает `.env` автоматически: переменные `FUEL_DATA_DIR`, `FUEL_CORS_ORIGINS`, `FUEL_MAX_REQUEST_BYTES`, `FUEL_MAX_UPLOAD_BYTES` задаются в окружении процесса. По умолчанию проекты сохраняются в `.local/projects`.

Существующие bootstrap-скрипты теперь поддерживают отдельный backend:

```bash
bash depend.sh --backend-only --check
bash depend.sh --backend-only --full-check
```

PowerShell: `./depend.ps1 --backend-only --check` или `./depend.ps1 --backend-only --full-check`.
`--check` не устанавливает зависимости. Без `--check` скрипт может установить выбранные версии host tools. Backend-only не требует Node/Docker. При наличии `uv.lock` используется `uv sync --locked`; пока lock отсутствует — `uv pip sync` по зафиксированному `requirements-dev.txt` в локальное `.venv`. Отсутствие React-манифестов не блокирует backend-тесты.

## Проверка и схема

```bash
python3 -m pytest -q
python3 tools/workspace.py check
python3 tools/export_openapi.py --check
```

После согласованного изменения HTTP-контракта:

```bash
python3 tools/export_openapi.py
python3 -m pytest -q
```

Полный контракт: [docs/api/openapi.json](docs/api/openapi.json). Он сравнивается тестом с работающим приложением. Базовые две операции Васи остаются в `src/app/api/KosmoAPI.yaml`; запросы, успешные ответы и `operationId` проверяются на совместимость. `/hello` удалён и не должен использоваться.

## Группы операций

| Группа | Операции |
|---|---|
| Система | `GET /api/health`, `/api/meta`, `/api/catalog`, `/api/schemas/{name}` |
| Расчёт без сохранения | `GET /api/calc/template`, `POST /api/calc` |
| JSON-планы | `POST /api/plans/validate`, `/api/plans/import`, `/api/plans/export` |
| Проекты | `POST/GET /api/projects`, `GET/PUT/DELETE /api/projects/{id}` |
| Сохранённый расчёт | `POST /api/projects/{id}/calculate`, `GET /api/projects/{id}/result` |
| Перенос и сравнение | `POST /api/projects/import`, `/api/projects/compare`, `GET /api/projects/{id}/export`, `/api/projects/{id}/result/export` |

`/api/schemas/input` и `/api/schemas/result` — JSON Schema текущих расчётных DTO. `plan` и `export` — схемы рабочего набора `data/schemas/`. `/api/catalog` отдаёт CSV из `data/` строками, с именами столбцов и SHA-256; это read-only справочник, не подключение другого набора к математике.

## Пользовательский цикл для frontend

Получить шаблон или импортировать JSON-план. Создать проект через `{name, plan}` и сохранить `project_id`, `revision`. Все последующие операции используют серверную ревизию из последнего ответа.

```text
POST /api/projects                     {name, plan}
PUT  /api/projects/{id}                 {name, plan, expected_revision}
POST /api/projects/{id}/calculate       {expected_revision}
GET  /api/projects/{id}/result
POST /api/projects/compare              {project_ids: [id1, id2]}
GET  /api/projects/{id}/result/export?format=csv
```

Расчёт проекта тоже меняет ревизию. При `409 REVISION_CONFLICT` перечитать проект и показать конфликт, не перезаписывать чужую правку автоматически. Обновление имени само по себе не меняет входы; изменение плана или версии адаптера делает результат `stale`. Без расчёта состояние `not_calculated`; после совпадающего расчёта — `current`.

Актуальный результат недоступен до расчёта или после изменения входов: `409 RESULT_NOT_AVAILABLE` / `RESULT_STALE`. Старый снимок остаётся в проекте для просмотра, но его нельзя выдавать за актуальный. Хранится только последний запуск, не история запусков.

Сравнение принимает 2–6 различных проектов и возвращает их сохранённые актуальные результаты. Это не оптимизатор и не автоматический выбор стратегии.

## Файлы, экспорт, ошибки

Импорт использует `multipart/form-data`, поле **`file`**. Поддерживаются JSON-план и JSON-проект, но не Python, CSV или XLSX для подачи в модель. Браузер должен сам установить multipart boundary:

```typescript
const body = new FormData();
body.append("file", file);
const response = await fetch(`${apiBase}/api/plans/import`, { method: "POST", body });
// Не устанавливать Content-Type вручную для FormData.
```

Веб-JSON проверяется до сериализации: повторяющиеся ключи, нечисловые NaN/Infinity, некорректный Unicode и чрезмерная вложенность отклоняются. Предел глубины плана/результата — 128, полного документа — 192 (корень 0); это защита транспорта, не условия модели. Ошибочный ввод получает `422`, повреждённый ответ адаптера — `500` без замены предыдущего расчёта. Обычный `null` и текст `"NaN"` не запрещены.

JSON-проект импортируется как новая копия, а его результат помечается `origin=imported`, `model_verified=false`: перенесённым числам не присваивается доверие к серверному расчёту. Для серверного происхождения выполнить новый расчёт.

Выгрузка плана — переносимый JSON. Выгрузка проекта включает план и последний снимок. Выгрузка результата: `format=json` или `format=csv` (ZIP с CSV, метаданными и входным снимком). Числа берутся из сохранённого результата без пересчёта на стороне экспорта; единицы/периоды/сценарий присутствуют в конверте и метаданных. Пустые таблицы не означают «рисков нет».

Ошибки представлены единообразно:

```json
{"code":"VALIDATION_ERROR","detail":[{"loc":["body","decisions"],"msg":"...","type":"..."}],"request_id":"..."}
```

`detail` бывает строкой или массивом диагностик. UI сначала проверяет `response.ok`, затем отображает диагностическое сообщение; это касается и скачивания файлов. `X-Request-ID` доступен браузеру. В CORS разрешены `http://localhost:5173` и `http://127.0.0.1:5173`; публичный адрес нужно добавить явно. Доступен `Content-Disposition` для имён скачиваемых файлов.

## Стык с Васей

Контракт подключения — `CalculationBackend` в `src/app/api/dependencies.py`:
`get_template_plan() -> ParticipantPlanDTO`, `calculate(plan) -> ResultExportEnvelopeDTO`.
Подключение: `create_app(calculation_service=adapter, engine_info=...)`. Обычный запуск без аргументов подключает существующий `CalculationService`. Внедряемый адаптер должен быть синхронным; FastAPI вызывает его в threadpool, не в отдельной очереди задач.

В `engine_info` передаются стабильные `engine_id` и `version`, статус и ограничения. Версию менять при изменении интерпретации входов/алгоритма, чтобы сохранённые результаты стали устаревшими. Статус подтверждённой математической модели веб-слой сам не назначает.

Адаптер может сообщать ожидаемую ошибку через `ApiProblem`: FastAPI сохранит код/статус/диагностику. Исключения программирования скрываются за безопасным `500`; `NotImplementedError` и отсутствие реализации дают `503`. Доменную ошибку следует переводить в публичную диагностику в адаптере, а не помещать HTTP-зависимости в математическое ядро.

[Разделение ответственности и последовательность](docs/api/TEAM_AND_NEXT.md).

## Чего это не подтверждает

Здесь не исправлены мощности, сроки, финансы или риск-модель `pseudo_engine`. Произвольные поля сохраняются согласно DTO, но могут не использоваться текущим адаптером. Проверка плана — `structure_only`, не проверка исполнимости.

Нет frontend, авторизации, разделения пользователей, фоновых заданий, процентов прогресса и полноценной истории запусков. Общий локальный workspace нельзя без защиты публиковать в интернете. Проверки передачи и ограничения среды — [HANDOFF](docs/api/HANDOFF.md).
