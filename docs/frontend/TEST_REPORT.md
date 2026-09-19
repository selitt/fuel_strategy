# Проверка compact frontend — 19 сентября 2026

## База и область изменений

Основа: fuel_frontend_full.zip, ранее построенный поверх 11.zip. Изменён frontend, добавлены его проверки и документация. Backend не редактировался. Побайтное сравнение с исходным ZIP: 30 backend-файлов, 21 файл данных, 44 файла organizer snapshot и 4 contract/config-файла без изменений (всего 99).

При проверке Docker COPY обнаружено отсутствие новых vendor inputs. Добавлен регрессионный тест: до правки он падает, после правки manifest проходит в отдельной staged-директории. Это проверка состава файлов, не запуск Docker.

Новый код матмодели не был приложен. Скриншоты не считаются исполняемой моделью или новой редакцией исходных параметров. Сохранён исходный pseudo_engine. Проверки UI/API не подтверждают математику V01–V10 или готовность к полной защите кейса.

## Реально выполнено

| Проверка | Результат |
|---|---|
| python -m pytest -q | 154 passed |
| cd frontend && npm test | 38 passed |
| compact_smoke.py --inline | 74 assertions прошли |
| launch_smoke.py | 7 native HTTP/entrypoint/restart assertions прошли |
| Строгий semantic tsc только src/lib/*.ts и src/api/*.ts | exit 0 |
| export_openapi.py --check | совпадает |
| generate_frontend_types.py --check | совпадает |
| workspace.py check | PASS, это проверка структуры, не продукта |
| verify_prebuilt.py | исходники и assets совпадают с manifest |
| COPY-граф Dockerfile.web-prebuilt в pytest | все проверяемые inputs присутствуют, это не Docker build |

Среда: Linux, Python 3.13.5, Node 22.16.0, TypeScript 5.8.3, Chromium 144.0.7559.96. Точные логи в evidence/. 74 — число assertions одного сквозного browser-сценария, включая размеры экрана, а не 74 независимых полных сценария.

## Что проверяют тесты

Форма не создаёт проект и не показывает подставленные KPI при открытии. Ползунки/стрелки меняют фактические order/reservation; отрицательный ввод блокирует сохранение. Отключение инвестиции не стирает заказы. Параметры источников соответствуют API, не иллюстрациям.

Расчёт сохраняет actual plan/revision, показатели совпадают с ответом API, JSON и CSV-архив содержат тот же результат. «Оба» вызывает второй настоящий расчёт без лишнего проекта; JSON/CSV содержат scenario_id, units, basis и честное происхождение. Изменения скрывают старые графики/сравнение. 409 не перетирает чужой план. Копирование, повторное открытие и сравнение сохранённых планов остаются доступны.

Импорт сложного плана с алиасами, двумя записями в одной ячейке, custom source, годом 2047 и неизвестными полями проходит без молчаливой агрегации/потери. Полный редактор меняет только выбранную запись. Pure-TS тесты отдельно проверяют нули, отсутствующие/нечисловые данные, CSV и отрицательные координаты stacked bars.

На 1440×900, 1366×768 и 1280×720 нет document scroll и скрытого вертикального переполнения инфраструктуры/матрицы/результата на стандартном наборе. Проверено до и после расчёта. На 390×844 нет горизонтального переполнения документа; таблица прокручивается локально, режимы план/результат переключаются. Reduced motion отключает переходы. Uncaught browser errors отсутствуют.

Отдельный launch_smoke.py запускает **bash run.sh** через новый процесс, получает HTML/assets/API по native HTTP, сохраняет и рассчитывает проект, перезапускает процесс и сравнивает весь сохранённый ProjectDTO. Это подтверждает Python-entrypoint и сохранность на диске, не публикацию в интернете.

## Ограничения проверки — не скрывать

1. В контейнере DNS для npm недоступен. npm install, полная семантическая проверка TSX с официальными React typings и Vite build не выполнялись. Проверены pure-TS модули и реально скомпилированный portable JS, но это не полный tsc.
2. Docker отсутствует. Compose и production Dockerfile сохранены; prebuilt Dockerfile дополнен копированием vendor/runtime и сборщика, которые проверяет manifest; их запуск/сборка здесь не подтверждены. Windows/PowerShell и конкретный GigaIDE Cloud workspace тоже не запускались.
3. Обычная навигация Chromium запрещена политикой среды (ERR_BLOCKED_BY_ADMINISTRATOR). Поэтому compact_smoke.py запущен с явно указанным --inline: настоящий React, DOM и события браузера, но fetch через Python relay к настоящему временному FastAPI. Запрет не обходился. Это не проверка native browser-network/deployment пути.
4. Native HTTP отдельно проверен запуском run.sh. Для полноценной приёмки площадки нужны обычная браузерная навигация, Vite/Docker build, TLS и публичная ссылка.
5. Архив не содержит выдуманного package-lock.json: транзитивные npm-зависимости не были разрешены. В сетевой среде создать и зафиксировать lockfile, не отключая проверку типов.

## Воспроизведение

```bash
python -m pytest -q
(cd frontend && npm test)
python tools/export_openapi.py --check
python tools/generate_frontend_types.py --check
python tools/workspace.py check
python tools/verify_prebuilt.py
python tests/web/launch_smoke.py
python tests/web/compact_smoke.py
# В ограниченной тестовой среде, явно как fallback:
python tests/web/compact_smoke.py --inline
```

Для браузерного скрипта нужны requirements-browser.txt и установленный Chromium/Playwright. Для стандартной production-сборки выполнить команды из HANDOFF.md. Готовый prebuilt позволяет запустить сайт без Node.js.
