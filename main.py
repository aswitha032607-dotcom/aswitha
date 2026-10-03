"""
EduGenie – AI Learning Assistant
Main FastAPI Application Entrypoint

Serves:
- Jinja2 UI at GET /
- Health check at GET /health
- Static assets at /static
- Learning Assistant REST endpoints:
  - POST /qa
  - POST /explain
  - POST /quiz
  - POST /summarize
  - POST /learn/recommendations
"""
import os
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

from services.gemini_service import (
    gemini_service,
    GeminiConfigurationError,
    GeminiServiceError
)
from modules.qna import answer_question
from modules.explanation_module import explain_concept
from modules.quiz_module import generate_quiz
from modules.summary_module import summarize_text
from modules.learning_path import generate_learning_path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edugenie.main")

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Initialize FastAPI application
app = FastAPI(
    title="EduGenie – AI Learning Assistant",
    description="A modern, lightweight educational AI companion for students and self-learners.",
    version="1.0.0"
)

# CORS Middleware (allows safe local development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files and Templates
static_dir = BASE_DIR / "static"
templates_dir = BASE_DIR / "templates"

static_dir.mkdir(exist_ok=True)
(static_dir / "assets").mkdir(parents=True, exist_ok=True)
templates_dir.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(templates_dir))


# ============================================================================
# Pydantic Request Models
# ============================================================================

class QARequest(BaseModel):
    question: str = Field(..., description="Academic question to be answered by EduGenie")
    subject: Optional[str] = Field(None, description="Optional subject or academic domain")
    difficulty: Optional[str] = Field(None, description="Optional learner difficulty level")

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Question cannot be empty.")
        if len(cleaned) < 2:
            raise ValueError("Question is too short.")
        return cleaned


class ExplainRequest(BaseModel):
    topic: str = Field(..., description="Concept or topic to explain in simple terms")
    subject: Optional[str] = Field(None, description="Optional academic subject")
    difficulty: Optional[str] = Field(None, description="Optional difficulty: Beginner, Intermediate, Advanced")

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Topic cannot be empty.")
        return cleaned


class QuizRequest(BaseModel):
    text: str = Field(..., description="Topic or educational text to generate quiz questions from")
    subject: Optional[str] = Field(None, description="Optional subject category")
    difficulty: Optional[str] = Field(None, description="Optional difficulty level")
    num_questions: Optional[int] = Field(3, description="Number of questions to generate (default 3)")

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Content for quiz cannot be empty.")
        return cleaned


class SummaryRequest(BaseModel):
    text: str = Field(..., description="Passage or notes to summarize")

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Text for summary cannot be empty.")
        return cleaned


class LearningPathRequest(BaseModel):
    topic: str = Field(..., description="Subject or skill for the roadmap")
    level: Optional[str] = Field("Beginner", description="Learner proficiency: Beginner, Intermediate, or Advanced")
    goal: Optional[str] = Field(None, description="Learner primary goal or focus")

    @field_validator("topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Learning topic cannot be empty.")
        return cleaned


# ============================================================================
# Exception Handlers
# ============================================================================

@app.exception_handler(GeminiConfigurationError)
async def handle_gemini_config_error(request: Request, exc: GeminiConfigurationError):
    logger.error(f"Configuration error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "API Key Not Configured",
            "message": "EduGenie requires a Google Gemini API Key. Please add GEMINI_API_KEY to your .env file."
        }
    )


@app.exception_handler(GeminiServiceError)
async def handle_gemini_service_error(request: Request, exc: GeminiServiceError):
    logger.error(f"AI Service error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "AI Generation Error",
            "message": "EduGenie couldn't generate a response right now. Please try again in a few moments."
        }
    )


# ============================================================================
# Template Page Routes (Multi-Page Architecture)
# ============================================================================

def _template_context(request: Request, active_page: str, title: str) -> Dict[str, Any]:
    return {
        "request": request,
        "active_page": active_page,
        "page_title": title,
        "api_configured": gemini_service.is_configured(),
        "gemini_model": gemini_service.model_name
    }


@app.get("/", response_class=HTMLResponse)
async def serve_home(request: Request):
    """Serves the main EduGenie home landing page."""
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context=_template_context(request, "home", "Home")
    )


