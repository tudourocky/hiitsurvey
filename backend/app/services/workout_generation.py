"""Workout generation service"""
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
    
    def generate_workout(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> GeneratedWorkout:
        """
        Generate a workout plan based on preferences and survey questions.
        Mock LLM call that generates a workout. In production, this would call Gemini API.
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
