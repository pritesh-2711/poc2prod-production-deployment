"""Runtime helpers for short-lived job processes."""

import os


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def job_dry_run(dry_run: bool | None) -> bool:
    if dry_run is not None:
        return dry_run
    return env_flag("JOB_DRY_RUN", False)


def job_batch_size(batch_size: int | None) -> int:
    if batch_size is not None:
        return max(batch_size, 0)
    raw = os.getenv("JOB_BATCH_SIZE", "100")
    try:
        return max(int(raw), 0)
    except ValueError:
        return 100


def build_config():
    from ...core.config import ConfigManager

    return ConfigManager()


def build_chat_service(config):
    from ...chat_service import ChatService
    from ...guardrails import InputGuard

    input_guard = None
    if config.guardrails_config.enabled:
        input_guard = InputGuard(config.guardrails_config)
    return ChatService(
        llm_config=config.llm_config,
        chat_config=config.chat_config,
        input_guard=input_guard,
    )


def build_embedder(config):
    from ...embedding import LocalEmbedder, OllamaEmbedder, OpenAIEmbedder

    emb_cfg = config.embedding_config
    embedder_map = {
        "local": lambda: LocalEmbedder(model=emb_cfg.model),
        "ollama": lambda: OllamaEmbedder(model=emb_cfg.model),
        "openai": lambda: OpenAIEmbedder(model=emb_cfg.model, api_key=emb_cfg.api_key),
    }
    return embedder_map[emb_cfg.provider]()


def build_intersession_repo(config):
    from ...databases.intersession import IntersessionRepository

    return IntersessionRepository(config.db_config)


def build_admin_repo(config):
    from ...databases.admin import AdminRepository

    return AdminRepository(config.db_config)
