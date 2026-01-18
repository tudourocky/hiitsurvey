"""Workout generation service"""
import random
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
        pass
    
    def generate_workout(self, preferences: WorkoutPreferences, questions: list[SurveyQuestion]) -> GeneratedWorkout:
        """
        Generate a workout plan based on survey questions.
        Ignores LLM and user preferences - always uses the 4 mandatory exercises with 10 reps each.
        Maps exercises to survey options (truncates to max 4 options per question).
        """
        # Skip LLM call entirely - just use mock generation
        return self._generate_mock_workout(preferences, questions)
    
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
                # Multiple choice: randomly assign the 4 exercises to options (max 4 options)
                option_mappings = []
                exercises_list = []
                
                # Map each option to one of the 4 hardcoded exercises
                options = question.options or []
                # Truncate to max 4 options if there are more
                num_options = min(len(options), 4)
                truncated_options = options[:num_options]
                
                # Randomize the order of exercises for this question
                shuffled_exercises = four_exercises.copy()
                random.shuffle(shuffled_exercises)
                
                for j, option in enumerate(truncated_options):
                    # Assign exercises in random order for this question
                    exercise_name = shuffled_exercises[j]
                    exercise = Exercise(
                        name=exercise_name,
                        sets=None,
                        reps=FIXED_REPS,  # Always 10 reps
                        equipment=None
                    )
                    # Create explicit mapping: option -> exercise
                    option_mappings.append(ExerciseMapping(option=option, exercise=exercise))
                    # Add exercise to exercises_list (check by name to avoid duplicates)
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
