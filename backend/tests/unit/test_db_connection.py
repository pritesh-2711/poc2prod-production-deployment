"""Unit tests for PostgreSQL connection kwargs."""

import pytest

from src.core.models import DBConfig
from src.databases.connection import asyncpg_connect_kwargs, psycopg2_connect_kwargs


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


def test_psycopg2_kwargs_include_sslmode_and_root_cert() -> None:
    kwargs = psycopg2_connect_kwargs(
        _db_config(ssl_mode="verify-full", ssl_root_cert="/etc/rds-ca.pem")
    )

    assert kwargs["sslmode"] == "verify-full"
    assert kwargs["sslrootcert"] == "/etc/rds-ca.pem"
    assert kwargs["options"] == "-c search_path=poc2prod,public"


def test_invalid_ssl_mode_raises_clear_error() -> None:
    with pytest.raises(ValueError, match="Unsupported DB_SSL_MODE"):
        asyncpg_connect_kwargs(_db_config(ssl_mode="definitely-not-valid"))
