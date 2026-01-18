"""Pydantic models for API requests and responses"""
from .survey import (
    SurveyOption,
    SurveyQuestionDetail,
    Survey,
    SurveyListResponse,
    SurveyQuestion,
    CreateSurveyRequest,
    Mission,
    MissionListResponse,
)
from .workout import (
    WorkoutPreferences,
    GenerateWorkoutRequest,
    Exercise,
    ExerciseMapping,
    WorkoutSegment,
    GeneratedWorkout,
)

# Resolve forward references after all imports
from .workout import GenerateWorkoutRequest as _GenerateWorkoutRequest
from .survey import SurveyQuestion as _SurveyQuestion

# Update the forward reference
_GenerateWorkoutRequest.model_rebuild()

__all__ = [
    "SurveyOption",
    "SurveyQuestionDetail",
    "Survey",
    "SurveyListResponse",
    "SurveyQuestion",
    "CreateSurveyRequest",
    "Mission",
    "MissionListResponse",
    "WorkoutPreferences",
    "GenerateWorkoutRequest",
    "Exercise",
    "ExerciseMapping",
    "WorkoutSegment",
    "GeneratedWorkout",
]
