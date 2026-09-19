from src.app.security import FailedAuthenticationLimiter


def test_authentication_limiter_expires_rolling_window():
    now = [100.0]
    limiter = FailedAuthenticationLimiter(
        max_failures=2, window_seconds=60, max_peers=4, clock=lambda: now[0]
    )

    assert limiter.register_failure("peer") is None
    assert limiter.register_failure("peer") is None
    assert limiter.register_failure("peer") == 60
    now[0] = 160.0
    assert limiter.register_failure("peer") is None


def test_authentication_limiter_evicts_oldest_peer_at_memory_bound():
    limiter = FailedAuthenticationLimiter(
        max_failures=1, window_seconds=60, max_peers=2, clock=lambda: 100.0
    )

    assert limiter.register_failure("first") is None
    assert limiter.register_failure("second") is None
    assert limiter.register_failure("third") is None
    assert limiter.register_failure("first") is None
