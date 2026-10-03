"""
Module 2: Concept Explanation
Explains complex topics in simple, beginner-friendly language.
Implements a clean model-service abstraction:
- Preferred: LaMini-Flan-T5-783M (if transformers/torch are installed and configured)
- Graceful Fallback: Google Gemini API
"""
import os
import logging
from typing import Dict, Any, Optional, List
from services.gemini_service import gemini_service

logger = logging.getLogger("edugenie.modules.explanation")


class ModelNotAvailableError(Exception):
    """Raised when a specific model provider cannot be initialized or run."""
    pass


class LaMiniExplanationProvider:
    """
    Local model provider for MBZUAI/LaMini-Flan-T5-783M.
    Loads locally if dependencies and model weights are present.
    """
    def __init__(self, model_id: str = "MBZUAI/LaMini-Flan-T5-783M"):
        self.model_id = model_id
        self._pipeline = None
        self._is_ready = False
        self._attempt_init()

    def _attempt_init(self):
        # Only attempt if explicitly requested or local flag enabled to avoid heavy downloads by default
        enable_local = os.getenv("ENABLE_LOCAL_LAMINI", "false").lower() in ("true", "1", "yes")
        if not enable_local:
            logger.info("Local LaMini model disabled by default (ENABLE_LOCAL_LAMINI=false).")
            return

        try:
            from transformers import pipeline
            logger.info(f"Attempting to load local explanation model: {self.model_id}...")
            self._pipeline = pipeline("text2text-generation", model=self.model_id, max_length=512)
            self._is_ready = True
            logger.info("LaMini-Flan-T5-783M model loaded successfully.")
        except Exception as e:
            logger.warning(f"LaMini-Flan-T5-783M could not be initialized: {e}. Fallback to Gemini will be used.")
            self._is_ready = False

    def is_available(self) -> bool:
        return self._is_ready and self._pipeline is not None

    def explain(self, topic: str) -> str:
        if not self.is_available():
            raise ModelNotAvailableError("LaMini model is not initialized or available.")
        prompt = f"Explain the concept of '{topic}' in simple, beginner-friendly words with an example."
        result = self._pipeline(prompt)
        if result and len(result) > 0:
            return result[0].get("generated_text", "").strip()
        raise ModelNotAvailableError("LaMini produced an empty output.")


class GeminiExplanationProvider:
    """
    Fallback explanation provider using Google Gemini.
    Generates structured 5-part educational explanations.
    """
    def explain_structured(self, topic: str, subject: str = None, difficulty: str = None) -> Dict[str, Any]:
        context_note = ""
        if subject and subject.strip() and subject.strip().lower() != "general / any":
            context_note += f" in the context of {subject.strip()}"
        diff_str = difficulty.strip() if difficulty and difficulty.strip() else "beginner"

        prompt = f"""You are an elite educational tutor. Explain the academic topic "{topic}"{context_note} to a {diff_str} student.

Break down the concept into these exact 5 educational sections and return ONLY a valid JSON object matching this schema:
{{
  "definition": "A 1-2 sentence simple definition of what {topic} is in plain English.",
  "how_it_works": "Clear step-by-step breakdown of how the concept works, its core mechanics, or logic.",
  "example": "A concrete real-world analogy or practical example demonstrating the concept in action.",
  "key_points": [
    "Core point 1",
    "Core point 2",
    "Core point 3"
  ],
  "remember": "A memorable pro-tip, mnemonic, or golden rule to easily remember this concept."
}}
"""
        system_instruction = (
            "You are EduGenie's concept simplifier. Your specialty is taking complex or intimidating "
            "topics and making them intuitive, structured, and easy to grasp for students."
        )

        try:
            data = gemini_service.generate_json_response(prompt, system_instruction)
            if isinstance(data, dict) and "definition" in data:
                return data
        except Exception as err:
            logger.warning(f"Structured explanation JSON parse failed: {err}. Attempting text generation fallback.")

        # Fallback to plain text generation if JSON parsing failed
        text_prompt = (
            f"Explain '{topic}'{context_note} in simple language for {diff_str} students. Include:\n"
            "1. Simple Definition\n"
            "2. How It Works\n"
            "3. Real-world Example\n"
            "4. Key Points\n"
            "5. Remember This"
        )
        raw_text = gemini_service.generate_response(text_prompt, system_instruction)
        return {
            "definition": f"Overview of {topic}",
            "how_it_works": raw_text,
            "example": "See detailed breakdown above.",
            "key_points": [f"Understanding the fundamentals of {topic}"],
            "remember": f"Master the core foundations of {topic} through continuous practice."
        }


# Singleton service orchestrating provider selection
class ExplanationService:
    def __init__(self):
        self.lamini_provider = LaMiniExplanationProvider()
        self.gemini_provider = GeminiExplanationProvider()

    def explain(self, topic: str, subject: str = None, difficulty: str = None) -> Dict[str, Any]:
        """
        Explains a topic. Tries preferred LaMini model first, falls back to Gemini.
        Returns both full 'explanation' text and 'structured' cards.
        """
        if not topic or not topic.strip():
            raise ValueError("Topic cannot be empty.")

        topic_clean = topic.strip()
        model_used = "gemini"

        # 1. Try preferred LaMini local model if available
        if self.lamini_provider.is_available():
            try:
                local_explanation = self.lamini_provider.explain(topic_clean)
                return {
                    "topic": topic_clean,
                    "explanation": local_explanation,
                    "model_used": "LaMini-Flan-T5-783M",
                    "structured": {
                        "definition": f"Overview of {topic_clean}",
                        "how_it_works": local_explanation,
                        "example": "Practical application of the topic.",
                        "key_points": [local_explanation[:100] + "..."],
                        "remember": f"Remember to practice {topic_clean} regularly."
                    }
                }
            except Exception as e:
                logger.warning(f"LaMini inference failed, falling back to Gemini: {e}")

        # 2. Graceful Fallback: Gemini provider
        structured_data = self.gemini_provider.explain_structured(topic_clean, subject, difficulty)
        
        # Build comprehensive markdown explanation string
        key_points_formatted = "\n".join([f"- {kp}" for kp in structured_data.get("key_points", [])])
        formatted_explanation = (
            f"### Simple Definition\n{structured_data.get('definition', '')}\n\n"
            f"### How It Works\n{structured_data.get('how_it_works', '')}\n\n"
            f"### Real-World Example\n{structured_data.get('example', '')}\n\n"
            f"### Key Points\n{key_points_formatted}\n\n"
            f"### Remember This\n💡 {structured_data.get('remember', '')}"
        )

        return {
            "topic": topic_clean,
            "explanation": formatted_explanation,
            "structured": structured_data,
            "model_used": "gemini-fallback"
        }


explanation_service = ExplanationService()


def explain_concept(topic: str, subject: str = None, difficulty: str = None) -> Dict[str, Any]:
    """Public helper function for concept explanation."""
    return explanation_service.explain(topic, subject, difficulty)
