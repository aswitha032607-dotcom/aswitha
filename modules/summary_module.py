"""
Module 4: Educational Summarization
Summarizes long educational passages into concise, revision-friendly notes
preserving key points and core concepts while removing redundancy.
"""
from typing import Dict, Any
from services.gemini_service import gemini_service

SUMMARY_SYSTEM_INSTRUCTION = (
    "You are EduGenie's Summarization Expert. "
    "Your objective is to distill complex, verbose educational materials into clear, high-yield revision summaries. "
    "Maintain the exact factual integrity and core concepts while eliminating fluff, repetition, and filler words."
)


def summarize_text(text: str) -> Dict[str, Any]:
    """
    Generates a concise educational summary of the input text along with character count analytics.
    """
    if not text or not text.strip():
        raise ValueError("Input text cannot be empty.")

    cleaned_input = text.strip()
    original_char_count = len(cleaned_input)

    prompt = f"""Please provide an executive revision summary of the educational text below.

Guidelines:
1. Provide a concise executive overview capturing the primary thesis/topic.
2. Outline the essential key concepts and takeaways using clear bullet points.
3. Highlight critical formulas, definitions, or insights if present.
4. Keep the output clean, highly structured, and easy to review before an exam.

Educational Passage:
\"\"\"{cleaned_input}\"\"\"
"""
    summary_text = gemini_service.generate_response(prompt, SUMMARY_SYSTEM_INSTRUCTION)
    summary_char_count = len(summary_text)

    # Calculate reduction percentage
    if original_char_count > 0:
        reduction = max(0.0, round((1.0 - (summary_char_count / original_char_count)) * 100, 1))
    else:
        reduction = 0.0

    return {
        "summary": summary_text,
        "original_characters": original_char_count,
        "summary_characters": summary_char_count,
        "reduction_percentage": reduction
    }
