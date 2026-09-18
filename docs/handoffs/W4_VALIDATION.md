# W4 — валидация интерфейсного направления

**Статус:** передача задания на проверку подготовки; это не отчёт о реализованном UI. **Владелец:** W4, имя не назначено. Шаблон: [HANDOFF](../templates/HANDOFF.md).

## Задача / scope / владелец

Проверить T04 и границу operator workspace: ввод/изменение плана, пересчёт через общий API, обзор, сравнение, диагностика нарушений, save/open и CSV/XLSX export. Не создавать экранов, fake result или второго набора формул до G0/T01.

## Прочитанные источники

- `../../AGENTS.md`, `../../START_HERE.md`, `../../WORK_ORDER.md`.
- `../../tasks/T01_DATA_AND_CONTRACTS.md`, `../../tasks/T04_OPERATOR_INTERFACE.md`, `../../tasks/T06_INTEGRATION.md`.
- `../../docs/PRODUCT.md`, `../../docs/ARCHITECTURE.md`, `../../contracts/README.md`, `../../frontend/README.md`.
- `../../fuel-hackathon/test_oil/schemas/plan.schema.json`, `scenario.schema.json`, `export.schema.json` и `examples/example_export_structure.csv`.

## Что изменено в подготовке

Форма UI принята как React + TypeScript + Vite + Plotly для Python API; frontend и API ещё не реализованы. В каркасе оставлены только README-границы. CASE_INPUT и схемы организатора не редактировались.

## Контракты

Версия T01 ещё не принята. UI должен отправлять план/сценарий в общий расчётный путь и показывать `not_calculated`, input error и рассчитанное нарушение раздельно. Export читает тот же CalculationResult и не пересчитывает стоимость. Фикстуры должны иметь маркировку `SYNTHETIC`/`NOT_CALCULATED`; health endpoint не является доказательством топливной модели.

## Проверки на своей машине

Выполнить без установки пакетов и без запуска frontend/backend:

```bash
git status --short --branch
python3 --version
uv --version
node --version
npm --version
docker --version
docker compose version
python3 -S tools/workspace.py check --json
python3 -S -m unittest discover -s tests/workspace -v
git diff --check
```

Зафиксировать фактическую ОС, архитектуру, shell и версии. `npm build`, browser checks и HTTPX smoke пока не запускать: frontend/API не существуют и это уже G0. Не выдавать синтетический JSON за расчёт.

## Критерии и доказательства

Связанные будущие доказательства: K05 reproducibility, K19 operator access, K20 persistence/export/extension. Сейчас доказательств реализации нет; статус `not_started`.

## Что ещё не работает

Нет React-проекта, API, OpenAPI/TS-типов, общего CalculationResult, сохранения или экспорта. Точный package layout остаётся открытым до G0.

## Допущения / вопросы

Не закрывать Q03, Q05, Q10 и Q11 через UI defaults. Не показывать reliability как автоматическое уменьшение поставки и не скрывать обязательства/shortage за округлением.

## Следующий стык

Передать W3 список UI-полей, состояний и экспортных требований для T01; после появления контракта согласовать OpenAPI → TypeScript и минимальный экран G0. Владелец дополняет эту карточку фактическими результатами своей машины и замечаниями.
