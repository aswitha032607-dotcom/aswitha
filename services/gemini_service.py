"""
Gemini Service for EduGenie.
Handles AI communication via Google Gemini API with multi-engine fallback and robust error handling.
"""
import os
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

from utils.json_utils import parse_llm_json

# Load environment variables
load_dotenv()

logger = logging.getLogger("edugenie.services.gemini")

class GeminiServiceError(Exception):
    """Custom exception for Gemini service errors."""
    pass


class GeminiConfigurationError(GeminiServiceError):
    """Exception raised when API key or configuration is missing."""
    pass


class GeminiService:
    def __init__(self):
        self.reload_config()

    def reload_config(self):
        """Reload configuration from environment variables."""
        load_dotenv(override=True)
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-pro").strip()

        # Sanitize model name if user provided without prefix
        if self.model_name.startswith("models/"):
            self.model_name = self.model_name.replace("models/", "")

        self._genai_client = None
        self._legacy_genai = None

        if self.api_key and self.api_key != "your_api_key_here":
            self._init_client()

    def _init_client(self):
        """Initializes the Gemini client using modern google.genai or legacy google.generativeai."""
        # 1. Try modern google-genai
        try:
            from google import genai
            self._genai_client = genai.Client(api_key=self.api_key)
            logger.info(f"Initialized google.genai client with model: {self.model_name}")
            return
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"Failed to initialize google.genai client: {e}")

        # 2. Try legacy google.generativeai
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=self.api_key)
            self._legacy_genai = legacy_genai
            logger.info(f"Initialized legacy google.generativeai with model: {self.model_name}")
            return
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"Failed to initialize legacy google.generativeai: {e}")

    def is_configured(self) -> bool:
        """Returns True if a valid Gemini API key is configured."""
        if not (self.api_key and self.api_key != "your_api_key_here" and len(self.api_key) > 5):
            self.reload_config()
        return bool(self.api_key and self.api_key != "your_api_key_here" and len(self.api_key) > 5)

    def _check_api_key(self):
        """Checks if API key is present; raises GeminiConfigurationError if missing."""
        if not self.is_configured():
            raise GeminiConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file."
            )

    def _call_via_google_genai(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Calls Gemini using modern google.genai SDK."""
        from google.genai import types

        config_args = {}
        if system_instruction:
            config_args["system_instruction"] = system_instruction

        config = types.GenerateContentConfig(**config_args) if config_args else None

        response = self._genai_client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )

        if not response or not response.text:
            raise GeminiServiceError("Received an empty response from Gemini model.")
        return response.text.strip()

    def _call_via_legacy_genai(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Calls Gemini using legacy google.generativeai SDK."""
        model_kwargs = {}
        if system_instruction:
            model_kwargs["system_instruction"] = system_instruction

        model = self._legacy_genai.GenerativeModel(
            model_name=self.model_name,
            **model_kwargs
        )
        response = model.generate_content(prompt)
        if not response or not response.text:
            raise GeminiServiceError("Received an empty response from Gemini model.")
        return response.text.strip()

    def _call_via_rest(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Fallback direct REST API call using httpx."""
        import httpx

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        
        payload: Dict[str, Any] = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }

        if system_instruction:
            payload["system_instruction"] = {
                "parts": [{"text": system_instruction}]
            }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(url, json=payload)
                if res.status_code != 200:
                    err_msg = res.text
                    try:
                        err_json = res.json()
                        err_msg = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        pass
                    raise GeminiServiceError(f"Gemini REST API error ({res.status_code}): {err_msg}")
                
                data = res.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    raise GeminiServiceError("No response candidates returned by Gemini.")
                
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts or "text" not in parts[0]:
                    raise GeminiServiceError("Empty text in Gemini candidate content.")
                return parts[0]["text"].strip()
        except httpx.RequestError as exc:
            raise GeminiServiceError(f"Network error communicating with Gemini API: {exc}")

    def _execute_with_model(self, model_to_use: str, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Executes a single generate_content request with the given model name."""
        # 1. Try google.genai
        if self._genai_client:
            from google.genai import types
            config_args = {}
            if system_instruction:
                config_args["system_instruction"] = system_instruction
            config = types.GenerateContentConfig(**config_args) if config_args else None
            response = self._genai_client.models.generate_content(
                model=model_to_use,
                contents=prompt,
                config=config,
            )
            if response and response.text:
                return response.text.strip()
            raise GeminiServiceError(f"Received empty response from model {model_to_use}")

        # 2. Try legacy google.generativeai
        if self._legacy_genai:
            model_kwargs = {}
            if system_instruction:
                model_kwargs["system_instruction"] = system_instruction
            model = self._legacy_genai.GenerativeModel(
                model_name=model_to_use,
                **model_kwargs
            )
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
            raise GeminiServiceError(f"Received empty response from model {model_to_use}")

        # 3. Direct REST call
        saved_model = self.model_name
        self.model_name = model_to_use
        try:
            return self._call_via_rest(prompt, system_instruction)
        finally:
            self.model_name = saved_model

    def generate_response(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Generates a text response for the given prompt.
        Attempts configured model, with automatic fallback for deprecated or overloaded models.
        """
        self._check_api_key()

        if not self._genai_client and not self._legacy_genai:
            self._init_client()

        models_to_try = [self.model_name]
        fallbacks = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
        for fb in fallbacks:
            if fb not in models_to_try:
                models_to_try.append(fb)

        last_error = None
        for candidate_model in models_to_try:
            try:
                return self._execute_with_model(candidate_model, prompt, system_instruction)
            except Exception as err:
                err_str = str(err)
                logger.warning(f"Model '{candidate_model}' attempt failed: {err_str}")
                last_error = err
                # If it's an authentication error (bad API key), no point in trying other models
                if "API_KEY_INVALID" in err_str or "API key not valid" in err_str:
                    raise GeminiServiceError(f"Invalid API Key: {err}")

        logger.error(f"All model attempts failed: {last_error}")
        raise GeminiServiceError(f"Gemini API failure: {last_error}")

    def generate_json_response(self, prompt: str, system_instruction: Optional[str] = None) -> Any:
        """
        Sends prompt to Gemini and parses the response into a structured JSON dict/list.
        Applies clean_json_block and json parsing with recovery.
        """
        enhanced_prompt = (
            prompt + "\n\nCRITICAL INSTRUCTION: Respond ONLY with valid, raw JSON. "
            "Do NOT include markdown backticks (```json), commentary, or surrounding text."
        )
        raw_text = self.generate_response(enhanced_prompt, system_instruction)
        try:
            return parse_llm_json(raw_text)
        except ValueError as err:
            logger.error(f"JSON parsing error: {err}. Raw output was: {raw_text[:250]}")
            raise GeminiServiceError(f"Failed to generate structured data from AI: {err}")


# Global singleton instance
gemini_service = GeminiService()
