"""Unit tests for PII redaction."""

import sys
import types
from unittest.mock import patch

from src.chat_service import ChatService
from src.core.models import ChatConfig, LLMConfig, PIIRedactionConfig
from src.guardrails.redaction import (
    AnonypiiPIIRedactor,
    BasePIIRedactor,
    NoOpPIIRedactor,
    RedactionResult,
    build_pii_redactor,
)


def test_noop_redactor_returns_text_unchanged() -> None:
    result = NoOpPIIRedactor().redact("email alice@example.com")
    assert result == RedactionResult(text="email alice@example.com", changed=False)


def test_disabled_config_builds_noop_redactor() -> None:
    redactor = build_pii_redactor(PIIRedactionConfig(enabled=False))
    assert isinstance(redactor, NoOpPIIRedactor)


def test_anonypii_redactor_masks_with_configured_replacement(monkeypatch) -> None:
    class FakeStrategy:
        def __init__(self, placeholder: str) -> None:
            self.placeholder = placeholder

    class FakeAnonymizer:
        def __init__(self, **kwargs) -> None:
            self.strategy = kwargs["strategy"]

        def mask(self, text: str) -> str:
            return text.replace("alice@example.com", self.strategy.placeholder)

    anonypii_module = types.ModuleType("anonypii")
    anonypii_module.Anonymizer = FakeAnonymizer
    masking_module = types.ModuleType("anonypii.masking")
    strategies_module = types.ModuleType("anonypii.masking.strategies")
    strategies_module.RedactedMaskingStrategy = FakeStrategy

    monkeypatch.setitem(sys.modules, "anonypii", anonypii_module)
    monkeypatch.setitem(sys.modules, "anonypii.masking", masking_module)
    monkeypatch.setitem(sys.modules, "anonypii.masking.strategies", strategies_module)

    redactor = AnonypiiPIIRedactor(PIIRedactionConfig(replacement="*************"))
    result = redactor.redact("email alice@example.com")

    assert result.text == "email *************"
    assert result.changed is True


class FakeRedactor(BasePIIRedactor):
    def redact(self, text: str) -> RedactionResult:
        masked = text.replace("alice@example.com", "*************")
        return RedactionResult(text=masked, changed=masked != text)


class FakeProvider:
    def __init__(self) -> None:
        self.user_message = ""
        self.system_prompt = ""

    def chat(self, user_message: str, system_prompt: str, **_) -> str:
        self.user_message = user_message
        self.system_prompt = system_prompt
        return "ok"


def test_chat_service_redacts_user_and_system_prompt_before_llm() -> None:
    provider = FakeProvider()
    with patch("src.chat_service.LLMProviderFactory.create", return_value=provider):
        service = ChatService(
            llm_config=LLMConfig(provider="openai", model="gpt-4.1-mini"),
            chat_config=ChatConfig(system_prompt="Contact alice@example.com"),
            pii_redactor=FakeRedactor(),
        )

    response = service.get_response("hello alice@example.com")

    assert response == "ok"
    assert provider.user_message == "hello *************"
    assert "alice@example.com" not in provider.system_prompt
    assert "*************" in provider.system_prompt
