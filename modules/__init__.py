"""
EduGenie Modules Package
Exports all learning assistant modules:
- Q&A Module
- Concept Explanation Module
- Quiz Generator Module
- Summarization Module
- Personalized Learning Path Module
"""
from modules.qna import answer_question
from modules.explanation_module import explain_concept
from modules.quiz_module import generate_quiz
from modules.summary_module import summarize_text
from modules.learning_path import generate_learning_path

__all__ = [
    "answer_question",
    "explain_concept",
    "generate_quiz",
    "summarize_text",
    "generate_learning_path"
]
