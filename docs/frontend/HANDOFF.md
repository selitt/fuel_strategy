> **Актуальный срез:** [дневной интерфейс, SimulationEngine и анализ рисков](DAILY_ENGINE_REPORT.md). Ниже — история предыдущих поставок.

> **Актуальный этап 19.09.2026:** [живой предпросмотр, лента и фактические проверки](LIVE_PREVIEW_REPORT.md). Ниже сохранён прежний срез; ручной расчёт и скрытие графиков после правки заменены автоматическим предпросмотром.

# Передача компактного интерфейса / Codex

## Срез

Одностраничный frontend на основе `fuel_frontend_full.zip`. Backend, данные и reference snapshot сохранены побайтно. Новый код матмодели не был приложен; работает прежний прототип. Скриншоты пользователя использованы для компоновки, не как замена данным API.

Верхняя строка: название/открытие проекта, BASE/STRESS/«Оба», расчёт, меню. Основной экран: инфраструктура, матрица и результат. Подробности открываются в диалогах; на телефоне два режима одного экрана. Не возвращать четыре большие страницы и sidebar без отдельного запроса пользователя.

## Где править

| Область | Файл |
|---|---|
| Шапка, меню, диалоги | `frontend/src/App.tsx` |
| Запас, инвестиции | `frontend/src/features/Infrastructure.tsx` |
| Матрица и выбранная ячейка | `frontend/src/features/SupplyMatrix.tsx` |
| Работа со структурой плана, коллизии | `frontend/src/lib/matrix.ts` |
| Виджеты результата и выбранный год | `frontend/src/features/ResultPanel.tsx` |
| Детальный баланс, проверки, происхождение | `frontend/src/features/ResultDetails.tsx` |
| Графики и кольца сервиса | `frontend/src/components/AnalyticsChart.tsx` |
| Координаты знакопеременной диаграммы | `frontend/src/lib/plot.ts` |
| Ползунки, числовые поля, тумблеры | `frontend/src/components/Controls.tsx` |
| Сохранение, ревизии, оба сценария | `frontend/src/state/useWorkspace.ts` |
| HTTP и ошибки | `frontend/src/api/client.ts` |
| CSV сопоставления на лету | `frontend/src/lib/pair.ts` |
| Полный редактор/сравнение/справочники в диалогах | `features/PlanEditor.tsx`, `Compare.tsx`, `DataCatalog.tsx` |
| Цвета, адаптивность, анимации | `frontend/src/styles.css` |
| Типы OpenAPI | `tools/generate_frontend_types.py` → `frontend/src/api/schema.d.ts` |
| Пересборка offline-пакета | `frontend/scripts/build-portable.mjs` |

Бывший `features/Overview.tsx` пока присутствует, но основной `App` его не подключает. Его удаление относится к следующему этапу frontend. Устаревшие названия View в hook оставлены для совместимости служебных редакторов, но не создают страницы/меню.

## Проверка в обычной сетевой среде

```bash
cd frontend
npm ci
npm test
npm run build
# build включает полный typecheck; package-lock.json уже в репозитории.
cd ..
python -m pytest -q
python tools/export_openapi.py --check
python tools/generate_frontend_types.py --check
python -m pip install -r requirements/browser.txt
python -m playwright install chromium
python tests/web/compact_smoke.py --site frontend/dist
python tests/web/launch_smoke.py
docker compose --env-file docker/.env -f docker/compose.yaml build
docker compose --env-file docker/.env -f docker/compose.yaml up -d
```

`compact_smoke.py` по умолчанию использует обычную browser navigation. `--inline` — явно обозначенный fallback среды проверки, не подтверждение browser-network/deploy пути. Скрипт создаёт временное хранилище. После обычной сборки указывать `--site frontend/dist`; без флага проверяется `frontend/prebuilt`. Старое имя `browser_smoke.py` делегирует новому сценарию.

В исходной offline-поставке были проверены 154 backend/packaging-теста, 38 frontend-тестов, 74 assertions настоящего React UI с HTTP relay, 7 native HTTP/launch-проверок и строгая проверка pure-TS модулей. Полный TSX typecheck, Vite и Docker в той среде были недоступны. Не лечить ошибки отключением strict. Исторические результаты — в TEST_REPORT.md; новые проверки обвязки — в [текущей передаче](../maintenance/HANDOFF.md).

## Инварианты редактирования

Матрица — лишь представление существующих массивов. Алиасы A / Earth-Core могут визуально соответствовать строке, но исходный source_id при записи сохраняется. Два заказа одной пары год/источник не суммируются: нужна раздельная правка в полном редакторе. Сохраняются неизвестные поля, дополнительные источники и будущие годы. Снятие инвестиции не удаляет заказы. Пустая запись отлична от явного нуля. Отрицательный ввод не исправляется молча: серверная структурная валидация остаётся обязательной.

Для пустых ячеек учитывается известный `available_from_year` каталога и наличие связанной инвестиции. Поле `InvestmentDecisionDTO.year` не определяет раздельно даты финансирования и ввода. В UI оно называется «Год модели» и передаётся без выдуманной интерпретации. Разрешённая ячейка не является утверждением о выполнимости; lead time проверяет модель.

## Два сценария

«Оба»: сохранить текущий проект → рассчитать его серверным project endpoint → скопировать снимок плана, поменяв только scenario_id → POST /api/calc → показать второй фактический ответ рядом. Второй ответ не объявляется сохранённым RunRecord. CSV/JSON явно указывают stateless-api-calc, параметры и единицы. Смена решений скрывает оба старых результата. «Сохранить второй сценарий» — отдельное действие создания и расчёта проекта.

## Подключение матмодели

`src/engine`, `src/app/dto/calc_dto.py`, `src/app/service/calc_service.py`, `src/app/api/KosmoAPI.yaml` принадлежат команде модели. Если контракт сохраняется, frontend получает новые результаты без новых бизнес-формул. При изменении DTO согласовать контракт, затем обновить OpenAPI/типы/renderer. Не добавлять Monte-Carlo, seed, «готовые оптимальные пресеты» или вероятности, пока их не принимает и не возвращает реальный adapter.

Сохраняйте текущий маркер прототипа до фактической приёмки. Не заменяйте пустые risk_register нулевым риском. Не добавляйте бесплатный предзапас и цены со скриншотов. Пользовательские CSV/XLSX требуют отдельного dataset contract и работающего пути через engine, а не только файловой кнопки.

Хранилище сейчас однопроцессное: один worker и один экземпляр на volume. Общий Basic-доступ не создаёт пользователей/ролей. TLS и внешний доступ настраиваются на площадке. Исходный organizer snapshot и sources.lock не трогать ради тестов.
