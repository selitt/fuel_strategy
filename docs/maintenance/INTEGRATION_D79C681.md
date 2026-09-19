# Передача: объединение dev и FastAPI master

Дата: 2026-09-19. Scope: интеграция `dev` 4c60349 с `master` d79c68111828721c8a898ce4dd5d1499ef985da0 и завершёнными изменениями запуска c76ffbb. Физика, экономика, расчётные DTO и данные не исправлялись. Изменения `src/engine/__init__.py` и удаления неиспользуемого импорта loader унаследованы из master.

## Источники и изменения

Прочитаны AGENTS, README, PRODUCT, T06, текущие frontend/API handoff и diff обеих веток. Сохранены дневной UI, latest-only предпросмотр, режим «Оба» и отдельный риск-анализ из dev; новая структура `src.app.main` / `api/router.py` / `api/routes` / `api/deps.py` из master. Старые контроллеры и дублирующий неиспользуемый контроллер планов удалены. `web.py`, launcher, инструменты и тесты используют новую точку входа.

Каждое приложение получает свой `CalculationService(CaseCatalog(settings.reference_dir))`; глобальный сервис больше не определяет данные всех экземпляров. Версия результата учитывает код движка, адаптера, расчётные DTO, CSV и YAML. Существующие проекты открываются; старые версии результатов становятся stale без удаления данных.

Сохранены атомарная запись, expected_revision, происхождение импорта, строгий JSON, ограничения размера и вложенности, проверка полноты/конечности результата. Проверки транспорта остались в небольшой ASGI-обвязке; бизнес-ошибки используют стандартный HTTPException. Обработчик ошибок валидации отдаёт loc/msg/type без несериализуемого raw input/context.

Завершённые параллельные изменения запуска включены целиком: `run.sh` запускает Docker, `run.sh local` — локальный сайт, `run.sh dev` — API/Vite; prepare устанавливает зависимости и собирает frontend. Тестовые HTTP-запуски используют только local, временные хранилища и loopback.

## Контракты

Успешные DTO, URL, operationId исходных расчётных операций и JSON-проекты schema_version=1 сохранены. `/api/calc/risk` перенесён в новый роутер; обычный расчёт не запускает Monte Carlo. Нет анализа у внедрённого адаптера — HTTP 503.

Согласованное изменение ошибок: JSON `{"detail": "..."}` или массив диагностик; прежние `code` и `request_id` не обязательны и сервером больше не выдаются. X-Request-ID сохраняется как заголовок. Frontend различает конфликт ревизии и stale-result по HTTP-статусу и контексту операции. OpenAPI и TypeScript-типы обновлены генераторами. Portable-пакет реально пересобран.

## Фактические проверки

Работа выполнялась в `.local/integration-master`. Python: существующая `.local/maintenance/venv` основного checkout; Node-зависимости установлены разрешённым `npm --prefix frontend ci` по lockfile.

| Проверка | Результат |
|---|---|
| `python -m pytest -q` | 172 passed, 27 subtests passed; `.local/pytest-final.log` |
| `npm --prefix frontend test` | 60 passed; новые 409-тесты сначала воспроизвели ошибку |
| `npm --prefix frontend run build` | TypeScript и Vite PASS |
| `python tools/export_openapi.py --check` | актуальная схема |
| `python tools/generate_frontend_types.py --check` | актуальные типы |
| `python tools/workspace.py check` | все области PASS; source snapshots не изменены |
| `python -m unittest discover -s tests/workspace -p test_depend_scripts.py -v` | 17 passed |
| `node frontend/scripts/build-portable.mjs`; `python tools/verify_prebuilt.py` | реальная компиляция и совпадение hashes |
| `python tests/web/launch_smoke.py --artifacts .local/launch-smoke` | 7 HTTP-проверок, включая перезапуск процесса и сохранность проекта |
| `python tests/web/daily_smoke.py --site frontend/dist --artifacts /artifacts` | 26 browser checks, runtime errors отсутствуют |
| тот же browser-сценарий с `--site frontend/prebuilt` | 26 browser checks, runtime errors отсутствуют |
| `docker compose --env-file docker/.env.example -f docker/compose.yaml -p fuel-integration-check build` | обычный образ PASS |
| та же сборка с `FUEL_DOCKERFILE=docker/Dockerfile.web-prebuilt`, проект `fuel-integration-prebuilt` | portable-образ PASS |
| `python .local/docker_smoke.py` | 20 HTTP/контейнерных проверок: оба финальных образа, в том числе non-UTF8→422, auth и сохранность после пересоздания |

Browser-проверки выполнены в существующем `fuel-maintenance-browser:local` с текущим workspace, смонтированным read-only, отдельным writable-каталогом артефактов и `--network none`. На хосте Chromium не запускается из-за отсутствующей libnspr4.so; пакеты ОС не устанавливались. Результаты: `.local/daily-vite-container` и `.local/daily-portable-container`.

Docker smoke использовал отдельные UUID-проекты, loopback-порты и временные volumes; контейнеры, сети и volumes удалены в finally. Рабочие пользовательские данные не затрагивались. Docker-логи и отчёт находятся в `.local/docker-*.log` и `.local/docker-smoke-report.json`.

Независимое ревью нашло регрессию сериализации non-UTF8 тела: 500 вместо 422. Шесть регрессионных случаев сначала упали, после исправления прошли в полном pytest. Других Critical/Important замечаний в согласованном scope не найдено.

## Ограничения и следующий стык

Математическая приёмка V01–V10/K01–K20, исправление календаря/мощностей/финансов и вероятностных допущений не входят в этот этап. Публичный сервер, DNS/TLS и пользовательские устройства не проверялись и не публиковались. Npm ci сообщил 2 dependency advisories (low/high); версии зависимостей и lockfile не менялись.

Следующий стык — владельцы модели: отдельное согласование математических исправлений. Слияние не повышает `model_verified=false` до подтверждённой модели.
