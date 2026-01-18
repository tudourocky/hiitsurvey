"""Survey service for SurveyMonkey API integration"""
import httpx
import uuid
from typing import Dict, List, Optional
from openai import OpenAI
from app.config import SURVEYMONKEY_TOKEN, SURVEYMONKEY_BASE_URL, OPENAI_API_KEY
from app.models.survey import Survey, SurveyListResponse, SurveyQuestionDetail, Mission, MissionListResponse


class SurveyService:
    """Service for interacting with SurveyMonkey API"""
    
    def __init__(self):
        # In-memory store for created surveys
        self._surveys_store: Dict[str, Survey] = {}
        # OpenAI client for icon generation
        self._openai_client = None
        if OPENAI_API_KEY:
            self._openai_client = OpenAI(api_key=OPENAI_API_KEY)
    
    def transform_survey_data(self, survey_data: dict) -> dict:
        """
        Transform SurveyMonkey API response to match our expected format.
        SurveyMonkey returns surveys with pages, and questions are nested within pages.
        """
        # If the data is already in the correct format, return as-is
        if "id" in survey_data and "title" in survey_data and "questions" in survey_data:
            # Check if questions are already in the right format
            if isinstance(survey_data["questions"], list) and len(survey_data["questions"]) > 0:
                if isinstance(survey_data["questions"][0], dict) and "heading" in survey_data["questions"][0]:
                    return survey_data
        
        # Transform from SurveyMonkey's format
        # SurveyMonkey structure: survey -> pages -> questions
        transformed = {
            "id": str(survey_data.get("id", "")),
            "title": survey_data.get("title", ""),
            "questions": []
        }
        
        # Extract questions from pages
        pages = survey_data.get("pages", [])
        for page in pages:
            page_questions = page.get("questions", [])
            for q in page_questions:
                # Extract question heading
                headings = q.get("headings", [])
                heading = headings[0].get("heading", "") if headings else ""
                
                # Determine question type
                family = q.get("family", "")
                question_type = "multiple_choice" if family in ["single_choice", "multiple_choice"] else "open_ended"
                
                # Extract options/choices
                options = []
                answers = q.get("answers", {})
                choices = answers.get("choices", [])
                
                for idx, choice in enumerate(choices, 1):
                    options.append({
                        "id": f"opt{idx}",
                        "text": choice.get("text", "")
                    })
                
                # Build question in our format
                question = {
                    "id": str(q.get("id", "")),
                    "heading": heading,
                    "type": question_type,
                    "options": options if options else None
                }
                
                transformed["questions"].append(question)
        
        return transformed
    
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
        Create a new survey in SurveyMonkey (if token available) or store in memory.
        Returns the created survey with a generated ID.
        """
        # Try to create in SurveyMonkey if token is configured
        if SURVEYMONKEY_TOKEN:
            try:
                print(f"Attempting to create survey '{title}' in SurveyMonkey...")
                survey = self._create_survey_in_surveymonkey(title, questions)
                print(f"✓ Successfully created survey in SurveyMonkey: {survey.id}")
                return survey
            except httpx.HTTPStatusError as e:
                print(f"✗ HTTP Error creating survey in SurveyMonkey: {e.response.status_code}")
                print(f"  Response: {e.response.text}")
                if e.response.status_code == 401:
                    print("  ERROR: Authentication failed. Check your SURVEYMONKEY_ACCESS_TOKEN.")
                elif e.response.status_code == 403:
                    print("  ERROR: Access forbidden. Check your API permissions/scopes.")
                print("  Falling back to in-memory storage (temporary, lost on restart)...")
                # Fall through to in-memory storage
            except Exception as e:
                print(f"✗ Error creating survey in SurveyMonkey: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
                print("  Falling back to in-memory storage (temporary, lost on restart)...")
                # Fall through to in-memory storage
        else:
            print(f"⚠ No SURVEYMONKEY_ACCESS_TOKEN configured. Storing survey '{title}' in memory only (temporary, lost on restart).")
        
        # Fallback: Store in memory
        survey_id = str(uuid.uuid4())
        survey = Survey(
            id=survey_id,
            title=title,
            questions=questions
        )
        self._surveys_store[survey_id] = survey
        print(f"  Stored survey locally with ID: {survey_id}")
        return survey
    
    def _create_survey_in_surveymonkey(self, title: str, questions: List[SurveyQuestionDetail]) -> Survey:
        """
        Create a survey in SurveyMonkey API.
        Uses synchronous httpx client since this is called from a sync method.
        """
        if not SURVEYMONKEY_TOKEN:
            raise ValueError("SURVEYMONKEY_TOKEN is not configured")
        
        # First, create the survey
        survey_payload = {
            "title": title,
            "nickname": title,
            "language": "en"
        }
        
        print(f"  Creating survey with payload: {survey_payload}")
        
        # Use synchronous httpx client
        with httpx.Client(timeout=30.0) as client:
            # Create the survey
            print(f"  POST {SURVEYMONKEY_BASE_URL}/surveys")
            create_response = client.post(
                f"{SURVEYMONKEY_BASE_URL}/surveys",
                headers={
                    "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                    "Content-Type": "application/json"
                },
                json=survey_payload
            )
            
            print(f"  Response status: {create_response.status_code}")
            if create_response.status_code not in [200, 201]:
                print(f"  Response body: {create_response.text}")
            
            create_response.raise_for_status()
            survey_data = create_response.json()
            survey_id = survey_data.get("id")
            
            if not survey_id:
                raise ValueError(f"SurveyMonkey did not return a survey ID. Response: {survey_data}")
            
            print(f"  ✓ Survey created with ID: {survey_id}")
            
            # SurveyMonkey creates a default page, so we'll use that
            # Get the survey details to find the page ID
            details_response = client.get(
                f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/details",
                headers={
                    "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                    "Content-Type": "application/json"
                }
            )
            details_response.raise_for_status()
            details_data = details_response.json()
            
            # Get the first page ID (SurveyMonkey creates a default page)
            pages = details_data.get("pages", [])
            if not pages:
                # Create a page if none exists
                page_payload = {
                    "title": "Questions",
                    "description": ""
                }
                page_response = client.post(
                    f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/pages",
                    headers={
                        "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json=page_payload
                )
                page_response.raise_for_status()
                page_data = page_response.json()
                page_id = page_data["id"]
            else:
                page_id = pages[0]["id"]
            
            # Add questions to the page
            print(f"  Adding {len(questions)} questions to page {page_id}...")
            for idx, question in enumerate(questions, 1):
                question_payload = {
                    "headings": [{"heading": question.heading}],
                    "family": "single_choice" if question.type == "multiple_choice" else "open_ended",
                    "subtype": "vertical"
                }
                
                # Add options for multiple choice questions
                if question.type == "multiple_choice" and question.options:
                    question_payload["answers"] = {
                        "choices": [
                            {"text": opt.text} for opt in question.options
                        ]
                    }
                
                print(f"    Adding question {idx}/{len(questions)}: {question.heading[:50]}...")
                question_response = client.post(
                    f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/pages/{page_id}/questions",
                    headers={
                        "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json=question_payload
                )
                
                if question_response.status_code not in [200, 201]:
                    print(f"    ✗ Failed to add question. Status: {question_response.status_code}")
                    print(f"    Response: {question_response.text}")
                
                question_response.raise_for_status()
                print(f"    ✓ Question {idx} added successfully")
            
            # Fetch the created survey details again to get all questions
            final_details_response = client.get(
                f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/details",
                headers={
                    "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                    "Content-Type": "application/json"
                }
            )
            final_details_response.raise_for_status()
            final_details_data = final_details_response.json()
            
            # Debug: Print structure if questions are missing
            if "pages" not in final_details_data or not final_details_data.get("pages"):
                print(f"  ⚠ Warning: No pages found in survey details")
                print(f"  Response keys: {list(final_details_data.keys())}")
            
            # Transform to our format
            transformed = self.transform_survey_data(final_details_data)
            
            # Debug: Check transformation
            if "questions" not in transformed or not transformed["questions"]:
                print(f"  ⚠ Warning: No questions after transformation")
                print(f"  Transformed keys: {list(transformed.keys())}")
                if "pages" in final_details_data:
                    print(f"  Pages in response: {len(final_details_data['pages'])}")
                    for page in final_details_data["pages"]:
                        print(f"    Page {page.get('id')}: {len(page.get('questions', []))} questions")
            
            survey = Survey(**transformed)
            
            # Verify the survey was actually created with questions
            if not survey.questions or len(survey.questions) == 0:
                raise ValueError(f"Survey was created but no questions were found. Survey ID: {survey_id}")
            
            # Also store in memory for quick access
            self._surveys_store[survey_id] = survey
            
            print(f"  ✓ Survey fully created in SurveyMonkey: {survey_id} - {title} ({len(survey.questions)} questions)")
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


    def _generate_icon_for_survey(self, survey: Survey) -> str:
        """Generate an appropriate react-icons icon name for a survey using OpenAI"""
        if not self._openai_client:
            # Fallback to default icon if OpenAI not available
            return "FaCircle"
        
        try:
            # Build context about the survey
            questions_summary = ", ".join([q.heading for q in survey.questions[:3]])
            
            # Popular react-icons from Font Awesome, Material Design, and Feather
            # Format: IconName (from react-icons/fa, react-icons/md, react-icons/fi, etc.)
            icon_options = [
                # Fitness & Health
                "FaDumbbell", "FaRunning", "FaHeartbeat", "FaBicycle", "FaSwimmer", "FaHiking",
                "MdFitnessCenter", "MdDirectionsRun", "MdPool", "MdSports",
                # Food & Nutrition
                "FaAppleAlt", "FaUtensils", "FaCookieBite", "MdRestaurant", "MdLocalDining",
                # Mental Health & Wellness
                "FaBrain", "FaLeaf", "FaMoon", "FaSun", "MdSelfImprovement", "MdSpa",
                # Work & Productivity
                "FaBriefcase", "FaLaptop", "FaClock", "MdWork", "MdBusinessCenter", "MdSchedule",
                # Technology
                "FaMobileAlt", "FaLaptop", "FaTabletAlt", "MdPhoneIphone", "MdComputer",
                # Social & Relationships
                "FaUsers", "FaUserFriends", "FaHeart", "MdPeople", "MdGroup", "MdFavorite",
                # Learning & Education
                "FaBook", "FaGraduationCap", "FaChalkboardTeacher", "MdSchool", "MdMenuBook",
                # Hobbies & Interests
                "FaPalette", "FaMusic", "FaGamepad", "FaCamera", "MdPalette", "MdMusicNote",
                # Travel & Adventure
                "FaPlane", "FaMapMarkedAlt", "FaMountain", "MdFlight", "MdPlace", "MdLandscape",
                # General
                "FaStar", "FaRocket", "FaGem", "FaFire", "FaLightbulb", "FaChartLine",
                "MdStar", "MdRocketLaunch", "MdLightbulb", "MdTrendingUp"
            ]
            
            prompt = f"""Based on this survey, choose the most appropriate react-icons icon name that best represents it.

