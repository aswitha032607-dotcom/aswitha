"""
Module 5: Personalized Learning Path Generator
Generates structured educational roadmaps from beginner to advanced levels,
complete with stages, concepts, practice projects, timeline, and curated resource suggestions.
"""
import logging
from typing import Dict, Any, List
from services.gemini_service import gemini_service
from utils.json_utils import clean_json_block, parse_llm_json

logger = logging.getLogger("edugenie.modules.learning_path")

LEARNING_PATH_SYSTEM_INSTRUCTION = (
    "You are EduGenie's Curriculum Architect and Career Mentor. "
    "Your mission is to map out comprehensive, realistic, and inspiring learning journeys "
    "for students and self-learners covering topics from foundational basics to industry-grade advanced mastery."
)


def generate_learning_path(topic: str, level: str = "Beginner", goal: str = None) -> Dict[str, Any]:
    """
    Generates a structured learning path from beginner to advanced level for the requested topic.
    Returns structured JSON with overview, timeline, stage cards, practice suggestions, and resources.
    """
    if not topic or not topic.strip():
        raise ValueError("Topic cannot be empty.")

    cleaned_topic = topic.strip()
    cleaned_level = level.strip().capitalize() if level and level.strip() else "Beginner"
    goal_note = f"\nLearner's Primary Goal / Target: {goal.strip()}" if goal and goal.strip() else ""

    prompt = f"""Design an in-depth, structured learning roadmap for mastering "{cleaned_topic}".
The learner's current starting proficiency level is: {cleaned_level}.{goal_note}

CRITICAL REQUIREMENTS:
1. Provide a realistic overall timeline estimate (e.g., "8 - 12 Weeks (5-8 hrs/week)").
2. Provide a 2-3 sentence overview of what {cleaned_topic} is and why mastering it matters.
3. Structure the roadmap into 3 or 4 progressive stages (e.g., Stage 1: Foundations & Fundamentals, Stage 2: Intermediate Core Concepts, Stage 3: Advanced Topics & Architecture, Stage 4: Capstone Projects & Mastery).
4. For each stage, include:
   - "stage_name": Name of the stage (e.g., "Stage 1: Beginner Foundations")
   - "badge": Short tier tag ("Beginner", "Intermediate", "Advanced", or "Mastery")
   - "estimated_time": Time needed (e.g., "2 - 3 Weeks")
   - "concepts": Array of 3-5 core concepts/skills taught in this stage
   - "practice_tasks": Array of 2-3 hands-on practical exercises or mini-projects
   - "resources": Object containing non-fabricated recommendations for:
       - "books": list of standard recognized book titles or authors (e.g. "O'Reilly Learning SQL")
       - "documentation": official reference or docs (e.g. "PostgreSQL Official Documentation")
       - "video_topics": recommended search queries for YouTube/tutorials
       - "articles": reputable platforms or blogs
5. Provide actionable "next_steps" for what the student should do today.
6. Return ONLY valid JSON matching this schema:

{{
  "topic": "{cleaned_topic}",
  "level": "{cleaned_level}",
  "overview": "Comprehensive overview text here...",
  "recommended_timeline": "Estimated completion timeline...",
  "stages": [
    {{
      "stage_name": "Stage 1: Foundations",
      "badge": "Beginner",
      "estimated_time": "2-3 Weeks",
      "concepts": ["Concept 1", "Concept 2", "Concept 3"],
      "practice_tasks": ["Mini project 1", "Exercise 2"],
      "resources": {{
        "books": ["Recommended classic book title"],
        "documentation": ["Official documentation guide"],
        "video_topics": ["Suggested tutorial search topics"],
        "articles": ["Recommended publication topics"]
      }}
    }}
  ],
  "next_steps": [
    "Step 1: Set up your environment...",
    "Step 2: Complete the first hello-world module..."
  ]
}}
"""
    raw_response = gemini_service.generate_response(prompt, LEARNING_PATH_SYSTEM_INSTRUCTION)

    try:
        data = parse_llm_json(raw_response)
        if isinstance(data, dict) and "stages" in data:
            return data
    except Exception as err:
        logger.warning(f"Structured learning path parse failed: {err}. Attempting recovery.")
        try:
            cleaned = clean_json_block(raw_response)
            data = parse_llm_json(cleaned)
            if isinstance(data, dict):
                return data
        except Exception as second_err:
            logger.error(f"Fallback learning path parse failed: {second_err}")

    # Fallback structured response if JSON parsing completely failed
    return {
        "topic": cleaned_topic,
        "level": cleaned_level,
        "overview": f"A structured educational roadmap for mastering {cleaned_topic} from foundational fundamentals to advanced mastery.",
        "recommended_timeline": "6 to 10 Weeks",
        "stages": [
            {
                "stage_name": "Stage 1: Beginner Foundations",
                "badge": "Beginner",
                "estimated_time": "2 Weeks",
                "concepts": [f"Introduction to {cleaned_topic}", "Core syntax and fundamentals", "Basic problem solving"],
                "practice_tasks": ["Build a simple starter exercise", "Write notes on core definitions"],
                "resources": {
                    "books": [f"Foundations of {cleaned_topic}"],
                    "documentation": [f"Official {cleaned_topic} Getting Started Guide"],
                    "video_topics": [f"{cleaned_topic} crash course for beginners"],
                    "articles": ["Getting started tutorials on Medium and dev.to"]
                }
            },
            {
                "stage_name": "Stage 2: Intermediate Deep Dive",
                "badge": "Intermediate",
                "estimated_time": "3 Weeks",
                "concepts": ["Design patterns and idioms", "Data structures and algorithms", "Integration techniques"],
                "practice_tasks": ["Build an intermediate application", "Solve practical domain problems"],
                "resources": {
                    "books": [f"Effective {cleaned_topic}"],
                    "documentation": [f"{cleaned_topic} Standard Library Reference"],
                    "video_topics": [f"Intermediate {cleaned_topic} walkthroughs"],
                    "articles": ["Architectural patterns and best practices"]
                }
            },
            {
                "stage_name": "Stage 3: Advanced Mastery & Projects",
                "badge": "Advanced",
                "estimated_time": "3-4 Weeks",
                "concepts": ["Performance optimization", "Production deployment & security", "System design"],
                "practice_tasks": ["Build a complete production-grade capstone project", "Conduct peer code reviews"],
                "resources": {
                    "books": [f"Mastering {cleaned_topic} in Production"],
                    "documentation": [f"{cleaned_topic} Advanced Specification & RFCs"],
                    "video_topics": [f"Advanced {cleaned_topic} engineering case studies"],
                    "articles": ["High performance tuning and architecture"]
                }
            }
        ],
        "next_steps": [
            f"Step 1: Set up your workspace and development tools for {cleaned_topic}.",
            "Step 2: Dedicate 30 minutes daily to consistent hands-on exercises.",
            "Step 3: Build real projects rather than only watching tutorials."
        ]
    }
