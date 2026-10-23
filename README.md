# Mindcast — Mental Health Wellbeing Estimator

Mindcast is a FastAPI web application that estimates a student's mental health score from daily habits, social-media usage, academic information, and stress level. The application includes a browser-based assessment page and a trained machine-learning model packaged as `Mental_Health_Model.pkl`.

> **Important:** This project provides an educational estimate, not a medical diagnosis or professional mental-health assessment.

## Features

- Interactive web interface for submitting a student wellbeing assessment.
- FastAPI backend with automatic request validation through Pydantic.
- Machine-learning prediction endpoint at `POST /predict`.
- Static frontend served from the `static/` directory.
- Swagger API documentation at `/docs` when the server is running.

## Project structure

```text
.
├── main.py                                  # FastAPI application and prediction endpoint
├── Mental_Health_Model.pkl                  # Trained model loaded at startup
├── Student Social Media And Mental Health Impact.csv
├── requirements.txt                          # Python dependencies
├── README.md
└── static/
    ├── index.html                            # Web interface
    ├── script.js                             # Frontend behavior and API calls
    └── style.css                             # Frontend styles
```

## Requirements

- Python 3.9 or newer
- pip

Install the dependencies from the project directory:

```bash
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install packages:

```bash
python -m pip install -r requirements.txt
```

## Run locally

Start the development server:

```bash
uvicorn main:app --reload
```

Open the application at http://127.0.0.1:8000. The interactive API documentation is available at http://127.0.0.1:8000/docs.

## API

### `GET /`

Returns the Mindcast web interface.

### `POST /predict`

Accepts a JSON assessment and returns an estimated mental health score.

Example request:

```json
{
  "age": 21,
  "gender": "Male",
  "country": "India",
  "academic_level": "Undergraduate",
  "most_used_platform": "YouTube",
  "purpose_of_use": "Education",
  "avg_daily_usage_hours": 4.5,
  "daily_unlocks": 50,
  "study_hours": 6,
  "physical_activity_hours": 1,
  "sleep_hours_per_night": 7,
  "stress_level": "Medium"
}
```

Example response:

```json
{
  "predicted_mental_health_score": 7
}
```

The API validates age and numeric ranges, as well as the accepted values for gender, academic level, platform, purpose, and stress level. Invalid requests return a validation error.

## Using the dataset

The CSV file contains the student survey data used during the machine-learning workflow. The running API does not train the model; it loads the already-trained `Mental_Health_Model.pkl` file when `main.py` starts.

## Notes for deployment

- Keep `Mental_Health_Model.pkl` in the same directory as `main.py`.
- Keep the `static/` directory beside `main.py` so the frontend can be served correctly.
- Configure `allow_origins` in `main.py` for the specific frontend domains used in production instead of allowing all origins.
- Do not treat predictions as clinical conclusions; direct users to qualified mental-health professionals when appropriate.

## License

No license is currently specified for this project. Add a license file before distributing or deploying it publicly.