Survey Title: {survey.title}
Sample Questions: {questions_summary}

Available Icons (react-icons format - use exact name):
{', '.join(icon_options)}

Choose ONE icon name that best matches the survey theme. Consider:
- Fitness/Exercise: FaDumbbell, FaRunning, MdFitnessCenter
- Health/Nutrition: FaHeartbeat, FaAppleAlt, MdRestaurant
- Mental Health: FaBrain, FaLeaf, MdSelfImprovement
- Work/Productivity: FaBriefcase, FaLaptop, MdWork
- Technology: FaMobileAlt, FaLaptop, MdComputer
- Social: FaUsers, FaUserFriends, MdPeople
- Learning: FaBook, FaGraduationCap, MdSchool
- Hobbies: FaPalette, FaMusic, FaGamepad
- Travel: FaPlane, FaMapMarkedAlt, MdFlight

Return ONLY the icon name (e.g., "FaDumbbell" or "MdFitnessCenter"), nothing else.

Icon Name:"""
            
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that suggests appropriate react-icons icon names for surveys. Always return only the icon name (e.g., FaDumbbell, MdFitnessCenter) from the provided list. The icon name must match exactly one from the list."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=20
            )
            
            icon_name = response.choices[0].message.content.strip()
            # Clean up any extra characters or quotes
            icon_name = icon_name.strip('"\'')
            
            # Validate it's a valid icon name from our list
            if icon_name in icon_options:
                return icon_name
            
            # Try to find a close match
            icon_lower = icon_name.lower()
            for icon in icon_options:
                if icon.lower() == icon_lower or icon_lower in icon.lower():
                    return icon
            
            # Fallback to default
            return "FaCircle"
        except Exception as e:
            print(f"Error generating icon: {e}")
            return "FaCircle"
    
    def _get_artist_name(self, idx: int) -> str:
        """Get artist name based on index"""
        artists = [
            "Neon Pulse", "Digital Storm", "Synthwave City", "Beat Master",
            "80s Kid", "Chip Tune", "Club Remix", "Cosmic DJ"
        ]
        return artists[idx % len(artists)]
    
    def _get_color_gradient(self, idx: int) -> str:
        """Get color gradient based on index"""
        colors = [
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
            "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
            "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
        ]
        return colors[idx % len(colors)]
    
    async def get_missions_async(self) -> MissionListResponse:
        """Async version of get_missions"""
        surveys_response = await self.get_surveys()
        surveys = surveys_response.surveys
        
        missions = []
        for idx, survey in enumerate(surveys):
            # Generate icon using LLM
            icon = self._generate_icon_for_survey(survey)
            
            mission = Mission(
                id=f"mission_{survey.id}",
                title=survey.title,
                artist=self._get_artist_name(idx),
                icon=icon,
                color=self._get_color_gradient(idx),
                survey_id=survey.id
            )
            missions.append(mission)
        
        return MissionListResponse(missions=missions, total=len(missions))


# Singleton instance
survey_service = SurveyService()
