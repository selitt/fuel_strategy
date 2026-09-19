"""Web delivery entrypoint. Does not change the calculation app or adapter.

Run: python -m uvicorn src.app.web:create_web_app --factory --port 8080 --workers 1
"""
import base64
import binascii
import os
import secrets
from pathlib import Path

from fastapi import FastAPI
from starlette.responses import JSONResponse
from starlette.staticfiles import StaticFiles

from src.app.main import create_app
from src.app.config import ROOT


class SharedAccessGate:
    """Optional shared HTTP Basic gate; not accounts/roles. HTTPS must terminate upstream."""
    def __init__(self, app, *, username: str, password: str):
        self.app = app
        self.username = username.encode('utf-8')
        self.password = password.encode('utf-8')

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope.get('path') == '/api/health':
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get('headers', []))
        raw = headers.get(b'authorization', b'')
        valid = False
        try:
            scheme, token = raw.split(b' ', 1)
            if scheme.lower() == b'basic':
                username, password = base64.b64decode(token, validate=True).split(b':', 1)
                valid = (secrets.compare_digest(username, self.username)
                         & secrets.compare_digest(password, self.password))
        except (ValueError, binascii.Error):
            pass
        if not valid:
            response = JSONResponse(
                {'detail': 'Требуется доступ к рабочему пространству'},
                status_code=401,
                headers={'WWW-Authenticate': 'Basic realm="Fuel workspace", charset="UTF-8"',
                         'Cache-Control': 'no-store'},
            )
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)


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
    username = os.getenv('FUEL_HTTP_USER', '')
    password = os.getenv('FUEL_HTTP_PASSWORD', '')
    if bool(username) != bool(password):
        raise RuntimeError('Set both FUEL_HTTP_USER and FUEL_HTTP_PASSWORD, or leave both empty')
    directory = static_dir or Path(os.getenv('FUEL_FRONTEND_DIR', str(ROOT / 'frontend' / 'dist')))
    if not (directory / 'index.html').is_file():
        raise RuntimeError(f'Frontend build is missing: {directory}. Run npm run build in frontend/ or set FUEL_FRONTEND_DIR to frontend/prebuilt.')
    app = create_app()
    app.mount('/', WebFiles(directory=directory, html=True), name='frontend')
    if username:
        app.add_middleware(SharedAccessGate, username=username, password=password)
    return app
