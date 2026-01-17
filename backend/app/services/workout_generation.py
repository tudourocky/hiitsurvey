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
        
        prompt = f"""Generate a personalized workout plan based on the following preferences and survey questions.

User Preferences:
- Time: {preferences.time} minutes
- Intensity: {preferences.intensity}
- Body Part Focus: {preferences.body_part}
- Available Equipment: {', '.join(preferences.equipment_available) if preferences.equipment_available else 'None specified'}

Survey Questions:
{questions_text}

Instructions:
1. For each multiple_choice question, create a workout segment that maps each option to a specific exercise
2. For short_answer questions, create a break segment (is_break: true)
3. Exercises should be appropriate for the body part focus and intensity level
4. Use the equipment available if specified
5. Distribute the {preferences.time} minutes across all segments appropriately

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
                        "name": "Exercise name",
                        "sets": 2,
                        "reps": 10,
                        "duration": null,
                        "equipment": "equipment name or null"
                    }}
                }}
            ],
            "exercises": []
        }}
    ],
    "summary": "Brief summary of the workout plan"
}}

Make sure the workout is engaging, appropriate for the intensity level, and uses the available equipment."""
        
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
                    sets=exercise_data.get("sets"),
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
    
    def _generate_mock_workout(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> GeneratedWorkout:
        """
        Generate a workout plan based on preferences and survey questions.
        Mock fallback when OpenAI API is not available.
        """
        segments = []
        total_exercises = len(questions)
        
        # Map body parts to exercise categories
        exercise_pool = {
            "upper": ["Push-ups", "Plank", "Shoulder Press", "Bicep Curls", "Tricep Dips", "Pull-ups"],
            "lower": ["Squats", "Lunges", "Jumping Jacks", "Calf Raises", "Leg Raises", "Wall Sit"],
            "full": ["Burpees", "Mountain Climbers", "Jumping Jacks", "Plank", "Squats", "Push-ups"],
            "arms": ["Bicep Curls", "Tricep Dips", "Push-ups", "Plank Hold", "Arm Circles"],
            "legs": ["Squats", "Lunges", "Jumping Jacks", "Calf Raises", "Wall Sit"],
            "core": ["Plank", "Sit-ups", "Crunches", "Russian Twists", "Leg Raises", "Mountain Climbers"]
        }
        
        # Select exercises based on body part
        available_exercises = exercise_pool.get(preferences.body_part.lower(), exercise_pool["full"])
        
        # Calculate exercise parameters based on intensity
        intensity_multiplier = {
            "low": {"sets": 1, "reps": 5, "duration": 20},
            "medium": {"sets": 2, "reps": 10, "duration": 30},
            "high": {"sets": 3, "reps": 15, "duration": 45}
        }
        params = intensity_multiplier[preferences.intensity]
        
        # Time per segment (roughly distribute time across questions)
        time_per_segment = preferences.time // total_exercises if total_exercises > 0 else preferences.time
        
        exercise_index = 0
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
                # Multiple choice: assign different exercises to each option
                option_mappings = []
                exercises_list = []
                for j, option in enumerate(question.options or []):
                    exercise_name = available_exercises[exercise_index % len(available_exercises)]
                    exercise = Exercise(
                        name=exercise_name,
                        sets=params["sets"],
                        reps=params["reps"],
                        equipment=None  # Could map from preferences.equipment_available
                    )
                    # Create explicit mapping: option -> exercise
                    option_mappings.append(ExerciseMapping(option=option, exercise=exercise))
                    exercises_list.append(exercise)
                    exercise_index += 1
                
                segments.append(WorkoutSegment(
                    question_id=question.id,
                    question=question.question,
                    question_type="multiple_choice",
                    option_exercise_mapping=option_mappings,
                    exercises=exercises_list,  # Keep for backwards compatibility
                    is_break=False
                ))
        
        summary = f"Generated {len(segments)} workout segments for {preferences.time} minutes of {preferences.intensity} intensity {preferences.body_part} workout."
        
        return GeneratedWorkout(
            total_duration=preferences.time,
            segments=segments,
            summary=summary
        )


# Singleton instance
workout_generation_service = WorkoutGenerationService()
