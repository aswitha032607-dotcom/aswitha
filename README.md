# EduGenie – AI Learning Assistant 🎓✨
> **"Learn Smarter. Understand Faster."**

EduGenie is a modern, responsive full-stack educational AI assistant designed for students and self-learners. Powered by Google Gemini and FastAPI, EduGenie transforms complex academic material into clear, retainable, and actionable insights.

---

## 🌟 Key Features

## 🌟 Key Pages & Features

1. **Home (`/`)**
   - Clean landing page with hero overview, real localStorage study statistics (Questions, Quizzes, Topics, Streak), and 5 feature cards navigating to dedicated pages.
2. **Ask AI (`/ask-ai`)**
   - Academic Q&A tutor supporting any subject domain, difficulty level, and Markdown rendering with key takeaways.
3. **Concept Explanation (`/explain`)**
   - 5 structured study cards: Simple Definition, How It Works, Real-World Example, Key Points, and Remember This.
4. **Interactive Quiz (`/quiz`)**
   - 4-option MCQ player with Previous/Next navigation, progress bar, real-time score calculation, answer breakdown review with explanations, and localStorage score saving.
5. **Educational Summarizer (`/summarize`)**
   - Two-panel desktop split view (Your Content vs AI Summary) with live character counters and reduction percentage analytics.
6. **Learning Path (`/learning-path`)**
   - Multi-stage visual roadmaps with timelines, concept tags, practice projects, and non-fabricated study resource suggestions.
7. **Learning History (`/history`)**
   - Stored study archive categorized by Questions, Explanations, Quizzes, Summaries, and Roadmaps with a clear-history confirmation modal.
8. **Student Progress (`/progress`)**
   - Dashboard with 6 metric cards, quiz accuracy meter, topics explored tag cloud, and recent study activity timeline.

---

## 🏗️ Architecture & Technology Stack

```
EduGenie/
├── main.py                    # FastAPI app, routing, and Pydantic models
├── requirements.txt           # Python dependencies
├── .env                       # Local environment variables
├── .env.example               # Example configuration template
├── README.md                  # Complete documentation
│
├── modules/                   # 5 Independent educational AI modules
│   ├── __init__.py
│   ├── qna.py                 # Academic Q&A module
│   ├── explanation_module.py  # Concept explanation with LaMini/Gemini fallback
│   ├── quiz_module.py         # MCQ generator with validation & recovery
│   ├── summary_module.py      # Passage summarizer with metrics
│   └── learning_path.py       # Multi-stage learning roadmap generator
│
├── services/                  # External service integrations
│   ├── __init__.py
│   └── gemini_service.py      # Resilient Gemini integration (SDK + REST fallback)
│
├── utils/                     # Utility helpers
│   ├── __init__.py
│   └── json_utils.py          # Markdown fence cleanup & JSON parser
│
├── templates/                 # Jinja2 multi-page templates
│   ├── base.html              # Shared layout, navbar, footer, modals
│   ├── index.html             # Home page (/)
│   ├── ask_ai.html            # Ask AI page (/ask-ai)
│   ├── explain.html           # Explain page (/explain)
│   ├── quiz.html              # Quiz generator page (/quiz)
│   ├── summarize.html         # Summarize page (/summarize)
│   ├── learning_path.html     # Learning Path page (/learning-path)
│   ├── history.html           # History archive page (/history)
│   └── progress.html          # Student Progress dashboard (/progress)
│
└── static/
    ├── style.css              # Custom responsive stylesheet
    ├── script.js              # Multi-page controllers & localStorage tracker
    └── assets/
        └── logo.svg           # EduGenie vector brand logo
```

---

## 📡 Dedicated Page & API Routes

