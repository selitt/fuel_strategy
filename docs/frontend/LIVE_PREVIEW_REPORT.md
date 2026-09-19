# Передача: лента поставок и живой предпросмотр

**Дата:** 19 сентября 2026. **Scope:** frontend, браузерная интеграция и проверки. `src/app`, engine, DTO и OpenAPI не изменены.

## Поведение

Убраны поясняющие подзаголовки и нижние служебные строки. Названия, значения, единицы, ошибки и нарушения сохранены. Основное действие — «Сохранить»: живой расчёт больше не требует отдельной кнопки.

Лента ниже матрицы и графиков показывает годовые заказ / бронь / поставлено. Выбор источника и года связан с редактором и графиком. Дубли не суммируются; неизвестные источники и будущие годы сохраняются; отсутствующие результаты не подменяются первым годом или нулём. Несовместимые единицы не переименовываются в тонны. На низком desktop разрешена вертикальная прокрутка, на телефоне таблица/лента прокручиваются внутри контейнера.

`POST /api/calc` получает неизменённый контракт плана. Не чаще одного цикла за 100 мс; один активный цикл и один заменяемый последний снимок. В «Оба» цикл содержит два запроса, сравнение публикуется только целиком для одного снимка. Старые ответы отбрасываются. Невалидный ввод не отправляется. Совпадающий уже рассчитанный снимок не запрашивается повторно после сохранения/экспорта. Ошибки не создают цикл повторов.

Во время ожидания предыдущий график остаётся видимым без приглушения и статуса — согласованное требование пользователя. Числа берутся только из ответов backend. Общая очередь `requestAnimationFrame` анимирует геометрию графиков, выделений, колец и полос ленты, останавливается в покое, учитывает reduced motion. Поля и положение ползунков отвечают на ввод сразу. 60 FPS — цель визуального обновления, не частота серверных расчётов.

Сохранение отдельно фиксирует проект и результат через существующие endpoints с expected_revision. Сохранённый ответ становится отображаемым; при ошибке второго сценария сохранённый основной ответ не теряется. Экспорт результата относится к актуальному сохранённому проекту. Предпросмотр не объявляется RunRecord; происхождение раскрывается в подробностях.

## Реализация

- `frontend/src/lib/live.ts`, `state/useLivePreview.ts`, `state/useWorkspace.ts`: очередь, снимки, предпросмотр, сохранение.
- `frontend/src/features/Timeline.tsx`, `lib/timeline.ts`, `SupplyMatrix.tsx`, `ResultPanel.tsx`, `ResultDetails.tsx`, `App.tsx`: лента, общий выбор, отображение и действия.
- `frontend/src/lib/motion.ts`, `components/useMotion.ts`, `components/AnalyticsChart.tsx`: единый кадровый планировщик и геометрия.
- `frontend/src/features/Infrastructure.tsx`, `styles.css`: чистка текста, компактное управление и адаптивность.
- `frontend/tests/live.test.mjs`, `motion.test.mjs`, `timeline.test.mjs`, `tests/web/live_smoke.py`, `compact_smoke.py`: проверки нового поведения и прежних операций.
- `frontend/prebuilt`: реально пересобран portable-компилятором; обычная Vite-сборка находится в `frontend/dist`.

## Проверки

Среда: Linux, Python 3.12, Node 24, React 18.2, TypeScript 5.8.3, Vite 7.3.1, Playwright 1.57, Chromium 143. Браузер и недостающие библиотеки установлены локально в проект с разрешения пользователя; ОС не изменена.

| Команда | Фактический результат |
|---|---|
| `npm --prefix frontend test` | 53 passed |
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend run build` | PASS; включает typecheck, без CSS warnings |
| `.venv/bin/python -m pytest -q` | 160 passed, 27 subtests passed |
| `.venv/bin/python tools/export_openapi.py --check` | PASS, контракт не менялся |
| `.venv/bin/python tools/generate_frontend_types.py --check` | PASS |
| `node frontend/scripts/build-portable.mjs` | 31 модуль, реальная компиляция |
| `.venv/bin/python tools/verify_prebuilt.py` | PASS |
| `.venv/bin/python -m pytest -q tests/web/test_prebuilt_recipe.py` | 1 passed после финальной пересборки |
| `.venv/bin/python tests/web/compact_smoke.py --site frontend/dist --artifacts frontend/test-results/compact` | 74 assertions, native browser navigation |
| `.venv/bin/python tests/web/live_smoke.py` | 34 assertions, native browser navigation |
| `frontend/test-results/portable_smoke.py` | Браузер: начальный расчёт, лента, живая правка, нет ошибок |

Для повторения браузерных проверок в этом checkout:

```bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.local/playwright"
export LD_LIBRARY_PATH="$PWD/.local/browser-libs/root/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
.venv/bin/python tests/web/live_smoke.py
```

Каждый browser script запускает локальный сервер с изолированным временным хранилищем и останавливает его в finally. Пользовательские проекты не использованы.

Live-проверка использует настоящий API, задержку ответов 200 мс и отдельно явно SYNTHETIC HTTP-фикстуры для неизвестных годов/источников/единиц. Эти фикстуры не добавлены в приложение. Проверены явное сохранение, конфликт ревизий, stale export, отказ второго сценария, отсутствие переполнения панелей на 1366/1280 и горизонтального document overflow на 390 px. В измеренном drag фрагменте 39 интервалов кадров: медиана 16.7 мс, максимум 16.8 мс. Это локальное измерение кадров браузера, не гарантия стабильных 60 FPS на любом устройстве и не замер скорости будущей модели.

Логи: `frontend/test-results/`. Снимки и отчёт: [desktop](evidence/live-preview/desktop.png), [1280 px](evidence/live-preview/view-1280.png), [mobile](evidence/live-preview/mobile-result.png), [JSON](evidence/live-preview/report.json).

## Границы и следующий стык

Математическая приёмка и конкурсные критерии не подтверждались. Docker, публикация и нагрузочный benchmark не запускались. Точные даты рейсов, аварии и адаптивные действия не реализованы: текущий контракт передаёт годы. Следующий стык с командой модели — контракт событий и внутригодового времени; UI не должен вычислять эти даты и последствия самостоятельно. Глобальные навыки и зависимости frontend не добавлялись. Git-коммиты и публикация не выполнялись.

Прочитаны: `START_HERE.md`, `docs/PRODUCT.md`, T04, текущий frontend handoff/report, `docs/regulation/RULES.md`, текущие DTO/контроллер расчёта и исходники frontend. Старые отчёты ниже/рядом остаются историческими, их числа не относятся к этому запуску.
