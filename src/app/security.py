"""Delivery security for the shared public workspace."""
from __future__ import annotations

import base64
import binascii
from collections import OrderedDict, deque
from dataclasses import dataclass, field
from ipaddress import ip_address
import math
import os
import secrets
from time import monotonic
from typing import Callable
from urllib.parse import urlsplit

from starlette.responses import JSONResponse


_WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _read_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise RuntimeError(f"{name} must be one of 1/0, true/false, yes/no, on/off")


def _is_loopback(host: str) -> bool:
    candidate = host.strip().lower()
    if candidate == "localhost":
        return True
    if candidate.startswith("[") and candidate.endswith("]"):
        candidate = candidate[1:-1]
    try:
        return ip_address(candidate).is_loopback
    except ValueError:
        return False


def _normalize_origin(raw: str, *, require_https: bool) -> str:
    try:
        parsed = urlsplit(raw)
        port = parsed.port
    except ValueError as exc:
        raise RuntimeError("FUEL_PUBLIC_ORIGIN must be a valid origin") from exc
    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"} or not parsed.hostname:
        raise RuntimeError("FUEL_PUBLIC_ORIGIN must be an http(s) origin")
    if require_https and scheme != "https":
        raise RuntimeError("FUEL_PUBLIC_ORIGIN must use HTTPS in public mode")
    if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise RuntimeError("FUEL_PUBLIC_ORIGIN must contain only scheme, host, and optional port")
    hostname = parsed.hostname.lower()
    if ":" in hostname:
        hostname = f"[{hostname}]"
    if (scheme, port) in {("http", 80), ("https", 443)}:
        port = None
    return f"{scheme}://{hostname}{f':{port}' if port is not None else ''}"


@dataclass(frozen=True, slots=True)
class DeliverySecuritySettings:
    username: str | None = field(repr=False)
    password: str | None = field(repr=False)
    public_origin: str | None
    public_mode: bool

    @classmethod
    def from_env(cls) -> "DeliverySecuritySettings":
        username = os.getenv("FUEL_HTTP_USER", "")
        password = os.getenv("FUEL_HTTP_PASSWORD", "")
        public_mode = _read_bool("FUEL_PUBLIC_MODE")
        if bool(username) != bool(password):
            raise RuntimeError(
                "Set both FUEL_HTTP_USER and FUEL_HTTP_PASSWORD, or leave both empty"
            )
        if public_mode and not username:
            raise RuntimeError("Public mode requires shared HTTP credentials")

        raw_origin = os.getenv("FUEL_PUBLIC_ORIGIN", "").strip()
        origin = _normalize_origin(raw_origin, require_https=public_mode) if raw_origin else None

        if not username:
            if not _read_bool("FUEL_ALLOW_UNAUTHENTICATED_LOCAL"):
                raise RuntimeError(
                    "Passwordless local delivery requires "
                    "FUEL_ALLOW_UNAUTHENTICATED_LOCAL=1"
                )
            bind_host = os.getenv("FUEL_BIND_HOST", "")
            if not _is_loopback(bind_host):
                raise RuntimeError(
                    "Passwordless local delivery requires a loopback FUEL_BIND_HOST"
                )

        return cls(
            username=username or None,
            password=password or None,
            public_origin=origin,
            public_mode=public_mode,
        )


class FailedAuthenticationLimiter:
    """Small rolling-window limiter keyed only by the ASGI socket peer."""

    def __init__(
        self,
        *,
        max_failures: int = 10,
        window_seconds: float = 60.0,
        max_peers: int = 2048,
        clock: Callable[[], float] = monotonic,
    ):
        if max_failures < 1 or window_seconds <= 0 or max_peers < 1:
            raise ValueError("Authentication limiter bounds must be positive")
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self.max_peers = max_peers
        self.clock = clock
        self._failures: OrderedDict[str, deque[float]] = OrderedDict()

    def register_failure(self, peer: str) -> int | None:
        now = self.clock()
        attempts = self._failures.get(peer)
        if attempts is None:
            if len(self._failures) >= self.max_peers:
                self._failures.popitem(last=False)
            attempts = deque()
            self._failures[peer] = attempts
        else:
            self._failures.move_to_end(peer)
        threshold = now - self.window_seconds
        while attempts and attempts[0] <= threshold:
            attempts.popleft()
        if len(attempts) >= self.max_failures:
            return max(1, math.ceil(attempts[0] + self.window_seconds - now))
        attempts.append(now)
        return None


