"""Survey router"""
from fastapi import APIRouter, HTTPException
from app.models.survey import Survey, SurveyListResponse
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
