# Backend Structure

This backend follows FastAPI best practices with a modular architecture.

## Directory Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app initialization
│   ├── config.py            # Configuration and environment variables
│   ├── models/              # Pydantic models
│   │   ├── __init__.py
│   │   ├── survey.py        # Survey-related models
│   │   └── workout.py       # Workout-related models
│   ├── routers/             # API route handlers
│   │   ├── __init__.py
│   │   ├── health.py        # Health check endpoints
│   │   ├── exercise.py      # Exercise detection endpoints
│   │   ├── workout.py       # Workout generation endpoints
│   │   └── survey.py        # Survey endpoints
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── pose_detection.py      # MediaPipe pose detection
│   │   ├── exercise_detection.py  # Exercise detection algorithms
│   │   ├── workout_generation.py   # Workout generation logic
│   │   └── survey_service.py      # SurveyMonkey API integration
│   └── utils/               # Utility functions
│       ├── __init__.py
│       ├── constants.py     # Constants (PoseLandmark indices)
│       └── geometry.py       # Geometry calculations
├── main.py                  # Entry point (imports from app.main)
├── requirements.txt
└── pose_landmarker_full.task # MediaPipe model file
```

## Running the Application

### Development
```bash
# From the backend directory
uvicorn app.main:app --reload

# Or using the entry point (backward compatible)
uvicorn main:app --reload
```

### Production
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Architecture Overview

### Models (`app/models/`)
- **Pydantic models** for request/response validation
- Separated by domain (survey, workout)
- Forward references properly resolved

### Routers (`app/routers/`)
- **API endpoints** organized by feature
- Thin controllers that delegate to services
- Use dependency injection for services

### Services (`app/services/`)
- **Business logic** and external API integrations
- Singleton pattern for shared state (exercise detection, pose detection)
- Stateless where possible

### Utils (`app/utils/`)
- **Pure utility functions** (geometry, constants)
- No business logic
- Reusable across services

### Config (`app/config.py`)
- **Environment variables** and configuration
- Centralized settings management

## Key Features

1. **Modular Design**: Each component has a single responsibility
2. **Separation of Concerns**: Routes, services, and models are clearly separated
3. **Testability**: Services can be easily mocked for testing
4. **Maintainability**: Changes to one module don't affect others
5. **Scalability**: Easy to add new features by adding new routers/services

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `POST /api/process-frame` - Process video frame for exercise detection
- `POST /api/reset-counters` - Reset exercise counters
- `GET /api/counters` - Get current exercise counters
- `POST /api/generate-workout` - Generate workout plan
- `GET /api/surveys` - Get list of surveys
- `GET /api/surveys/{survey_id}` - Get specific survey
