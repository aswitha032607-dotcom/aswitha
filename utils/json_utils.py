"""
JSON utility functions for EduGenie.
Provides robust JSON extraction and cleanup for LLM responses.
"""
import json
import re
from typing import Any, Union


def clean_json_block(text: str) -> str:
    """
    Cleans Markdown code fences (e.g. ```json ... ```) and extracts
    the valid JSON substring from LLM generated text.
    """
    if not text:
        return ""

    cleaned = text.strip()

    # Remove markdown code fences if present: ```json ... ``` or ``` ... ```
    if cleaned.startswith("```"):
        # Match ```json or ``` at start
        cleaned = re.sub(r"^```(?:json|JSON)?\s*", "", cleaned)
        # Match trailing ```
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    # Sometimes LLMs add conversational text before or after the JSON block.
    # Find the first '{' or '[' and the last matching '}' or ']'
    first_brace = cleaned.find("{")
    first_bracket = cleaned.find("[")

    start_idx = -1
    end_idx = -1

    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        # Likely an object
        last_brace = cleaned.rfind("}")
        if last_brace != -1 and last_brace > first_brace:
            start_idx = first_brace
            end_idx = last_brace + 1
    elif first_bracket != -1:
        # Likely an array
        last_bracket = cleaned.rfind("]")
        if last_bracket != -1 and last_bracket > first_bracket:
            start_idx = first_bracket
            end_idx = last_bracket + 1

    if start_idx != -1 and end_idx != -1:
        cleaned = cleaned[start_idx:end_idx].strip()

    # Clean any trailing commas before closing braces/brackets (common LLM JSON flaw)
    cleaned = re.sub(r",\s*([\}\]])", r"\1", cleaned)

    return cleaned


def parse_llm_json(text: str) -> Union[dict, list, Any]:
    """
    Cleans and parses a JSON string returned by an LLM.
    Raises ValueError with context if parsing fails.
    """
    cleaned = clean_json_block(text)
    if not cleaned:
        raise ValueError("Empty or invalid JSON block extracted from response.")

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        # Attempt additional fallback cleanup: control characters or unescaped newlines inside strings
        try:
            # Replace unescaped raw newlines within strings
            sanitized = re.sub(r'[\r\n\t]+', ' ', cleaned)
            return json.loads(sanitized)
        except Exception:
            raise ValueError(f"Failed to parse JSON response: {exc}. Cleaned text was: {cleaned[:200]}...")
