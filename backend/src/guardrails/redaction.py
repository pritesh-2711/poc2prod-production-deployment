"""PII redaction adapters for text entering or leaving LLM workflows."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from ..core.logging import LoggingManager
from ..core.models import PIIRedactionConfig

logger = LoggingManager.get_logger(__name__)


@dataclass(frozen=True)
class RedactionResult:
    """Result returned by a PII redactor."""

    text: str
    changed: bool = False


class BasePIIRedactor(ABC):
    """Base abstraction for PII redaction implementations."""

    @abstractmethod
    def redact(self, text: str) -> RedactionResult:
        """Return text with detected PII masked."""


class NoOpPIIRedactor(BasePIIRedactor):
    """Redactor used when PII redaction is disabled."""

    def redact(self, text: str) -> RedactionResult:
        return RedactionResult(text=text, changed=False)


class AnonypiiPIIRedactor(BasePIIRedactor):
    """PII redactor backed by anonypii and its DeBERTa detector."""

    def __init__(self, config: PIIRedactionConfig) -> None:
        try:
            from anonypii import Anonymizer
            from anonypii.masking.strategies import RedactedMaskingStrategy
        except ImportError as exc:
            raise RuntimeError(
                "anonypii is required when guardrails.pii_redaction.enabled=true"
            ) from exc

        self._anonymizer = Anonymizer(
            model=config.model,
            download=config.download,
            confidence_threshold=config.confidence_threshold,
            strategy=RedactedMaskingStrategy(placeholder=config.replacement),
        )
        logger.info(
            "PII redaction enabled with anonypii model=%s threshold=%.2f",
            config.model,
            config.confidence_threshold,
        )

    def redact(self, text: str) -> RedactionResult:
        if not text:
            return RedactionResult(text=text, changed=False)

        redacted = self._anonymizer.mask(text)
        return RedactionResult(text=redacted, changed=redacted != text)


def build_pii_redactor(config: PIIRedactionConfig) -> BasePIIRedactor:
    """Create the configured PII redactor."""
    if not config.enabled:
        logger.info("PII redaction disabled.")
        return NoOpPIIRedactor()
    return AnonypiiPIIRedactor(config)
