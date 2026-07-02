"""Unit tests for PostgreSQL connection kwargs."""

import pytest

from src.core.models import DBConfig
from src.databases.connection import (
    asyncpg_connect_kwargs,
    psycopg2_connect_kwargs,
    supports_startup_options,
)


def _db_config(**overrides) -> DBConfig:
    values = {
        "host": "postgres",
        "port": 5432,
        "database": "poc2prod",
        "user": "poc2prod",
        "password": "secret",
    }
    values.update(overrides)
    return DBConfig(**values)


def test_asyncpg_disable_ssl_uses_false() -> None:
    kwargs = asyncpg_connect_kwargs(_db_config(ssl_mode="disable"))

    assert kwargs["host"] == "postgres"
    assert kwargs["ssl"] == "disable"


def test_asyncpg_require_ssl_uses_true() -> None:
    kwargs = asyncpg_connect_kwargs(_db_config(ssl_mode="require"))

    assert kwargs["ssl"] == "require"


def test_psycopg2_kwargs_include_sslmode_and_root_cert(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DB_STARTUP_OPTIONS_ENABLED", raising=False)

    kwargs = psycopg2_connect_kwargs(
        _db_config(ssl_mode="verify-full", ssl_root_cert="/etc/rds-ca.pem")
    )

    assert kwargs["sslmode"] == "verify-full"
    assert kwargs["sslrootcert"] == "/etc/rds-ca.pem"
    assert kwargs["options"] == "-c search_path=poc2prod,public"


def test_rds_proxy_connections_skip_startup_options(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DB_STARTUP_OPTIONS_ENABLED", raising=False)
    db_config = _db_config(host="poc2prod.proxy-abc.ap-south-1.rds.amazonaws.com")

    assert supports_startup_options(db_config) is False
    assert "server_settings" not in asyncpg_connect_kwargs(
        db_config,
        server_settings={"search_path": "poc2prod,public"},
    )
    assert "options" not in psycopg2_connect_kwargs(db_config)


def test_invalid_ssl_mode_raises_clear_error() -> None:
    with pytest.raises(ValueError, match="Unsupported DB_SSL_MODE"):
        asyncpg_connect_kwargs(_db_config(ssl_mode="definitely-not-valid"))
