"""FastAPI application factory."""

import logging
import logging.config
import os
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import quote, urlencode

import yaml
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ..chat_service import ChatService
from ..core.config import ConfigManager
from ..databases.connection import supports_startup_options
from ..databases.admin import AdminRepository
from ..databases.intersession import IntersessionRepository
from ..databases.retrieval import PgVectorRetrievalRepository
from ..embedding import LocalEmbedder, OllamaEmbedder, OpenAIEmbedder
from ..guardrails import InputGuard, build_pii_redactor
from ..jobs.scheduler import create_scheduler
from ..mcp_client import MCPToolLoader
from ..memory.repository import MemoryRepository
from ..orchestrators import RAGOrchestrator
from ..reranker import CrossEncoderReranker
from .admin import router as admin_router
from .auth import router as auth_router
from .chat import router as chat_router
from .documents import router as documents_router
from .loader import BaseFileLoader, LocalFileLoader, S3FileLoader
from .sessions import router as sessions_router
from .state_backends import RedisClarificationStore
from .upload import router as upload_router


ENABLE_IN_PROCESS_SCHEDULER = (
    os.getenv("ENABLE_IN_PROCESS_SCHEDULER", "false").lower() == "true"
)
os.environ.setdefault("LANGGRAPH_STRICT_MSGPACK", "true")


def _postgres_checkpointer_conninfo(config: ConfigManager) -> str:
    """Build a psycopg connection URI for LangGraph checkpoint tables."""
    db = config.db_config
    username = quote(db.user, safe="")
    password = quote(db.password, safe="")
    database = quote(db.database, safe="")
    query: dict[str, str] = {
        "sslmode": db.ssl_mode or "disable",
    }
    if supports_startup_options(db):
        query["options"] = "-c search_path=poc2prod,public"
    if db.ssl_root_cert:
        query["sslrootcert"] = str(db.ssl_root_cert)

    return (
        f"postgresql://{username}:{password}@{db.host}:{db.port}/{database}"
        f"?{urlencode(query, quote_via=quote)}"
    )


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    configured = [origin.strip() for origin in raw.split(",") if origin.strip()]
    if configured:
        return configured
    return [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
    ]


