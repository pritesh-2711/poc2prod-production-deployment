"""PostgreSQL connection helpers shared by asyncpg and psycopg2 repositories."""

import os
import ssl
from pathlib import Path
from typing import Any

from ..core.models import DBConfig

SUPPORTED_SSL_MODES = {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}


def _normalise_ssl_mode(db_config: DBConfig) -> str:
    ssl_mode = (db_config.ssl_mode or "disable").lower()
    if ssl_mode not in SUPPORTED_SSL_MODES:
        supported = ", ".join(sorted(SUPPORTED_SSL_MODES))
        raise ValueError(f"Unsupported DB_SSL_MODE '{ssl_mode}'. Use one of: {supported}.")
    return ssl_mode


def supports_startup_options(db_config: DBConfig) -> bool:
    """Return whether the target accepts Postgres startup command-line options.

    RDS Proxy for PostgreSQL rejects startup `options`, including
    `-c search_path=...`, so production connections through the proxy must use
    fully-qualified SQL names instead of connection-level search_path setup.
    """
    override = os.getenv("DB_STARTUP_OPTIONS_ENABLED")
    if override is not None:
        return override.lower() in {"1", "true", "yes", "on"}
    return ".proxy-" not in db_config.host


def _ssl_context(db_config: DBConfig, *, verify_hostname: bool) -> ssl.SSLContext:
    context = ssl.create_default_context(cafile=db_config.ssl_root_cert)
    context.check_hostname = verify_hostname
    if not verify_hostname:
        context.verify_mode = ssl.CERT_REQUIRED
    return context


def asyncpg_connect_kwargs(
    db_config: DBConfig,
    *,
    server_settings: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Return asyncpg connection kwargs, including SSL settings.

    RDS Proxy production should normally use DB_SSL_MODE=require. Use verify-ca
    or verify-full when a CA bundle is mounted and DB_SSL_ROOT_CERT is set.
    """
    ssl_mode = _normalise_ssl_mode(db_config)
    kwargs: dict[str, Any] = {
        "host": db_config.host,
        "port": db_config.port,
        "database": db_config.database,
        "user": db_config.user,
        "password": db_config.password,
    }
    if server_settings and supports_startup_options(db_config):
        kwargs["server_settings"] = server_settings

    if ssl_mode in {"verify-ca", "verify-full"} and db_config.ssl_root_cert:
        kwargs["ssl"] = _ssl_context(
            db_config,
            verify_hostname=ssl_mode == "verify-full",
        )
    else:
        kwargs["ssl"] = ssl_mode

    return kwargs


def psycopg2_connect_kwargs(db_config: DBConfig) -> dict[str, Any]:
    """Return psycopg2 connection kwargs, including SSL settings."""
    ssl_mode = _normalise_ssl_mode(db_config)
    kwargs: dict[str, Any] = {
        "host": db_config.host,
        "port": db_config.port,
        "database": db_config.database,
        "user": db_config.user,
        "password": db_config.password,
        "sslmode": ssl_mode,
    }
    if supports_startup_options(db_config):
        kwargs["options"] = "-c search_path=poc2prod,public"
    if db_config.ssl_root_cert:
        kwargs["sslrootcert"] = str(Path(db_config.ssl_root_cert))
    return kwargs