@app.get("/ask-ai", response_class=HTMLResponse)
async def serve_ask_ai(request: Request):
    """Serves dedicated Ask AI page."""
    return templates.TemplateResponse(
        request=request,
        name="ask_ai.html",
        context=_template_context(request, "ask_ai", "Ask AI")
    )


@app.get("/explain", response_class=HTMLResponse)
async def serve_explain_page(request: Request):
    """Serves dedicated Concept Explanation page."""
    return templates.TemplateResponse(
        request=request,
        name="explain.html",
        context=_template_context(request, "explain", "Explain Concept")
    )


@app.get("/quiz", response_class=HTMLResponse)
async def serve_quiz_page(request: Request):
    """Serves dedicated Interactive Quiz page."""
    return templates.TemplateResponse(
        request=request,
        name="quiz.html",
        context=_template_context(request, "quiz", "Interactive Quiz")
    )


@app.get("/summarize", response_class=HTMLResponse)
async def serve_summarize_page(request: Request):
    """Serves dedicated Summarize page."""
    return templates.TemplateResponse(
        request=request,
        name="summarize.html",
        context=_template_context(request, "summarize", "Summarize")
    )


@app.get("/learning-path", response_class=HTMLResponse)
async def serve_learning_path_page(request: Request):
    """Serves dedicated Learning Path page."""
    return templates.TemplateResponse(
        request=request,
        name="learning_path.html",
        context=_template_context(request, "learning_path", "Learning Path")
    )


@app.get("/history", response_class=HTMLResponse)
async def serve_history_page(request: Request):
    """Serves dedicated Learning History page."""
    return templates.TemplateResponse(
        request=request,
        name="history.html",
        context=_template_context(request, "history", "Learning History")
    )


@app.get("/progress", response_class=HTMLResponse)
async def serve_progress_page(request: Request):
    """Serves dedicated Student Progress dashboard page."""
    return templates.TemplateResponse(
        request=request,
        name="progress.html",
        context=_template_context(request, "progress", "My Learning Progress")
    )


# ============================================================================
# Core REST API Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint required by project specification."""
    return {"status": "ok"}


@app.get("/api/config-status")
async def config_status():
    """Returns AI configuration readiness status for the frontend."""
    return {
        "status": "ok",
        "api_configured": gemini_service.is_configured(),
        "model": gemini_service.model_name
    }


@app.post("/qa")
async def endpoint_qa(payload: QARequest):
    """
    Module 1: Question Answering
    Accepts academic questions and returns concise, structured answers.
    """
    try:
        result = answer_question(payload.question, payload.subject, payload.difficulty)
        return result
    except GeminiConfigurationError:
        raise
    except GeminiServiceError:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.exception("Unexpected error in /qa endpoint")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post("/explain")
async def endpoint_explain(payload: ExplainRequest):
    """
    Module 2: Concept Explanation
    Returns structured explanation using preferred LaMini or fallback Gemini model.
    """
    try:
        result = explain_concept(payload.topic, payload.subject, payload.difficulty)
        return result
    except GeminiConfigurationError:
        raise
    except GeminiServiceError:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.exception("Unexpected error in /explain endpoint")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post("/quiz")
async def endpoint_quiz(payload: QuizRequest):
    """
    Module 3: Quiz Generator
    Generates MCQs with options, validated answer, and explanation.
    """
    try:
        result = generate_quiz(payload.text, payload.subject, payload.difficulty, payload.num_questions or 3)
        return result
    except GeminiConfigurationError:
        raise
    except GeminiServiceError:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.exception("Unexpected error in /quiz endpoint")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post("/summarize")
async def endpoint_summarize(payload: SummaryRequest):
    """
    Module 4: Summarization
    Distills educational passage into concise revision notes with character statistics.
    """
    try:
        result = summarize_text(payload.text)
        return result
    except GeminiConfigurationError:
        raise
    except GeminiServiceError:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.exception("Unexpected error in /summarize endpoint")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@app.post("/learn/recommendations")
async def endpoint_learning_path(payload: LearningPathRequest):
    """
    Module 5: Personalized Learning Path
    Generates structured roadmap from beginner to advanced with visual stages and resources.
    """
    try:
        result = generate_learning_path(payload.topic, payload.level or "Beginner", payload.goal)
        return result
    except GeminiConfigurationError:
        raise
    except GeminiServiceError:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        logger.exception("Unexpected error in /learn/recommendations endpoint")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