def _setup_logging(logging_config_path: str = "configs/logging.yaml") -> None:
    config_path = Path(logging_config_path)
    if not config_path.exists():
        logging.basicConfig(level=logging.INFO)
        return
    with open(config_path) as f:
        config = yaml.safe_load(f)
    Path("logs").mkdir(exist_ok=True)
    logging.config.dictConfig(config)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise singletons once at startup, clean up on shutdown."""
    _setup_logging()
    logger = logging.getLogger(__name__)

    config = ConfigManager()
    st_cfg = config.storage_config

    input_guard = None
    if config.guardrails_config.enabled:
        input_guard = InputGuard(config.guardrails_config)
    pii_redactor = build_pii_redactor(config.guardrails_config.pii_redaction)

    chat_service = ChatService(
        llm_config=config.llm_config,
        chat_config=config.chat_config,
        input_guard=input_guard,
        pii_redactor=pii_redactor,
    )

    # Build embedder from config — loaded once, shared across all requests.
    emb_cfg = config.embedding_config
    _embedder_map = {
        "local":  lambda: LocalEmbedder(model=emb_cfg.model),
        "ollama": lambda: OllamaEmbedder(model=emb_cfg.model),
        "openai": lambda: OpenAIEmbedder(model=emb_cfg.model, api_key=emb_cfg.api_key),
    }
    embedder = _embedder_map[emb_cfg.provider]()

    # Reranker — loaded once at startup (model weights cached in memory)
    rr_cfg = config.reranker_config
    reranker = CrossEncoderReranker(model=rr_cfg.model, device=rr_cfg.device)

    # ── Storage + distributed state backends ─────────────────────────────────
    # local deployment  → local disk, in-process dict, MemorySaver checkpointer
    # cloud/aws         → S3, Redis clarification store, Postgres checkpointer

    file_loader: BaseFileLoader
    checkpointer = None  # None → RAGOrchestrator falls back to MemorySaver

    if st_cfg.deployment == "cloud" and st_cfg.cloud_provider == "aws":
        import redis
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        from psycopg.rows import dict_row
        from psycopg_pool import AsyncConnectionPool

        file_loader = S3FileLoader(
            bucket=st_cfg.aws_s3_bucket,
            region=st_cfg.aws_s3_region,
        )

        redis_client = redis.Redis.from_url(
            st_cfg.aws_redis_url,
            decode_responses=False,
        )
        pending_clarifications = RedisClarificationStore(redis_client)

        checkpointer_pool = AsyncConnectionPool(
            conninfo=_postgres_checkpointer_conninfo(config),
            min_size=int(os.getenv("LANGGRAPH_POSTGRES_POOL_MIN_SIZE", "1")),
            max_size=int(os.getenv("LANGGRAPH_POSTGRES_POOL_MAX_SIZE", "4")),
            kwargs={
                "autocommit": True,
                "prepare_threshold": 0,
                "row_factory": dict_row,
            },
            open=False,
        )
        await checkpointer_pool.open()
        checkpointer = AsyncPostgresSaver(checkpointer_pool)
        await checkpointer.setup()

        app.state.checkpointer_pool = checkpointer_pool

        logger.info(
            f"Cloud storage: S3 bucket={st_cfg.aws_s3_bucket}, "
            f"Postgres checkpointer + Redis clarification store wired."
        )
    else:
        file_loader = LocalFileLoader()
        pending_clarifications: dict[str, str] = {}
        logger.info("Local storage: disk + in-process state backends.")

    # ── MCP tools library connection ──────────────────────────────────────────
    mcp_tool_loader = MCPToolLoader(config.mcp_config)
    await mcp_tool_loader.connect()

    # ── Intersession / RLHF / Admin repositories ─────────────────────────────
    jobs_cfg = config.jobs_config
    intersession_repo = IntersessionRepository(config.db_config)
    admin_repo = AdminRepository(config.db_config)
    job_history: dict = {}

    # ── RAGOrchestrator ───────────────────────────────────────────────────────
    orchestrator = RAGOrchestrator(
        embedder=embedder,
        retrieval_repo=PgVectorRetrievalRepository(
            config.db_config,
            rlhf_alpha=jobs_cfg.chunk_scoring.rlhf_alpha,
        ),
        reranker=reranker,
        chat_service=chat_service,
        memory_repo=MemoryRepository(config.db_config),
        reranker_config=rr_cfg,
        chat_config=config.chat_config,
        checkpointer=checkpointer,
        mcp_tool_loader=mcp_tool_loader,
        intersession_repo=intersession_repo,
        intersession_config=jobs_cfg.intersession,
    )

    # ── Background job scheduler ──────────────────────────────────────────────
    scheduler = None
    if ENABLE_IN_PROCESS_SCHEDULER:
        scheduler = create_scheduler(
            jobs_config=jobs_cfg,
            guardrails_config=config.guardrails_config,
            intersession_repo=intersession_repo,
            admin_repo=admin_repo,
            chat_service=chat_service,
            embedder=embedder,
            job_history=job_history,
        )
        scheduler.start()
        logger.warning(
            "In-process scheduler is enabled. Use only for local/dev; "
            "production jobs should run as Kubernetes CronJobs."
        )
    else:
        logger.info("In-process scheduler disabled; jobs run via one-shot commands.")

    app.state.config = config
    app.state.chat_service = chat_service
    app.state.pii_redactor = pii_redactor
    app.state.embedder = embedder
    app.state.orchestrator = orchestrator
    app.state.file_loader = file_loader
    app.state.pending_clarifications = pending_clarifications
    app.state.mcp_tool_loader = mcp_tool_loader
    app.state.intersession_repo = intersession_repo
    app.state.admin_repo = admin_repo
    app.state.job_history = job_history
    app.state.scheduler = scheduler

    logger.info(
        f"Application startup complete. "
        f"LLM={config.llm_config.provider}/{config.llm_config.model}, "
        f"Embedder={emb_cfg.provider}/{emb_cfg.model}, "
        f"Reranker={rr_cfg.model}, "
        f"Storage={st_cfg.deployment}, "
        f"MCP={config.mcp_config.transport if config.mcp_config.enabled else 'disabled'}, "
        f"IntersessionMemory={'enabled' if jobs_cfg.intersession.enabled else 'disabled'}"
    )
    try:
        yield
    finally:
        if scheduler and scheduler.running:
            scheduler.shutdown(wait=False)

        await mcp_tool_loader.disconnect()

        checkpointer_pool = getattr(app.state, "checkpointer_pool", None)
        if checkpointer_pool is not None:
            await checkpointer_pool.close()

        logger.info("Application shutdown.")


app = FastAPI(
    title="AI Research Assistant API",
    description="REST API for the GenAI research chat assistant.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(admin_router)
app.include_router(auth_router, prefix="/api", include_in_schema=False)
app.include_router(sessions_router, prefix="/api", include_in_schema=False)
app.include_router(chat_router, prefix="/api", include_in_schema=False)
app.include_router(upload_router, prefix="/api", include_in_schema=False)
app.include_router(documents_router, prefix="/api", include_in_schema=False)
app.include_router(admin_router, prefix="/api", include_in_schema=False)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
