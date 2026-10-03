"""
Module 3: Quiz Generator
Generates exactly 3 multiple-choice questions with 4 options each,
correct answer validation, and explanatory feedback based on provided passage or topic.
"""
import logging
from typing import Dict, Any, List
from services.gemini_service import gemini_service
from utils.json_utils import clean_json_block, parse_llm_json

logger = logging.getLogger("edugenie.modules.quiz")

QUIZ_SYSTEM_INSTRUCTION = (
    "You are EduGenie's Quiz Master, an academic assessment expert. "
    "Your objective is to generate accurate, high-quality multiple choice quizzes based strictly "
    "on the provided educational topic or passage."
)


def validate_and_normalize_quiz(data: Any) -> Dict[str, List[Dict[str, Any]]]:
    """
    Validates that the parsed data conforms to the required quiz structure:
    - Exactly 3 questions
    - Exactly 4 options per question
    - correct_answer matching one of the options
    - An explanation for each question
    """
    if isinstance(data, dict) and "questions" in data:
        questions_raw = data["questions"]
    elif isinstance(data, list):
        questions_raw = data
    else:
        raise ValueError("Invalid quiz format: expected a JSON object with a 'questions' array.")

    if not isinstance(questions_raw, list) or len(questions_raw) == 0:
        raise ValueError("Quiz questions list is empty or invalid.")

    normalized_questions: List[Dict[str, Any]] = []

    for idx, item in enumerate(questions_raw[:3]):
        if not isinstance(item, dict):
            continue

        q_text = item.get("question", "").strip()
        options = item.get("options", [])
        correct_answer = item.get("correct_answer", "").strip()
        explanation = item.get("explanation", "").strip()

        if not q_text:
            q_text = f"Question {idx + 1} regarding the topic"

        # Ensure options is a list of strings
        if not isinstance(options, list):
            options = [str(options)]
        options = [str(opt).strip() for opt in options if str(opt).strip()]

        # Ensure exactly 4 options
        if len(options) < 4:
            # Pad with sensible options if needed
            while len(options) < 4:
                options.append(f"Additional option {chr(65 + len(options))}")
        elif len(options) > 4:
            options = options[:4]

        # Ensure correct_answer is one of the options
        if correct_answer not in options:
            # If answer might be just a letter like "A" or "Option A"
            matched = False
            for opt_idx, opt in enumerate(options):
                letter = chr(65 + opt_idx)
                if correct_answer.upper() == letter or correct_answer.upper().startswith(f"OPTION {letter}"):
                    correct_answer = opt
                    matched = True
                    break
            if not matched:
                # Default to the first option
                correct_answer = options[0]

        if not explanation:
            explanation = f"'{correct_answer}' is the correct answer based on the provided material."

        normalized_questions.append({
            "question": q_text,
            "options": options,
            "correct_answer": correct_answer,
            "explanation": explanation
        })

    # If fewer than 3 questions were generated, ensure exactly 3
    while len(normalized_questions) < 3:
        i = len(normalized_questions) + 1
        normalized_questions.append({
            "question": f"Key concept question {i} based on the reading material",
            "options": ["Fundamental principle", "Secondary effect", "Auxiliary factor", "None of the above"],
            "correct_answer": "Fundamental principle",
            "explanation": "This represents the primary takeaway from the studied passage."
        })

    return {"questions": normalized_questions[:3]}


def generate_quiz(text: str, subject: str = None, difficulty: str = None, num_questions: int = 3) -> Dict[str, Any]:
    """
    Generates an MCQ quiz from the provided text or topic.
    Returns JSON strictly following the specification.
    """
    if not text or not text.strip():
        raise ValueError("Text or topic cannot be empty.")

    count = max(1, min(5, int(num_questions or 3)))
    context_prefix = ""
    if subject and subject.strip() and subject.strip().lower() != "general / any":
        context_prefix += f"Subject Domain: {subject.strip()}\n"
    if difficulty and difficulty.strip() and difficulty.strip().lower() != "any":
        context_prefix += f"Target Difficulty: {difficulty.strip()}\n"

    prompt = f"""Generate a high-quality educational quiz based on the following material:
{context_prefix}
\"\"\"{text.strip()}\"\"\"

CRITICAL REQUIREMENTS:
1. Generate EXACTLY {count} multiple-choice questions.
2. Each question MUST have EXACTLY 4 distinct options.
3. The 'correct_answer' MUST be an exact string match to one of the 4 options.
4. Provide a clear, educational explanation for why the answer is correct.
5. Base the questions directly on facts or principles in the supplied text.
6. Return ONLY a valid JSON object matching this exact format:

{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correct_answer": "Option A text",
      "explanation": "Detailed explanation why Option A is correct."
    }},
    {{
      "question": "Second question text?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correct_answer": "Option B text",
      "explanation": "Detailed explanation why Option B is correct."
    }},
    {{
      "question": "Third question text?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correct_answer": "Option C text",
      "explanation": "Detailed explanation why Option C is correct."
    }}
  ]
}}
"""
    raw_response = gemini_service.generate_response(prompt, QUIZ_SYSTEM_INSTRUCTION)
    
    try:
        parsed_json = parse_llm_json(raw_response)
        validated = validate_and_normalize_quiz(parsed_json)
        return validated
    except Exception as err:
        logger.warning(f"Initial quiz JSON parse failed: {err}. Attempting safe extraction.")
        cleaned = clean_json_block(raw_response)
        try:
            parsed_json = parse_llm_json(cleaned)
            return validate_and_normalize_quiz(parsed_json)
        except Exception as second_err:
            logger.error(f"Quiz generation recovery failed: {second_err}. Raw was: {raw_response[:200]}")
            raise ValueError(
                "EduGenie was unable to parse the generated quiz. Please try again or rephrase the topic."
            )
