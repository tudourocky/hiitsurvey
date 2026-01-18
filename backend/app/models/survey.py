"""Survey-related Pydantic models"""
from typing import List, Optional, Literal
from pydantic import BaseModel


class SurveyQuestion(BaseModel):
    """Survey question model for workout generation"""
    id: str
    question: str
    type: Literal["multiple_choice", "short_answer"]
    options: Optional[List[str]] = None  # Only for multiple_choice


class SurveyOption(BaseModel):
    """Survey option model"""
    id: str
    text: str


class SurveyQuestionDetail(BaseModel):
    """Detailed survey question from SurveyMonkey API"""
    id: str
    heading: str
    type: str  # e.g., "multiple_choice", "open_ended"
    options: Optional[List[SurveyOption]] = None


class Survey(BaseModel):
    """Survey model from SurveyMonkey API"""
    id: str
    title: str
    questions: List[SurveyQuestionDetail]
    icon: Optional[str] = None  # Cached icon generated from OpenAI


class SurveyListResponse(BaseModel):
    """Response model for list of surveys"""
    surveys: List[Survey]
    total: int


class CreateSurveyRequest(BaseModel):
    """Request model for creating a survey"""
    title: str
    questions: List[SurveyQuestionDetail]


class Mission(BaseModel):
    """Mission model mapped from survey"""
    id: str
    title: str
    artist: str
    icon: str
    color: str
    survey_id: str


class MissionListResponse(BaseModel):
    """Response model for list of missions"""
    missions: List[Mission]
    total: int
