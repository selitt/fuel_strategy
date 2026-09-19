"""Web delivery entrypoint. Does not change the calculation app or adapter.

Run: python -m uvicorn src.app.web:create_web_app --factory --port 8080 --workers 1
"""
import os
from pathlib import Path

from fastapi import FastAPI
from starlette.staticfiles import StaticFiles

from src.app.main import create_app
from src.app.config import ROOT
from src.app.security import DeliverySecuritySettings, SharedWorkspaceSecurity


class WebFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        is_asset = path.startswith('assets/')
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable' if is_asset else 'no-cache'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; connect-src 'self'; font-src 'self'; "
            "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        )
        return response


def create_web_app(*, static_dir: Path | None = None) -> FastAPI:
    """Factory validates delivery settings before accepting traffic.

    API handlers are registered first. Unknown /api routes are never replaced by
    index.html. Client navigation uses query parameters, so no unsafe SPA catch-all.
    """
    security = DeliverySecuritySettings.from_env()
    directory = static_dir or Path(os.getenv('FUEL_FRONTEND_DIR', str(ROOT / 'frontend' / 'dist')))
    if not (directory / 'index.html').is_file():
        raise RuntimeError(
            f'Frontend build is missing: {directory}. '
            'Run npm --prefix frontend run build.'
        )
    app = create_app()
    app.mount('/', WebFiles(directory=directory, html=True), name='frontend')
    app.add_middleware(SharedWorkspaceSecurity, settings=security)
    return app
