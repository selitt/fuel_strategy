# С чего начать

Рабочая версия: **compact frontend: один экран поверх API из `11.zip`**. Математическое ядро отдельно, не подтверждено.

1. Запуск полного сайта: [README](README.md).
2. Продолжение через Codex / точки подключения: [frontend/HANDOFF](docs/frontend/HANDOFF.md).
3. Реальные результаты проверок: [TEST_REPORT](docs/frontend/TEST_REPORT.md).
4. Работа над математикой: текущие DTO и адаптер Васи, затем своя карточка из `tasks/`.

be0h и Вася ведут интерфейс/API/адаптер. Три участника — расчётные модели. Интерфейс не дублирует математические формулы. Источники: `data/`, неизменённый `fuel-hackathon/test_oil`, оригинальные PDF в `docs/Task/`. Другой кейс в `fuel-hackathon/test` не использовать как источник логики.

Frontend: `frontend/src`; веб-поставка: `src/app/web.py`; рабочие ручки: `src/app/api`; опубликованная OpenAPI: `docs/api/openapi.json`. Новый корневой `compose.yaml` запускает весь сайт; старые backend-only инструкции сохранены как история.

Проверять: `python -m pytest -q`, `python tools/export_openapi.py --check`, `python tools/generate_frontend_types.py --check`, `python tools/workspace.py check`, затем frontend-тесты и сборку. Предыдущие количества тестов не считать актуальными без нового запуска.
