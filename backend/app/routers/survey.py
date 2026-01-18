"""Survey router"""
from fastapi import APIRouter, HTTPException
from app.models.survey import (
    Survey, SurveyListResponse, CreateSurveyRequest, MissionListResponse,
    SubmitSurveyResponseRequest, SubmitSurveyResponseResponse
)
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
async def create_survey(request: CreateSurveyRequest):
    """
    Create a new survey.
    If SURVEYMONKEY_TOKEN is configured, creates the survey in SurveyMonkey (persistent).
    Otherwise, stores in memory and MongoDB (persistent).
    """
    try:
        survey = await survey_service.create_survey(
            title=request.title,
            questions=request.questions
        )
        return survey
    except Exception as e:
        error_msg = str(e)
        # Provide more helpful error messages
        if "401" in error_msg or "Unauthorized" in error_msg:
            raise HTTPException(
                status_code=401, 
                detail="SurveyMonkey authentication failed. Check your SURVEYMONKEY_ACCESS_TOKEN. Survey created in memory only."
            )
        elif "403" in error_msg or "Forbidden" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="SurveyMonkey access forbidden. Check your API permissions. Survey created in memory only."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Error creating survey: {str(e)}")


@router.get("/missions", response_model=MissionListResponse)
async def get_missions():
    """
    Get missions mapped from surveys.
    Returns missions in the format expected by the frontend.
    """
    try:
        return await survey_service.get_missions_async()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching missions: {str(e)}")


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


@router.get("/surveys/config/status")
def get_survey_config_status():
    """
    Check SurveyMonkey API configuration status.
    Useful for debugging why surveys aren't persisting.
    """
    from app.config import SURVEYMONKEY_TOKEN, SURVEYMONKEY_BASE_URL
    import httpx
    
    status = {
        "token_configured": bool(SURVEYMONKEY_TOKEN),
        "token_length": len(SURVEYMONKEY_TOKEN) if SURVEYMONKEY_TOKEN else 0,
        "base_url": SURVEYMONKEY_BASE_URL,
        "api_accessible": False,
        "error": None
    }
    
    if SURVEYMONKEY_TOKEN:
        try:
            # Try a simple API call to verify token works
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{SURVEYMONKEY_BASE_URL}/users/me",
                    headers={
                        "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                        "Content-Type": "application/json"
                    }
                )
                if response.status_code == 200:
                    status["api_accessible"] = True
                    user_data = response.json()
                    status["user"] = user_data.get("username", "Unknown")
                else:
                    status["error"] = f"API returned status {response.status_code}: {response.text}"
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                status["error"] = "Authentication failed - token may be expired or invalid"
            elif e.response.status_code == 403:
                status["error"] = "Access forbidden - check API permissions/scopes"
            else:
                status["error"] = f"HTTP {e.response.status_code}: {e.response.text}"
        except Exception as e:
            status["error"] = f"Connection error: {str(e)}"
    else:
        status["error"] = "SURVEYMONKEY_ACCESS_TOKEN not configured in environment"
    
    return status


@router.post("/surveys/{survey_id}/responses", response_model=SubmitSurveyResponseResponse)
async def submit_survey_response(survey_id: str, request: SubmitSurveyResponseRequest):
    """
    Submit survey responses to SurveyMonkey.
    The survey_id in the path must match the survey_id in the request body.
    """
    if request.survey_id != survey_id:
        raise HTTPException(
            status_code=400,
            detail="Survey ID in path does not match survey ID in request body"
        )
    
    try:
        # Convert answers to list of dicts for the service method
        answers_list = [
            {"question_id": answer.question_id, "answer": answer.answer}
            for answer in request.answers
        ]
        
        result = await survey_service.submit_survey_response(
            survey_id=survey_id,
            answers=answers_list
        )
        
        return SubmitSurveyResponseResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error submitting survey response: {str(e)}"
        )
