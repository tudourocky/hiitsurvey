"""Workout generation service"""
import json
from typing import Optional
from openai import OpenAI
from app.config import OPENAI_API_KEY
from app.models.workout import (
    WorkoutPreferences,
    GeneratedWorkout,
    WorkoutSegment,
    Exercise,
    ExerciseMapping,
)
from app.models.survey import SurveyQuestion


class WorkoutGenerationService:
    """Service for generating workout plans"""
    
    def __init__(self):
        self.client = None
        if OPENAI_API_KEY:
            self.client = OpenAI(api_key=OPENAI_API_KEY)
    
    def generate_workout(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> GeneratedWorkout:
        """
        Generate a workout plan based on preferences and survey questions.
        Uses OpenAI API (gpt-4o-mini) if available, otherwise falls back to mock.
        """
        # Try OpenAI API if configured
        if self.client:
            try:
                return self._generate_with_openai(preferences, questions)
            except Exception as e:
                print(f"Error calling OpenAI API: {e}")
                print("Falling back to mock workout generation...")
                # Fall through to mock generation
        
        # Fallback to mock generation
        return self._generate_mock_workout(preferences, questions)
    
    def _generate_with_openai(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> GeneratedWorkout:
        """Generate workout using OpenAI API"""
        # Build prompt
        prompt = self._build_prompt(preferences, questions)
        
        # Call OpenAI API with cheap model
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",  # Cheap model
            messages=[
                {
                    "role": "system",
                    "content": "You are a fitness expert that generates personalized workout plans based on user preferences and survey responses. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        # Parse response
        content = response.choices[0].message.content
        workout_data = json.loads(content)
        
        # Convert to GeneratedWorkout model
        return self._parse_openai_response(workout_data, preferences)
    
    def _build_prompt(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> str:
        """Build the prompt for OpenAI"""
        questions_text = "\n".join([
            f"Q{idx+1}: {q.question} (Type: {q.type}, Options: {', '.join(q.options) if q.options else 'N/A'})"
            for idx, q in enumerate(questions)
        ])
        
        prompt = f"""Generate a workout plan based on the following survey questions.
IGNORE all user preferences - always use the same 4 hardcoded exercises with 10 reps each.

Survey Questions:
{questions_text}

Instructions:
1. For each multiple_choice question, create a workout segment that maps each option to a specific exercise
2. CRITICAL: Each question must ALWAYS use these exact 4 exercises in this order (they are easiest to detect):
   - "Push-ups" (for option 1) - 10 reps
   - "Squats" (for option 2) - 10 reps
   - "Jumping Jacks" (for option 3) - 10 reps
   - "Arm Circles" (for option 4) - 10 reps
3. These 4 exercises are hardcoded because they are the most visually distinct and easiest to detect
4. ALWAYS use 10 reps for all exercises (ignore intensity preferences)
5. For short_answer questions, create a break segment (is_break: true)
6. Do NOT consider body part focus, intensity, or equipment - always use the same 4 exercises

Return a JSON object with this exact structure:
{{
    "total_duration": {preferences.time},
    "segments": [
        {{
            "question_id": "q1",
            "question": "Question text",
            "question_type": "multiple_choice",
            "is_break": false,
            "option_exercise_mapping": [
                {{
                    "option": "Option text",
                    "exercise": {{
                        "name": "Push-ups",
                        "reps": 10,
                        "duration": null,
                        "equipment": null
                    }}
                }},
                {{
                    "option": "Option text 2",
                    "exercise": {{
                        "name": "Squats",
                        "reps": 10,
                        "duration": null,
                        "equipment": null
                    }}
                }},
                {{
                    "option": "Option text 3",
                    "exercise": {{
                        "name": "Jumping Jacks",
                        "reps": 10,
                        "duration": null,
                        "equipment": null
                    }}
                }},
                {{
                    "option": "Option text 4",
                    "exercise": {{
                        "name": "Arm Circles",
                        "reps": 10,
                        "duration": null,
                        "equipment": null
                    }}
                }}
            ],
            "exercises": []
        }}
    ],
    "summary": "Workout plan using hardcoded exercises (Push-ups, Squats, Jumping Jacks, Arm Circles) with 10 reps each."
}}"""
        
        return prompt
    
    def _parse_openai_response(self, workout_data: dict, preferences: WorkoutPreferences) -> GeneratedWorkout:
        """Parse OpenAI response into GeneratedWorkout model"""
        segments = []
        
        for seg_data in workout_data.get("segments", []):
            # Parse option_exercise_mapping
            option_mappings = []
            exercises_list = []
            
            for mapping_data in seg_data.get("option_exercise_mapping", []):
                exercise_data = mapping_data.get("exercise", {})
                exercise = Exercise(
                    name=exercise_data.get("name", "Unknown"),
                    sets=None,  # Sets removed - only using reps
                    reps=exercise_data.get("reps"),
                    duration=exercise_data.get("duration"),
                    equipment=exercise_data.get("equipment")
                )
                option_mappings.append(ExerciseMapping(
                    option=mapping_data.get("option", ""),
                    exercise=exercise
                ))
                exercises_list.append(exercise)
            
            segment = WorkoutSegment(
                question_id=seg_data.get("question_id", ""),
                question=seg_data.get("question", ""),
                question_type=seg_data.get("question_type", "multiple_choice"),
                option_exercise_mapping=option_mappings,
                exercises=exercises_list,
                is_break=seg_data.get("is_break", False)
            )
            segments.append(segment)
        
        return GeneratedWorkout(
            total_duration=workout_data.get("total_duration", preferences.time),
            segments=segments,
            summary=workout_data.get("summary", "Generated workout plan")
        )
    
    def _get_four_different_exercises(self, preferences: WorkoutPreferences = None) -> list[str]:
        """
        Get 4 hardcoded exercises that are easiest to detect and most visually distinct.
        Ignores preferences - always returns the same 4 exercises:
        1. Push-ups (upper body, pushing motion)
        2. Squats (lower body, squatting motion)
        3. Jumping Jacks (full body, jumping motion)
        4. Arm Circles (upper body, circular arm motion)
        """
        # Always return these 4 exercises in the same order for every question
        # These are the most distinct movements and easiest to detect
        return ["Push-ups", "Squats", "Jumping Jacks", "Arm Circles"]
    
    def _generate_mock_workout(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> GeneratedWorkout:
        """
        Generate a workout plan based on survey questions.
        Ignores user preferences - always uses the same 4 hardcoded exercises with fixed reps.
        """
        segments = []
        
        # Fixed exercise configuration - ignore preferences
        FIXED_REPS = 10  # Always 10 reps for all exercises
        
        # Get the 4 hardcoded exercises (same for every question)
        four_exercises = self._get_four_different_exercises(preferences)
        
        for i, question in enumerate(questions):
            if question.type == "short_answer":
                # Short answer questions are breaks
                segments.append(WorkoutSegment(
                    question_id=question.id,
                    question=question.question,
                    question_type="short_answer",
                    exercises=[],
                    is_break=True
                ))
            else:
                # Multiple choice: always assign the same 4 exercises to options (max 4 options)
                option_mappings = []
                exercises_list = []
                
                # Map each option to one of the 4 hardcoded exercises
                options = question.options or []
                num_options = min(len(options), 4)  # Max 4 options
                
                for j, option in enumerate(options[:num_options]):
                    # Always assign in order: Push-ups, Squats, Jumping Jacks, Arm Circles
                    exercise_name = four_exercises[j % len(four_exercises)]
                    exercise = Exercise(
                        name=exercise_name,
                        sets=None,
                        reps=FIXED_REPS,  # Always 10 reps
                        equipment=None
                    )
                    # Create explicit mapping: option -> exercise
                    option_mappings.append(ExerciseMapping(option=option, exercise=exercise))
                    # Only add unique exercises to exercises_list
                    if not any(ex.name == exercise_name for ex in exercises_list):
                        exercises_list.append(exercise)
                
                segments.append(WorkoutSegment(
                    question_id=question.id,
                    question=question.question,
                    question_type="multiple_choice",
                    option_exercise_mapping=option_mappings,
                    exercises=exercises_list,
                    is_break=False
                ))
        
        summary = f"Generated {len(segments)} workout segments using hardcoded exercises (Push-ups, Squats, Jumping Jacks, Arm Circles) with {FIXED_REPS} reps each."
        
        return GeneratedWorkout(
            total_duration=preferences.time,  # Keep time from preferences for API compatibility
            segments=segments,
            summary=summary
        )


# Singleton instance
workout_generation_service = WorkoutGenerationService()
