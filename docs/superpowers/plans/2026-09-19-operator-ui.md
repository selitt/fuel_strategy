# Operator UI Implementation Plan

> For agentic workers: execute tasks inline with verification checkpoints. The user approved implementation in this conversation.

**Goal:** Рабочий интерфейс поверх существующего API без изменения математики.
**Architecture:** React/TS → same-origin API → existing adapter; one production ASGI process serves static assets.
**Tech Stack:** React 18, TypeScript, Vite, CSS, FastAPI, Docker Compose.
**Spec:** docs/superpowers/specs/2026-09-19-operator-ui.md

## Global constraints
Do not change src/engine/, calc_dto.py, calc_service.py, KosmoAPI.yaml, data/ or organizer snapshots. Preserve unknown DTO properties. Never show uncalculated numbers. Single worker, persistent projects. UI in Russian. No font binaries.

## Tasks
- [x] Generate types from OpenAPI; test exact output and stable HTTP 413 descriptions. Files: tools/generate_frontend_types.py, src/app/api/plan_controller.py, tests/web/test_delivery.py. Run `python -m pytest tests/web -q`.
- [x] API client and pure editor helpers. Files: frontend/src/api/client.ts, frontend/src/lib/plan.ts, frontend/tests/domain.test.mjs. Test finite nonnegative inputs, preserving extensions, source/year union, safe filenames, HTTP error handling before implementation. Run `npm test`.
- [x] Workspace controller and shell. Files: frontend/src/state/useWorkspace.ts, frontend/src/App.tsx, frontend/src/components/*.tsx. Verify request revisions, blocking stale exports, project switching, unsaved changes and conflict handling using real HTTP/browser.
- [x] Four views. Files: frontend/src/features/{Overview,PlanEditor,Compare,DataCatalog}.tsx; chart and table components. Verify values against API, empty states, numeric validation, comparison provenance and accessible controls.
- [x] Deployment entrypoint and Docker. Files: src/app/web.py, docker/Dockerfile.web, compose.yaml, run.sh, run.ps1. Test static app route, API 404 isolation, optional access gate, bad env combinations, persistent store. Run `python -m pytest -q`.
- [x] Browser acceptance, documentation and archive. Files: tests/web/browser_smoke.py, docs/frontend/HANDOFF.md, README.md. Run the original test suite, type generator check, UI helper suite and Chromium UI with real HTTP relay (managed-browser inline mode). Compare protected SHA256. Exclude .git, local data, caches, node_modules and credentials from final ZIP.

## Test recipes
```
python tools/export_openapi.py --check
python tools/generate_frontend_types.py --check
python -m pytest -q
cd frontend && npm install && npm run build && npm test
python tests/web/browser_smoke.py  # native navigation; isolated temporary server
```

Plan assumes ordinary package network access; when unavailable, report npm/Docker checks as not run, never substitute a green assertion. A browser-tested prebuilt bundle may be supplied with explicit build provenance.

Implementation tasks completed; external npm semantic typecheck/Vite build and Docker execution are not marked verified. See docs/frontend/TEST_REPORT.md for actual commands and evidence.
