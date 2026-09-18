# Проверки

`api/` — реальные HTTP-тесты FastAPI через TestClient с изолированным временным JSON-хранилищем: контракт, проекты/ревизии, импорт, экспорт, ошибки, CORS и границы сериализации. `test_calc_api.py` проверяет базовый расчётный API, но не доказывает полноту модели.

`workspace/` — исполняемые тесты служебного каркаса, не физики и не финансов. `acceptance/catalog.json` — описания будущей приёмки продукта, не исполняемые проверки и не PASS. Контрольные примеры организатора остаются в `fuel-hackathon/test_oil/validation/`.

Из корня проекта:

```bash
python -m pytest -q
python -m pytest tests/api/test_json_boundaries.py -q
python tools/export_openapi.py --check
python tools/workspace.py check
```

Повторная проверка перед frontend: **146 passed**, включая 40 новых тестовых случаев. Отчёт, пределы проверки и логи: [PRE_FRONTEND_REVIEW](../docs/api/PRE_FRONTEND_REVIEW.md).

Нельзя заменять проверки фиктивными сравнениями, ослаблять утверждения ради PASS или скрывать проблемы через skip/xfail. В каждом новом модуле сохранять независимые тесты и явно отличать транспортную проверку от математического эталона.
