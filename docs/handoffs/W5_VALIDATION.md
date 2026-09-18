# W5 — валидация исследований, рисков и доказательств

**Статус:** передача задания на проверку подготовки; это не отчёт о выполненных экспериментах. **Владелец:** W5, имя не назначено. Шаблон: [HANDOFF](../templates/HANDOFF.md).

## Задача / scope / владелец

Проверить T05/T07/T08: научную базу, протоколы сценариев, сравнение альтернатив, собственные риски и меры, критерии доказательств и воспроизводимость сдачи. Не строить стратегию и не объявлять результаты без ядра T06.

## Прочитанные источники

- `../../AGENTS.md`, `../../START_HERE.md`, `../../WORK_ORDER.md`.
- `../../tasks/T05_RESEARCH_PROTOCOL.md`, `../../tasks/T07_EXPERIMENTS_AND_EXTENSION.md`, `../../tasks/T08_SUBMISSION.md`.
- `../../docs/regulation/CRITERIA.md`, `../../docs/regulation/RULES.md`, `../../docs/ACCEPTANCE.md`, `../../docs/deliverables/README.md`.
- `../../fuel-hackathon/test_oil/docs/SCIENTIFIC_BASIS.md`, `STRESS_PROTOCOL.md`, `CASE_RULES.md`, `scenarios/mandatory_stress.yaml`.
- `../../docs/OPEN_QUESTIONS.md` и `../../docs/provenance/normalization_report.json`.

## Что изменено в подготовке

Зафиксированы границы доказательств и выбран обязательный стек/UI; приложение, стратегия и эксперименты не создавались. Неподтверждённые внешние публикации и отсутствующие XLSX/DOCX/ERRATA остаются пробелами источника.

## Контракты

Будущие эксперименты используют то же ядро, что BASE: план и сценарий различаются; Mandatory stress применяет demand ×1.15 в 2038–2040, Core/Flex variable price ×1.25 только в 2038–2039, Lunar фактические доли .55/.75/1 и loss/throughput ceiling ≤2%. Reliability не добавляется вторым множителем. Собственные риски и high/low не смешиваются с Mandatory автоматически.

## Проверки на своей машине

Выполнить без установки пакетов и без расчёта несуществующего приложения:

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

Зафиксировать ОС, архитектуру, shell и версии. Статическое чтение `SCIENTIFIC_BASIS.md` не является проверкой всех публикаций. V01–V10, A01–A13 и K01–K20 пока не запускались/не подтверждены.

## Критерии и доказательства

Связанные будущие доказательства: K07 methods/scientific basis, K08 alternatives, K09 investments/contracts, K10/K13 stress, K11 sensitivity, K12 test protocols, K14–K18 risks/stakeholders/adaptation, K20 extension. Все статусы сейчас `not_started`.

## Что ещё не работает

Нет реализованного ядра, сравнительных прогонов, количественных последствий рисков, мер, графиков, management note или доказательств баллов. Нельзя подменять это контрольными JSON и синтетическими фигурами reference.

## Допущения / вопросы

Q01, Q06, Q08–Q11 остаются открытыми. Не придумывать вероятности, ставку дисконтирования, литературу или 2041 как закрытое требование; каждую TEAM_ASSUMPTION привязать к протоколу и области действия.

## Следующий стык

Передать W3 список обязательных метрик/доказательств для CalculationResult и T06; после T06 запускать BASE/MANDATORY_STRESS и собственные сценарии единым ядром. Владелец дополняет эту карточку фактическими результатами своей машины и замечаниями.