class SharedWorkspaceSecurity:
    """HTTP Basic authentication plus browser-origin protection for writes."""

    def __init__(
        self,
        app,
        *,
        settings: DeliverySecuritySettings,
        limiter: FailedAuthenticationLimiter | None = None,
    ):
        self.app = app
        self.settings = settings
        self.username = settings.username.encode("utf-8") if settings.username else None
        self.password = settings.password.encode("utf-8") if settings.password else None
        self.limiter = limiter or FailedAuthenticationLimiter()

    @staticmethod
    def _peer(scope) -> str:
        client = scope.get("client")
        if isinstance(client, (tuple, list)) and client:
            return str(client[0])
        return "<unknown>"

    def _valid_credentials(self, headers: dict[bytes, bytes]) -> bool:
        raw = headers.get(b"authorization", b"")
        try:
            scheme, token = raw.split(b" ", 1)
            if scheme.lower() != b"basic":
                return False
            username, password = base64.b64decode(token, validate=True).split(b":", 1)
            return bool(
                secrets.compare_digest(username, self.username or b"")
                & secrets.compare_digest(password, self.password or b"")
            )
        except (ValueError, binascii.Error):
            return False

    def _valid_write_origin(self, supplied: str, headers: dict[bytes, bytes]) -> bool:
        try:
            normalized = _normalize_origin(
                supplied, require_https=self.settings.public_origin is None
            )
            if self.settings.public_origin is not None:
                return normalized == self.settings.public_origin
            host = headers.get(b"host", b"").decode("latin-1").strip()
            if not host:
                return False
            request_origin = _normalize_origin(f"https://{host}", require_https=True)
            return normalized == request_origin
        except RuntimeError:
            return False

    async def _respond(self, scope, receive, send, *, status: int, detail: str, headers=None):
        output_headers = {"Cache-Control": "no-store", **(headers or {})}
        await JSONResponse(
            {"detail": detail}, status_code=status, headers=output_headers
        )(scope, receive, send)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") == "/api/health":
            await self.app(scope, receive, send)
            return
        headers = dict(scope.get("headers", []))
        if self.username is not None and not self._valid_credentials(headers):
            retry_after = self.limiter.register_failure(self._peer(scope))
            if retry_after is not None:
                await self._respond(
                    scope,
                    receive,
                    send,
                    status=429,
                    detail="Слишком много неудачных попыток входа",
                    headers={"Retry-After": str(retry_after)},
                )
                return
            await self._respond(
                scope,
                receive,
                send,
                status=401,
                detail="Требуется доступ к рабочему пространству",
                headers={
                    "WWW-Authenticate": 'Basic realm="Fuel workspace", charset="UTF-8"'
                },
            )
            return

        if scope.get("method", "GET").upper() in _WRITE_METHODS:
            fetch_site = headers.get(b"sec-fetch-site", b"").decode("latin-1").lower()
            supplied_origin = headers.get(b"origin", b"").decode("latin-1")
            if fetch_site in {"cross-site", "same-site"} or (
                supplied_origin
                and (
                    self.settings.public_origin is not None
                    or fetch_site != "same-origin"
                )
                and not self._valid_write_origin(supplied_origin, headers)
            ):
                await self._respond(
                    scope,
                    receive,
                    send,
                    status=403,
                    detail="Межсайтовый изменяющий запрос отклонён",
                )
                return

        await self.app(scope, receive, send)
