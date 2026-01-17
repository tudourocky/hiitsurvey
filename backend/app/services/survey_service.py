"""Survey service for SurveyMonkey API integration"""
import httpx
import uuid
from typing import Dict, List
from app.config import SURVEYMONKEY_TOKEN, SURVEYMONKEY_BASE_URL
from app.models.survey import Survey, SurveyListResponse, SurveyQuestionDetail, Mission, MissionListResponse


class SurveyService:
    """Service for interacting with SurveyMonkey API"""
    
    def __init__(self):
        # In-memory store for created surveys
        self._surveys_store: Dict[str, Survey] = {}
    
    def transform_survey_data(self, survey_data: dict) -> dict:
        """
        Transform SurveyMonkey API response to match our expected format.
        The response format should already match, but this handles any variations.
        """
        # If the data is already in the correct format, return as-is
        if "id" in survey_data and "title" in survey_data and "questions" in survey_data:
            return survey_data
        
        # Otherwise, transform from SurveyMonkey's format if needed
        # This is a placeholder for any transformation logic if the API returns a different structure
        return survey_data
    
    async def get_surveys(self) -> SurveyListResponse:
        """
        Fetch surveys from Survey Monkey API.
        Returns surveys in the format matching SurveyMonkey's response structure.
        """
        # Combine stored surveys with API/mock surveys
        all_surveys = list(self._surveys_store.values())
        
        # Try to use real API if token is configured
        if SURVEYMONKEY_TOKEN:
            try:
                async with httpx.AsyncClient() as client:
                    # Fetch surveys list
                    response = await client.get(
                        f"{SURVEYMONKEY_BASE_URL}/surveys",
                        headers={
                            "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                            "Content-Type": "application/json"
                        },
                        params={"per_page": 100}
                    )
                    response.raise_for_status()
                    data = response.json()
                    
                    # Check if response is already in the expected format
                    if "surveys" in data and "total" in data:
                        api_surveys = [Survey(**s) for s in data["surveys"]]
                        all_surveys.extend(api_surveys)
                        return SurveyListResponse(surveys=all_surveys, total=len(all_surveys))
                    
                    # Otherwise, fetch details for each survey and transform
                    survey_list = data.get("data", [])
                    
                    for survey in survey_list:
                        try:
                            details_response = await client.get(
                                f"{SURVEYMONKEY_BASE_URL}/surveys/{survey['id']}/details",
                                headers={
                                    "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                                    "Content-Type": "application/json"
                                }
                            )
                            details_response.raise_for_status()
                            details = details_response.json()
                            # Transform Survey Monkey data to our format
                            transformed = self.transform_survey_data(details)
                            all_surveys.append(Survey(**transformed))
                        except Exception as e:
                            print(f"Error fetching details for survey {survey.get('id')}: {e}")
                            continue
                    
                    return SurveyListResponse(surveys=all_surveys, total=len(all_surveys))
            except Exception as e:
                print(f"Error fetching surveys from API: {e}")
                # Fall through to mock data if API call fails
        
        # Add mock surveys if no stored surveys
        if not all_surveys:
            mock_surveys = self._get_mock_surveys()
            all_surveys.extend(mock_surveys.surveys)
        
        return SurveyListResponse(surveys=all_surveys, total=len(all_surveys))
    
    async def get_survey(self, survey_id: str) -> Survey:
        """
        Get a specific survey by ID from Survey Monkey.
        Returns survey in the format matching SurveyMonkey's response structure.
        """
        # Check in-memory store first
        if survey_id in self._surveys_store:
            return self._surveys_store[survey_id]
        
        # Try to use real API if token is configured
        if SURVEYMONKEY_TOKEN:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/details",
                        headers={
                            "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                            "Content-Type": "application/json"
                        }
                    )
                    response.raise_for_status()
                    data = response.json()
                    # Transform Survey Monkey data to our format
                    transformed = self.transform_survey_data(data)
                    return Survey(**transformed)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise ValueError(f"Survey with ID {survey_id} not found")
                raise ValueError(f"Error fetching survey: {e.response.text}")
            except Exception as e:
                print(f"Error fetching survey {survey_id}: {e}")
                raise ValueError(f"Error fetching survey: {str(e)}")
        
        # Mock implementation matching the actual SurveyMonkey format
        return self._get_mock_survey(survey_id)
    
    def create_survey(self, title: str, questions: List[SurveyQuestionDetail]) -> Survey:
        """
        Create a new survey and store it in memory.
        Returns the created survey with a generated ID.
        """
        # Generate a unique ID
        survey_id = str(uuid.uuid4())
        
        # Create survey
        survey = Survey(
            id=survey_id,
            title=title,
            questions=questions
        )
        
        # Store in memory
        self._surveys_store[survey_id] = survey
        
        return survey
    
    def _get_mock_surveys(self) -> SurveyListResponse:
        """Return mock survey data"""
        from app.models.survey import SurveyQuestionDetail, SurveyOption
        
        return SurveyListResponse(
            surveys=[
                Survey(
                    id="123456789",
                    title="Customer Satisfaction Survey",
                    questions=[
                        SurveyQuestionDetail(
                            id="q1",
                            heading="How satisfied are you with our service?",
                            type="multiple_choice",
                            options=[
                                SurveyOption(id="opt1", text="Very Satisfied"),
                                SurveyOption(id="opt2", text="Satisfied"),
                                SurveyOption(id="opt3", text="Neutral"),
                                SurveyOption(id="opt4", text="Dissatisfied")
                            ]
                        ),
                        SurveyQuestionDetail(
                            id="q2",
                            heading="What would you like to see improved?",
                            type="open_ended",
                            options=None
                        )
                    ]
                ),
                Survey(
                    id="987654321",
                    title="Product Feedback",
                    questions=[
                        SurveyQuestionDetail(
                            id="q1",
                            heading="How likely are you to recommend us?",
                            type="multiple_choice",
                            options=[
                                SurveyOption(id="opt1", text="Very Likely"),
                                SurveyOption(id="opt2", text="Likely"),
                                SurveyOption(id="opt3", text="Unlikely")
                            ]
                        )
                    ]
                )
            ],
            total=2
        )
    
    def _get_mock_survey(self, survey_id: str) -> Survey:
        """Return mock survey data for a specific ID"""
        from app.models.survey import SurveyQuestionDetail, SurveyOption
        
        if survey_id == "123456789":
            return Survey(
                id="123456789",
                title="Customer Satisfaction Survey",
                questions=[
                    SurveyQuestionDetail(
                        id="q1",
                        heading="How satisfied are you with our service?",
                        type="multiple_choice",
                        options=[
                            SurveyOption(id="opt1", text="Very Satisfied"),
                            SurveyOption(id="opt2", text="Satisfied"),
                            SurveyOption(id="opt3", text="Neutral"),
                            SurveyOption(id="opt4", text="Dissatisfied")
                        ]
                    ),
                    SurveyQuestionDetail(
                        id="q2",
                        heading="What would you like to see improved?",
                        type="open_ended",
                        options=None
                    )
                ]
            )
        elif survey_id == "987654321":
            return Survey(
                id="987654321",
                title="Product Feedback",
                questions=[
                    SurveyQuestionDetail(
                        id="q1",
                        heading="How likely are you to recommend us?",
                        type="multiple_choice",
                        options=[
                            SurveyOption(id="opt1", text="Very Likely"),
                            SurveyOption(id="opt2", text="Likely"),
                            SurveyOption(id="opt3", text="Unlikely")
                        ]
                    )
                ]
            )
        else:
            # Default mock for unknown survey IDs
            return Survey(
                id=survey_id,
                title="Sample Survey",
                questions=[
                    SurveyQuestionDetail(
                        id="q1",
                        heading="Sample question?",
                        type="multiple_choice",
                        options=[
                            SurveyOption(id="opt1", text="Option 1"),
                            SurveyOption(id="opt2", text="Option 2")
                        ]
                    )
                ]
            )


    async def get_missions_async(self) -> MissionListResponse:
        """Async version of get_missions"""
        surveys_response = await self.get_surveys()
        surveys = surveys_response.surveys
        
        # Icon and color mapping based on survey themes
        mission_themes = [
            {"icon": "⚡", "color": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "artist": "Neon Pulse"},
            {"icon": "🎮", "color": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", "artist": "Digital Storm"},
            {"icon": "🌃", "color": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", "artist": "Synthwave City"},
            {"icon": "✨", "color": "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", "artist": "Beat Master"},
            {"icon": "🎹", "color": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", "artist": "80s Kid"},
            {"icon": "👾", "color": "linear-gradient(135deg, #30cfd0 0%, #330867 100%)", "artist": "Chip Tune"},
            {"icon": "🔊", "color": "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", "artist": "Club Remix"},
            {"icon": "⭐", "color": "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)", "artist": "Cosmic DJ"},
        ]
        
        missions = []
        for idx, survey in enumerate(surveys):
            theme = mission_themes[idx % len(mission_themes)]
            mission = Mission(
                id=f"mission_{survey.id}",
                title=survey.title,
                artist=theme["artist"],
                icon=theme["icon"],
                color=theme["color"],
                survey_id=survey.id
            )
            missions.append(mission)
        
        return MissionListResponse(missions=missions, total=len(missions))


# Singleton instance
survey_service = SurveyService()
