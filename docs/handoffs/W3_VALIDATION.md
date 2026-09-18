# W3 — валидация подготовки и общего стыка

**Статус:** передача задания на проверку подготовки; это не отчёт о реализованном расчёте. **Владелец:** W3, имя не назначено. Шаблон: [HANDOFF](../templates/HANDOFF.md).

## Задача / scope / владелец

Проверить T00/T01, навигацию, решения и единый контракт; собрать замечания W1/W2/W4/W5. На этом шаге не создавать Python-пакет, FastAPI, frontend или Docker-окружение: это G0.

## Прочитанные источники

- `../../AGENTS.md`, `../../START_HERE.md`, `../../WORK_ORDER.md`, `../../plans/README.md`.
- `../../tasks/T00_START_AND_DECISIONS.md`, `../../tasks/T01_DATA_AND_CONTRACTS.md`, `../../tasks/T06_INTEGRATION.md`, `../../contracts/README.md`.
- `../../docs/decisions.json`, `../../docs/open_questions.json`, `../../docs/ARCHITECTURE.md`, `../../docs/ACCEPTANCE.md`.
- `../../docs/provenance/normalization_report.json`, `../../sources.lock.json` и `../../docs/provenance/pre_normalization_sources.lock.json`.

## Что изменено в подготовке

Перенесены командные промпты в `../../prompts/team/`, восстановлены структурные README под `src/`, синхронизированы D01/D02 и сохранено происхождение переписанных командных заметок. CASE_INPUT, reference и submodule commits не менялись. Точная раскладка Python-пакета оставлена открытой до G0.

## Контракты

D01/D02 приняты частично: Python/FastAPI/Pydantic + React/TypeScript/Vite/Plotly + Docker Compose; JSON persistence и CSV/XLSX export. Открыты D03 календарь/события, D04 допуски, D05 discounting и D06 владельцы/сроки. `application_implemented=false`, `stage=preparation`, `next_task=T00` сохраняются. Один результат ядра должен использоваться UI и экспортом; UI не получает права на собственные формулы.

## Проверки на своей машине

Выполнить без установки пакетов и без запуска приложения:

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

Зафиксировать фактический вывод и отдельно отметить отсутствующие инструменты; не устанавливать их в рамках этого handoff. Проверка каркаса не означает V01–V10/K01–K20.

## Критерии и доказательства

Связанные будущие доказательства: K05 reproducibility, K06 architecture, K19 operator access, K20 save/export/extension. Сейчас проверяется только навигация и согласованность документов; продуктовые критерии `not_started`.

## Что ещё не работает

Нет версии контракта T01, Python package layout, зависимостей, API health, расчётного ядра, frontend и интеграции. Нельзя объявлять G0 выполненным по наличию README.

## Допущения / вопросы

Q01–Q11 остаются в исходных статусах. Q12 закрывает только стек/UI частично: имена, навыки, время и package layout ещё требуют команды. Не переписывать исторические review-протоколы задним числом.

## Следующий стык

Собрать W1/W2/W4/W5 замечания, выпустить согласованную версию T01 и только после этого передать команде G0. Владелец дополняет эту карточку фактическими результатами своей машины и консолидированным списком блокеров.
