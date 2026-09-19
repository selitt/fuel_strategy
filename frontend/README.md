# Frontend — один рабочий экран

React 18 + TypeScript + Vite. Исходники нового экрана находятся в `src/`; рабочий браузерный пакет — в `prebuilt/`.

`npm install`, `npm test`, `npm run typecheck`, `npm run build`. Для dev из корня: `bash run.sh dev`. Все запросы относительные `/api`. Production frontend обслуживает существующий FastAPI `src.app.web:create_web_app`, без CDN или внешних шрифтов.

Основные компоненты: `Infrastructure` → `SupplyMatrix` → `ResultPanel`. Основная страница одна; бывшие редактор строк, справочники и сравнение сохранённых проектов доступны как диалоги. Навигационный sidebar отсутствует.

`components/Controls.tsx`: ползунки, переключатели, числовые поля со стрелками. `components/AnalyticsChart.tsx`: SVG-графики готовых рядов; `lib/plot.ts` содержит только координаты столбцов, не финансовые формулы. `lib/matrix.ts` — отображение существующих записей без потери дополнительных полей или неявного сложения дублей. `lib/pair.ts` — CSV двух реальных результатов.

`prebuilt/` проверяется командой `python ../tools/verify_prebuilt.py`. Пересборка portable-пакета: `node scripts/build-portable.mjs` при доступном TypeScript. Runtime в `vendor/` унаследован из предыдущей поставки, лицензии включены. Это реальная альтернативная компиляция, **не Vite и не semantic typecheck TSX**. Предпочтительная штатная сборка: `npm run build`.

[Запуск](../README.md), [передача Codex](../docs/frontend/HANDOFF.md), [проверки](../docs/frontend/TEST_REPORT.md).
