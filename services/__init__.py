"""
Services package for EduGenie
"""
from services.gemini_service import (
    GeminiService,
    gemini_service,
    GeminiServiceError,
    GeminiConfigurationError
)

__all__ = [
    "GeminiService",
    "gemini_service",
    "GeminiServiceError",
    "GeminiConfigurationError"
]
