"""Survey router"""
from fastapi import APIRouter, HTTPException
from app.models.survey import Survey, SurveyListResponse, CreateSurveyRequest
from app.services.survey_service import survey_service

router = APIRouter()


@router.get("/surveys", response_model=SurveyListResponse)
async def get_surveys():
    """
    Fetch surveys from Survey Monkey API.
    Returns surveys in the format matching SurveyMonkey's response structure.
    """
    try:
        return await survey_service.get_surveys()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching surveys: {str(e)}")


@router.post("/surveys", response_model=Survey, status_code=201)
def create_survey(request: CreateSurveyRequest):
    """
    Create a new survey.
    Returns the created survey with a generated ID.
    """
    try:
        survey = survey_service.create_survey(
            title=request.title,
            questions=request.questions
        )
        return survey
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating survey: {str(e)}")


@router.get("/surveys/{survey_id}", response_model=Survey)
async def get_survey(survey_id: str):
    """
    Get a specific survey by ID from Survey Monkey.
    Returns survey in the format matching SurveyMonkey's response structure.
    """
    try:
        return await survey_service.get_survey(survey_id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching survey: {str(e)}")