| Page / Route | HTTP Method | Type | Description |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Page | Home landing & quick stats dashboard |
| `/ask-ai` | `GET` | Page | Dedicated Ask AI tutor interface |
| `/explain` | `GET` | Page | Dedicated Concept Explanation interface |
| `/quiz` | `GET` | Page | Dedicated Interactive Quiz interface |
| `/summarize` | `GET` | Page | Dedicated Summarization interface |
| `/learning-path` | `GET` | Page | Dedicated Learning Path interface |
| `/history` | `GET` | Page | Dedicated Learning History archive |
| `/progress` | `GET` | Page | Dedicated Student Progress dashboard |
| `/health` | `GET` | API | System health check (`{"status": "ok"}`) |
| `/api/config-status`| `GET` | API | AI service readiness status |
| `/qa` | `POST` | API | Academic Q&A endpoint |
| `/explain` | `POST` | API | Concept explanation endpoint |
| `/quiz` | `POST` | API | Quiz generation endpoint |
| `/summarize` | `POST` | API | Text summarization endpoint |
| `/learn/recommendations` | `POST` | API | Learning roadmap endpoint |

### Frontend
- **HTML5 & CSS3**: Custom modern design with glassmorphism, responsive grid, and fluid typography.
- **Vanilla JavaScript**: Lightweight, asynchronous communication using the `fetch()` API with zero heavy frontend framework dependencies.

---

## 🚀 Quick Start Guide

### 1. Clone or Open the Project
Open the `EDU GENIE` folder in VS Code or your preferred terminal:
```bash
cd "c:\Users\jawagar\OneDrive\Desktop\EDU GENIE"
```

### 2. (Optional) Create and Activate Virtual Environment
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows:
venv\Scripts\activate

# Activate on macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Your Gemini API Key
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Open the `.env` file in the project root:
```env
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyHere
GEMINI_MODEL=gemini-1.5-pro
```
*(Note: Never commit your `.env` file to Git. It is already added to `.gitignore`.)*

### 5. Start the Application
Run Uvicorn from the project directory:
```bash
uvicorn main:app --reload
```

### 6. Open in Browser
Visit:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Request Body Example |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Serves web dashboard | None |
| `GET` | `/health` | Health check endpoint | None |
| `GET` | `/api/config-status` | AI service readiness status | None |
| `POST` | `/qa` | Academic question answering | `{"question": "What is TCP?"}` |
| `POST` | `/explain` | Beginner concept explanation | `{"topic": "Pythagoras Theorem"}` |
| `POST` | `/quiz` | Generates exactly 3 MCQs | `{"text": "Photosynthesis passage..."}` |
| `POST` | `/summarize` | Summarizes text + metrics | `{"text": "Long educational text..."}` |
| `POST` | `/learn/recommendations` | Builds visual learning roadmap | `{"topic": "SQL", "level": "Beginner"}` |

---

## 🧪 Testing the Endpoints via Curl or Swagger

FastAPI includes automatic interactive documentation at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Example Curl Requests:

**Health Check:**
```bash
curl -X GET http://127.0.0.1:8000/health
```

**Q&A:**
```bash
curl -X POST http://127.0.0.1:8000/qa \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the Doppler Effect?"}'
```

**Explain Topic:**
```bash
curl -X POST http://127.0.0.1:8000/explain \
  -H "Content-Type: application/json" \
  -d '{"topic": "Recursion in Computer Science"}'
```

---

## 🛠️ Troubleshooting & Tips

- **Missing API Key Warning (`503 Service Unavailable`)**:
  - Ensure `GEMINI_API_KEY` in `.env` is set to your actual key and does not contain `your_api_key_here`.
- **Model Configuration**:
  - The default model is `gemini-1.5-pro`. You can switch to `gemini-2.5-flash` in `.env` for faster responses if desired.
- **LaMini Model Execution**:
  - The architecture includes a clean model abstraction. By default, `ENABLE_LOCAL_LAMINI=false` is set in `.env` to prevent downloading 3GB of model weights, automatically routing explanations to Gemini. If you have PyTorch and Transformers installed and wish to test the local model, set `ENABLE_LOCAL_LAMINI=true`.

---

## 🔮 Future-Ready Architecture

EduGenie is structured modularly to easily integrate future capabilities:
- Voice input / speech synthesis
- Multilingual learning support
- Student authentication and cloud progress tracking
- Badges and learning streak gamification
- PDF and document uploads for quiz and summary generation
- LMS integrations (Google Classroom, Moodle)

---

## 📜 License
Developed for educational excellence. MIT License.
