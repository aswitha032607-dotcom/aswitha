"""
Module 1: Question Answering (Q&A)
Handles academic Q&A requests, providing concise, clear, and student-focused answers.
"""
from typing import Dict, Any, List
from services.gemini_service import gemini_service

QNA_SYSTEM_INSTRUCTION = (
    "You are EduGenie, an expert educational AI tutor and academic learning assistant. "
    "Your mission is to help students and self-learners understand academic and general topics with clarity and precision.\n"
    "Guidelines:\n"
    "1. Answer concisely, accurately, and in an engaging, student-friendly tone.\n"
    "2. Avoid unnecessary fluff or rambling generic chatbot responses.\n"
    "3. Structure your response logically: clearly explain what the concept is, how/why it works, provide a simple real-world analogy or example, and summarize 2-4 key takeaway bullet points.\n"
    "4. Use clear formatting with markdown headings and bullet points where helpful."
)


def answer_question(question: str, subject: str = None, difficulty: str = None) -> Dict[str, Any]:
    """
    Answers an academic or general question using Gemini educational assistant prompt.
    Returns a dictionary with the comprehensive answer and extracted summary points.
    """
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    context_prefix = ""
    if subject and subject.strip() and subject.strip().lower() != "general / any":
        context_prefix += f"Subject Domain: {subject.strip()}\n"
    if difficulty and difficulty.strip() and difficulty.strip().lower() != "any":
        context_prefix += f"Target Learner Level: {difficulty.strip()}\n"

    prompt = (
        f"{context_prefix}"
        f"Student Academic Question:\n\"{question.strip()}\"\n\n"
        "Please provide an educational response following this structure:\n"
        "### Overview\n"
        "(What it is in 1-2 clear, beginner-friendly sentences)\n\n"
        "### How It Works / Details\n"
        "(Clear explanation of mechanism, function, or context)\n\n"
        "### Real-World Example or Analogy\n"
        "(An intuitive, relatable example to make it stick)\n\n"
        "### Key Takeaways\n"
        "- Takeaway point 1\n"
        "- Takeaway point 2\n"
        "- Takeaway point 3\n"
    )

    raw_answer = gemini_service.generate_response(
        prompt=prompt,
        system_instruction=QNA_SYSTEM_INSTRUCTION
    )

    # Extract key points if present for easy UI rendering
    key_points: List[str] = []
    lines = raw_answer.split("\n")
    in_takeaways = False
    for line in lines:
        stripped = line.strip()
        if "Key Takeaway" in stripped or "Takeaways" in stripped:
            in_takeaways = True
            continue
        if in_takeaways:
            if stripped.startswith("- ") or stripped.startswith("* ") or (len(stripped) > 2 and stripped[0].isdigit() and stripped[1] in [".", ")"]):
                point = stripped.lstrip("-* 0123456789.)").strip()
                if point:
                    key_points.append(point)
            elif stripped.startswith("#"):
                in_takeaways = False

    return {
        "answer": raw_answer,
        "key_points": key_points[:5] if key_points else []
    }
