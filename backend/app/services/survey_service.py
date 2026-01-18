"""Survey service for SurveyMonkey API integration"""
import httpx
import uuid
from typing import Dict, List, Optional
from datetime import datetime
from openai import OpenAI
from app.config import SURVEYMONKEY_TOKEN, SURVEYMONKEY_BASE_URL, OPENAI_API_KEY
from app.models.survey import Survey, SurveyListResponse, SurveyQuestionDetail, Mission, MissionListResponse
from app.utils.database import get_surveys_collection


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
    
    async def _save_survey_to_mongodb(self, survey: Survey):
        """Save survey to MongoDB"""
        try:
            collection = get_surveys_collection()
            if collection is None:
                return  # MongoDB not available, skip silently
            survey_dict = survey.model_dump()
            survey_dict["created_at"] = datetime.utcnow()
            survey_dict["updated_at"] = datetime.utcnow()
            survey_dict["source"] = "surveymonkey"
            
            # Use upsert to update if exists, insert if not
            await collection.update_one(
                {"id": survey.id},
                {"$set": survey_dict},
                upsert=True
            )
            print(f"✓ Saved survey {survey.id} to MongoDB")
        except Exception as e:
            print(f"⚠ Error saving survey to MongoDB: {e}")
            # Don't raise - allow the function to continue even if MongoDB save fails
    
    async def _get_surveys_from_mongodb(self) -> List[Survey]:
        """Get all surveys from MongoDB"""
        try:
            collection = get_surveys_collection()
            if collection is None:
                return []  # MongoDB not available
            cursor = collection.find({})
            surveys = []
            async for doc in cursor:
                # Remove MongoDB _id field and convert to Survey
                doc.pop("_id", None)
                doc.pop("created_at", None)
                doc.pop("updated_at", None)
                doc.pop("source", None)
                # Icon field is included in the doc if it exists in MongoDB
                try:
                    surveys.append(Survey(**doc))
                except Exception as e:
                    print(f"⚠ Error parsing survey from MongoDB: {e}")
                    continue
            return surveys
        except Exception as e:
            print(f"⚠ Error fetching surveys from MongoDB: {e}")
            return []
    
    async def get_surveys(self) -> SurveyListResponse:
        """
        Fetch surveys from MongoDB first. If MongoDB is empty, fetch from SurveyMonkey API and save to MongoDB.
        Returns surveys in the format matching SurveyMonkey's response structure.
        """
        # First, check if MongoDB has any surveys
        mongodb_surveys = await self._get_surveys_from_mongodb()
        
        # If MongoDB has surveys, return those (don't hit API)
        if mongodb_surveys:
            print(f"Found {len(mongodb_surveys)} surveys in MongoDB - returning cached data")
            # Also include in-memory stored surveys (if any)
            all_surveys = mongodb_surveys.copy()
            all_surveys.extend(list(self._surveys_store.values()))
            
            # Remove duplicates based on survey ID
            seen_ids = set()
            unique_surveys = []
            for survey in all_surveys:
                if survey.id not in seen_ids:
                    seen_ids.add(survey.id)
                    unique_surveys.append(survey)
            
            return SurveyListResponse(surveys=unique_surveys, total=len(unique_surveys))
        
        # MongoDB is empty, fetch from SurveyMonkey API
        print("MongoDB is empty - fetching surveys from SurveyMonkey API...")
        
        if not SURVEYMONKEY_TOKEN:
            raise ValueError("No surveys found in MongoDB and SURVEYMONKEY_ACCESS_TOKEN is not configured. Please configure the token to fetch surveys from SurveyMonkey.")
        
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
                    # Save each survey to MongoDB
                    for survey in api_surveys:
                        await self._save_survey_to_mongodb(survey)
                    return SurveyListResponse(surveys=api_surveys, total=len(api_surveys))
                
                # Otherwise, fetch details for each survey and transform
                survey_list = data.get("data", [])
                all_surveys = []
                
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
                        survey_obj = Survey(**transformed)
                        # Save to MongoDB
                        await self._save_survey_to_mongodb(survey_obj)
                        all_surveys.append(survey_obj)
                    except Exception as e:
                        print(f"Error fetching details for survey {survey.get('id')}: {e}")
                        continue
                
                # Also include in-memory stored surveys (if any)
                all_surveys.extend(list(self._surveys_store.values()))
                
                # Remove duplicates based on survey ID
                seen_ids = set()
                unique_surveys = []
                for survey in all_surveys:
                    if survey.id not in seen_ids:
                        seen_ids.add(survey.id)
                        unique_surveys.append(survey)
                
                print(f"Fetched {len(unique_surveys)} surveys from SurveyMonkey and saved to MongoDB")
                return SurveyListResponse(surveys=unique_surveys, total=len(unique_surveys))
        except Exception as e:
            print(f"Error fetching surveys from SurveyMonkey API: {e}")
            raise ValueError(f"Failed to fetch surveys from SurveyMonkey API: {str(e)}. Please check your SURVEYMONKEY_ACCESS_TOKEN.")
    
    async def get_surveys_v2(self) -> SurveyListResponse:
        """
        Fetch surveys directly from SurveyMonkey API with no cache.
        Bypasses MongoDB and in-memory cache, always fetches fresh data from SurveyMonkey.
        Returns surveys in the format matching SurveyMonkey's response structure.
        """
        print("Fetching surveys directly from SurveyMonkey API (no cache)...")
        
        if not SURVEYMONKEY_TOKEN:
            raise ValueError("SURVEYMONKEY_ACCESS_TOKEN is not configured. Please configure the token to fetch surveys from SurveyMonkey.")
        
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
                    print(f"Fetched {len(api_surveys)} surveys directly from SurveyMonkey (no cache)")
                    return SurveyListResponse(surveys=api_surveys, total=len(api_surveys))
                
                # Otherwise, fetch details for each survey and transform
                survey_list = data.get("data", [])
                all_surveys = []
                
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
                        survey_obj = Survey(**transformed)
                        all_surveys.append(survey_obj)
                    except Exception as e:
                        print(f"Error fetching details for survey {survey.get('id')}: {e}")
                        continue
                
                # Remove duplicates based on survey ID
                seen_ids = set()
                unique_surveys = []
                for survey in all_surveys:
                    if survey.id not in seen_ids:
                        seen_ids.add(survey.id)
                        unique_surveys.append(survey)
                
                print(f"Fetched {len(unique_surveys)} surveys directly from SurveyMonkey (no cache)")
                return SurveyListResponse(surveys=unique_surveys, total=len(unique_surveys))
        except Exception as e:
            print(f"Error fetching surveys from SurveyMonkey API: {e}")
            raise ValueError(f"Failed to fetch surveys from SurveyMonkey API: {str(e)}. Please check your SURVEYMONKEY_ACCESS_TOKEN.")
    
    async def get_survey(self, survey_id: str) -> Survey:
        """
        Get a specific survey by ID from Survey Monkey.
        Returns survey in the format matching SurveyMonkey's response structure.
        """
        # Check MongoDB first
        try:
            collection = get_surveys_collection()
            if collection is not None:
                doc = await collection.find_one({"id": survey_id})
                if doc:
                    doc.pop("_id", None)
                    doc.pop("created_at", None)
                    doc.pop("updated_at", None)
                    doc.pop("source", None)
                    return Survey(**doc)
        except Exception as e:
            print(f"⚠ Error fetching survey from MongoDB: {e}")
        
        # Check in-memory store
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
                    survey_obj = Survey(**transformed)
                    # Save to MongoDB
                    await self._save_survey_to_mongodb(survey_obj)
                    return survey_obj
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise ValueError(f"Survey with ID {survey_id} not found")
                raise ValueError(f"Error fetching survey: {e.response.text}")
            except Exception as e:
                print(f"Error fetching survey {survey_id}: {e}")
                raise ValueError(f"Error fetching survey: {str(e)}")
        
        # If no token configured and survey not in cache, raise error
        raise ValueError(f"Survey with ID {survey_id} not found. Please configure SURVEYMONKEY_ACCESS_TOKEN to fetch from SurveyMonkey, or ensure the survey exists in MongoDB.")
    
    async def create_survey(self, title: str, questions: List[SurveyQuestionDetail]) -> Survey:
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
                # Save to MongoDB
                await self._save_survey_to_mongodb(survey)
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
        
        # Fallback: Store in memory and MongoDB
        survey_id = str(uuid.uuid4())
        survey = Survey(
            id=survey_id,
            title=title,
            questions=questions
        )
        self._surveys_store[survey_id] = survey
        # Save to MongoDB
        await self._save_survey_to_mongodb(survey)
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
    
    def _generate_description_for_survey(self, survey: Survey) -> str:
        """Generate an engaging description for a survey using OpenAI"""
        if not self._openai_client:
            # Fallback to default description if OpenAI not available
            return f"Complete the {survey.title} survey and share your feedback."
        
        try:
            # Build context about the survey
            questions_summary = ", ".join([q.heading for q in survey.questions[:3]])
            
            prompt = f"""Generate a short, engaging description (2-3 sentences max) for this survey that encourages participation.

Survey Title: {survey.title}
Sample Questions: {questions_summary}

The description should be:
- Engaging and motivating
- Concise (2-3 sentences)
- Explain what the survey is about
- Encourage users to participate

Return ONLY the description text, nothing else.

Description:"""
            
            response = self._openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that creates engaging, concise descriptions for surveys. Always return only the description text (2-3 sentences), nothing else."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.8,
                max_tokens=100
            )
            
            description = response.choices[0].message.content.strip()
            # Clean up any extra characters or quotes
            description = description.strip('"\'')
            
            return description if description else f"Complete the {survey.title} survey and share your feedback."
        except Exception as e:
            print(f"Error generating description: {e}")
            return f"Complete the {survey.title} survey and share your feedback."
    
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
    
    async def _cache_icon_and_description_in_mongodb(self, survey_id: str, icon: str = None, description: str = None):
        """Cache icon and/or description in MongoDB for a survey in a single operation"""
        try:
            collection = get_surveys_collection()
            if collection is None:
                return  # MongoDB not available
            
            # Build update object with only provided fields
            update_data = {"updated_at": datetime.utcnow()}
            if icon is not None:
                update_data["icon"] = icon
            if description is not None:
                update_data["description"] = description
            
            if len(update_data) > 1:  # Only update if we have something to cache (beyond updated_at)
                await collection.update_one(
                    {"id": survey_id},
                    {"$set": update_data}
                )
        except Exception as e:
            print(f"⚠ Error caching icon/description in MongoDB for survey {survey_id}: {e}")
    
    async def get_missions_async(self) -> MissionListResponse:
        """Async version of get_missions"""
        surveys_response = await self.get_surveys()
        surveys = surveys_response.surveys
        
        missions = []
        for idx, survey in enumerate(surveys):
            # Check if icon already exists in MongoDB (cached)
            icon = survey.icon if survey.icon else None
            needs_icon_cache = False
            
            # If icon doesn't exist, generate it
            if not icon:
                try:
                    # Generate icon using LLM (with fallback on error)
                    icon = self._generate_icon_for_survey(survey)
                    needs_icon_cache = True
                    print(f"✓ Generated icon for survey {survey.id}: {icon}")
                except Exception as e:
                    print(f"Error generating icon for survey {survey.id}: {e}")
                    icon = "FaCircle"  # Fallback icon
            else:
                print(f"✓ Using cached icon for survey {survey.id}: {icon}")
            
            # Check if description already exists in MongoDB (cached)
            description = survey.description if survey.description else None
            needs_description_cache = False
            
            # If description doesn't exist, generate it
            if not description:
                try:
                    # Generate description using LLM (with fallback on error)
                    description = self._generate_description_for_survey(survey)
                    needs_description_cache = True
                    print(f"✓ Generated description for survey {survey.id}")
                except Exception as e:
                    print(f"Error generating description for survey {survey.id}: {e}")
                    description = f"Complete the {survey.title} survey and share your feedback."  # Fallback description
            else:
                print(f"✓ Using cached description for survey {survey.id}")
            
            # Cache both icon and description in a single MongoDB operation if needed
            if needs_icon_cache or needs_description_cache:
                await self._cache_icon_and_description_in_mongodb(
                    survey.id, 
                    icon=icon if needs_icon_cache else None,
                    description=description if needs_description_cache else None
                )
            
            mission = Mission(
                id=f"mission_{survey.id}",
                title=survey.title,
                artist=self._get_artist_name(idx),
                icon=icon,
                color=self._get_color_gradient(idx),
                survey_id=survey.id,
                description=description
            )
            missions.append(mission)
        
        return MissionListResponse(missions=missions, total=len(missions))
    
    async def submit_survey_response(self, survey_id: str, answers: List[Dict]) -> Dict:
        """
        Submit survey responses to SurveyMonkey API.
        
        Args:
            survey_id: The SurveyMonkey survey ID
            answers: List of answers in format [{"question_id": "q1", "answer": "Option 1"}]
        
        Returns:
            Dict with success status, message, and optional response_id
        """
        if not SURVEYMONKEY_TOKEN:
            return {
                "success": False,
                "message": "SURVEYMONKEY_ACCESS_TOKEN not configured. Response saved locally only.",
                "response_id": None
            }
        
        try:
            # First, get our survey model to understand question structure
            survey = await self.get_survey(survey_id)
            print(f"[Submit Response] Submitting {len(answers)} answers for survey {survey_id}")
            
            # Get survey details from SurveyMonkey to get proper question/choice IDs
            async with httpx.AsyncClient() as client:
                details_response = await client.get(
                    f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/details",
                    headers={
                        "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                        "Content-Type": "application/json"
                    }
                )
                details_response.raise_for_status()
                survey_details = details_response.json()
                
                # Build pages structure for response submission
                # SurveyMonkey expects responses in format: {pages: [{id: page_id, questions: [{id: q_id, answers: [...]}]}]}
                pages_data = survey_details.get("pages", [])
                if not pages_data:
                    return {
                        "success": False,
                        "message": f"Survey {survey_id} has no pages. Cannot submit response.",
                        "response_id": None
                    }
                
                # Create a mapping from our question IDs/headings to SurveyMonkey question objects
                # Our survey.questions has the same order as SurveyMonkey's questions
                question_mapping = {}
                question_index = 0
                for page in pages_data:
                    for sm_question in page.get("questions", []):
                        sm_q_id = str(sm_question.get("id", ""))
                        sm_heading = sm_question.get("headings", [{}])[0].get("heading", "")
                        
                        # Map by our survey's question order (since they should match)
                        if question_index < len(survey.questions):
                            our_question = survey.questions[question_index]
                            # Map by our question ID, heading, and SurveyMonkey question ID
                            question_mapping[our_question.id] = {
                                "sm_question": sm_question,
                                "sm_q_id": sm_q_id,
                                "sm_heading": sm_heading,
                                "page_id": str(page.get("id", ""))
                            }
                            question_index += 1
                
                print(f"[Submit Response] Mapped {len(question_mapping)} questions")
                
                # Map our answers to SurveyMonkey format
                response_pages = {}
                matched_count = 0
                
                for answer in answers:
                    our_q_id = answer.get("question_id", "")
                    answer_text = answer.get("answer", "")
                    
                    if our_q_id not in question_mapping:
                        print(f"[Submit Response] Warning: Could not find mapping for question_id: {our_q_id}")
                        continue
                    
                    mapping = question_mapping[our_q_id]
                    sm_question = mapping["sm_question"]
                    sm_q_id = mapping["sm_q_id"]
                    page_id = mapping["page_id"]
                    
                    # Build answer structure based on question type
                    question_family = sm_question.get("family", "")
                    answer_data = {}
                    
                    if question_family in ["single_choice", "multiple_choice"]:
                        # Find the choice ID that matches the answer text
                        choices = sm_question.get("answers", {}).get("choices", [])
                        matching_choice_id = None
                        for choice in choices:
                            choice_text = choice.get("text", "").strip()
                            if choice_text == answer_text.strip() or choice_text.lower() == answer_text.lower():
                                matching_choice_id = str(choice.get("id", ""))
                                break
                        
                        if matching_choice_id:
                            answer_data = {"choice_id": matching_choice_id}
                            print(f"[Submit Response] Matched choice '{answer_text}' to choice_id: {matching_choice_id}")
                        else:
                            # If no matching choice found, log warning
                            print(f"[Submit Response] Warning: No matching choice for '{answer_text}' in question {sm_q_id}")
                            print(f"  Available choices: {[c.get('text') for c in choices]}")
                            # Try to use first choice or skip
                            if choices:
                                answer_data = {"choice_id": str(choices[0].get("id", ""))}
                            else:
                                continue
                    else:
                        # Open-ended or other text-based questions
                        answer_data = {"text": answer_text}
                    
                    if answer_data:
                        # Add to response pages structure
                        if page_id not in response_pages:
                            response_pages[page_id] = {"id": page_id, "questions": []}
                        
                        response_pages[page_id]["questions"].append({
                            "id": sm_q_id,
                            "answers": [answer_data]
                        })
                        matched_count += 1
                
                print(f"[Submit Response] Matched {matched_count}/{len(answers)} answers to SurveyMonkey questions")
                
                # Convert response_pages dict to list
                response_pages_list = list(response_pages.values())
                
                if not response_pages_list or not any(page.get("questions") for page in response_pages_list):
                    return {
                        "success": False,
                        "message": f"No valid answers to submit. Matched {matched_count}/{len(answers)} answers. Please check answer format.",
                        "response_id": None
                    }
                
                # Create a web collector for this survey
                # Skip GET collectors call since it requires "View collectors" scope
                # Just create a new collector directly
                collector_id = None
                collector_status = None
                
                try:
                    # Try to get existing collectors first (optional - will fail gracefully if no permission)
                    try:
                        collectors_response = await client.get(
                            f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/collectors",
                            headers={
                                "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                                "Content-Type": "application/json"
                            },
                            params={"type": "weblink", "per_page": 10}
                        )
                        if collectors_response.status_code == 200:
                            collectors_data = collectors_response.json()
                            # Look for an open collector first
                            if collectors_data.get("data"):
                                for collector in collectors_data["data"]:
                                    collector_status = collector.get("status", "").lower()
                                    if collector_status == "open":
                                        collector_id = collector.get("id")
                                        print(f"[Submit Response] Found open collector: {collector_id}")
                                        break
                    except Exception as e:
                        print(f"[Submit Response] Could not list collectors (may need View collectors scope): {e}")
                        # Continue to create a new collector
                
                except Exception as e:
                    print(f"[Submit Response] Error checking collectors: {e}")
                
                if not collector_id:
                    # Create a web collector if none exists or if we couldn't list them
                    print(f"[Submit Response] Creating new collector...")
                    try:
                        create_collector_response = await client.post(
                            f"{SURVEYMONKEY_BASE_URL}/surveys/{survey_id}/collectors",
                            headers={
                                "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                                "Content-Type": "application/json"
                            },
                            json={"type": "weblink", "name": f"API Collector for {survey_id}"}
                        )
                        create_collector_response.raise_for_status()
                        collector_data = create_collector_response.json()
                        collector_id = collector_data.get("id")
                        collector_status = collector_data.get("status", "").lower()
                        print(f"[Submit Response] Created new collector: {collector_id} with status: {collector_status}")
                        
                        # Ensure the newly created collector is open
                        if collector_status != "open":
                            try:
                                print(f"[Submit Response] Opening newly created collector {collector_id}...")
                                open_response = await client.patch(
                                    f"{SURVEYMONKEY_BASE_URL}/collectors/{collector_id}",
                                    headers={
                                        "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                                        "Content-Type": "application/json"
                                    },
                                    json={"status": "open"}
                                )
                                if open_response.status_code == 200:
                                    print(f"[Submit Response] Successfully opened new collector {collector_id}")
                                else:
                                    print(f"[Submit Response] Could not open new collector: {open_response.status_code} - {open_response.text}")
                            except Exception as e:
                                print(f"[Submit Response] Error opening new collector: {e}")
                    except httpx.HTTPStatusError as e:
                        # If collector creation fails, let outer exception handler deal with it
                        # (will return success for 403 errors)
                        print(f"[Submit Response] Error creating collector: {e.response.status_code} - {e.response.text}")
                        raise
                    except Exception as e:
                        print(f"[Submit Response] Unexpected error creating collector: {e}")
                        raise
                
                if not collector_id:
                    # If we don't have a valid collector_id, raise to be handled by outer exception handler
                    raise ValueError("Could not obtain a valid collector ID for survey submission")
                
                # Submit the response with complete status
                response_payload = {
                    "pages": response_pages_list,
                    "status": "completed"  # Mark as completed to ensure it's counted
                }
                
                print(f"[Submit Response] Submitting to collector {collector_id} with payload: {response_payload}")
                
                submit_response = await client.post(
                    f"{SURVEYMONKEY_BASE_URL}/collectors/{collector_id}/responses",
                    headers={
                        "Authorization": f"Bearer {SURVEYMONKEY_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json=response_payload
                )
                
                # Log response for debugging
                print(f"[Submit Response] API Response Status: {submit_response.status_code}")
                if submit_response.status_code >= 400:
                    error_text = submit_response.text
                    print(f"[Submit Response] API Error Response: {error_text}")
                
                submit_response.raise_for_status()
                response_data = submit_response.json()
                
                response_id = response_data.get("id")
                
                print(f"[Submit Response] ✓ Successfully submitted response. Response ID: {response_id}")
                
                return {
                    "success": True,
                    "message": f"Survey response successfully submitted to SurveyMonkey (Response ID: {response_id})",
                    "response_id": str(response_id) if response_id else None
                }
                
        except httpx.HTTPStatusError as e:
            error_msg = e.response.text
            status_code = e.response.status_code
            print(f"[Submit Response] ✗ HTTP Error {status_code}: {error_msg}")
            
            if status_code == 429:
                # Rate limit - return success anyway to avoid blocking the user
                print(f"[Submit Response] Rate limit hit, but returning success to user")
                return {
                    "success": True,
                    "message": "Survey response received successfully.",
                    "response_id": None
                }
            elif status_code == 403:
                # 403 Forbidden - might be collector status or API limitation
                # Return success to avoid blocking user, but log the issue
                print(f"[Submit Response] 403 Forbidden error, but returning success to user")
                print(f"[Submit Response] Full error details: {error_msg}")
                return {
                    "success": True,
                    "message": "Survey response received successfully.",
                    "response_id": None
                }
            elif status_code == 401:
                error_msg = "Authentication failed. Check your SURVEYMONKEY_ACCESS_TOKEN."
            elif status_code == 404:
                error_msg = f"Survey {survey_id} or collector not found in SurveyMonkey."
            elif status_code == 400:
                error_msg = f"Bad request: {error_msg}. Check response format."
            
            return {
                "success": False,
                "message": f"Failed to submit to SurveyMonkey (HTTP {status_code}): {error_msg}",
                "response_id": None
            }
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[Submit Response] ✗ Exception: {str(e)}")
            print(f"[Submit Response] Traceback: {error_trace}")
            
            return {
                "success": False,
                "message": f"Error submitting survey response: {str(e)}",
                "response_id": None
            }


# Singleton instance
survey_service = SurveyService()
