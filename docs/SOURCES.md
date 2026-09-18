# Источники и порядок чтения

| ID | Материал | Куда смотреть |
|---|---|---|
| P1 | [Постановка](Task/Постановка_кейса_—_Топливный_космоконтур_2035_КосмоХакатон_2026.pdf) | с. 2 — продукт; 3–5 — параметры; 6–8 — правила; 8–12 — функции/исследования; 13–14 — сдача |
| P2 | [Критерии](Task/Критерии_оценки_—_Топливный_космоконтур_2035_КосмоХакатон_2026.pdf) | с. 2–4 — 20 пунктов; с. 5 — единая шкала |
| P3 | [Дополнительно](Task/Дополнительно.pdf) | ссылки на test_oil и литературу |
| R | [README test_oil](../fuel-hackathon/test_oil/README.md) | смысловой расчётный путь и пояснения |

**Обязательный стресс — графический блок на с. 10 P1.** Текстовый extractor может его пропустить; сверять с [mandatory_stress.yaml](../fuel-hackathon/test_oil/scenarios/mandatory_stress.yaml). Оригинальные PDF сохранены. Для текстового поиска доступны [постановка по страницам](Task/text/fuel_case.pages.txt) и [критерии](Task/text/fuel_criteria.pages.txt); они не заменяют изображения.

## Конкретные файлы репозитория

| Что выяснить | Файлы |
|---|---|
| Условия/решения/допущения | [CASE_RULES](../fuel-hackathon/test_oil/docs/CASE_RULES.md), [FAQ](../fuel-hackathon/test_oil/docs/FAQ.md) |
| Смысл CSV и единицы | [data/README](../fuel-hackathon/test_oil/data/README.md), [DATA_DICTIONARY](../fuel-hackathon/test_oil/docs/DATA_DICTIONARY.md) |
| Формулы и периодичность | [CALCULATION_RULES](../fuel-hackathon/test_oil/docs/CALCULATION_RULES.md) |
| BASE/стресс/исследования | [scenarios/README](../fuel-hackathon/test_oil/scenarios/README.md), [STRESS_PROTOCOL](../fuel-hackathon/test_oil/docs/STRESS_PROTOCOL.md) |
| Оболочки плана и экспорта | [plan.schema](../fuel-hackathon/test_oil/schemas/plan.schema.json), [export.schema](../fuel-hackathon/test_oil/schemas/export.schema.json) |
| Проверочные примеры | [V01–V10](../fuel-hackathon/test_oil/validation/control_cases.md), [ожидаемые значения](../fuel-hackathon/test_oil/validation/expected_checks.json) |
| Научная база | [SCIENTIFIC_BASIS](../fuel-hackathon/test_oil/docs/SCIENTIFIC_BASIS.md) |

Для старта ничего не нужно клонировать повторно. Новую версию источников сравнивают отдельно, согласуют и фиксируют явно, а не обновляют в расчёте незаметно.

## Версии и границы проверки

В ZIP test_oil находится на `cec6de1950276091689e71a67f9a875fb4ca6213`; в этой сессии README и дерево main через GitHub дали тот же идентификатор. Основой сборки остались байты **из ZIP**. Контрольные суммы — [sources.lock.json](../sources.lock.json).

`test` — другой кейс «Космос как инфраструктура», сохранён только для полноты исходного архива. Его формулы, лоты и ограничения не использовать. ВКД не входит в это рабочее пространство.

В архиве нет исходной анкеты XLSX, `Источники_Кейс_2_КЭП.docx` и `docs/ERRATA_AND_PROVENANCE.md`, на который ссылаются пояснения. [Подборка Яндекс Диска](https://disk.360.yandex.ru/d/oMVoGQwhXvzzGg) не включена; её содержимое в этой сборке не подтверждено.

Все научные ссылки организатора сохранены в SCIENTIFIC_BASIS. Для выбранного метода позднее нужно прочитать первоисточник и заполнить связь источник→метод→реализация→ограничение. Не утверждать, что сборкой прочитаны все полные тексты, и не заменять учебные параметры цифрами из статей.

## Расхождения источников

Постановка, критерии и пояснения — разные источники, не разрешение выбирать удобное правило. Обе формулировки фиксируются в [OPEN_QUESTIONS](OPEN_QUESTIONS.md). Уточнение организатора сохраняется с датой/основанием и областью действия. Наши документы и каталоги не являются новым регламентом.

## Инструкции инструментов, не кейса

[Руководство Codex по AGENTS.md](https://developers.openai.com/codex/guides/agents-md/) использовано для организации инструкций агентам. [Документация Git](https://git-scm.com/docs/gitsubmodules) — для переноса. Ни один из этих источников не определяет математику кейса.
