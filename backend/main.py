from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import cv2
from PIL import Image
import io
import base64
from typing import Dict, List, Optional, Literal
from pydantic import BaseModel
import math
import os
import urllib.request

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Download model file if it doesn't exist
MODEL_PATH = "pose_landmarker_full.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"

if not os.path.exists(MODEL_PATH):
    try:
        print("Downloading pose landmarker model...")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Model downloaded successfully!")
    except Exception as e:
        print(f"Error downloading model: {e}")
        print("Please ensure you have an internet connection and try again.")
        raise

# Initialize MediaPipe Pose Landmarker
BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = vision.PoseLandmarker
PoseLandmarkerOptions = vision.PoseLandmarkerOptions
VisionRunningMode = vision.RunningMode

# Use VIDEO mode for better performance with sequential frames
options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.VIDEO,
    num_poses=1,
    min_pose_detection_confidence=0.5,
    min_pose_presence_confidence=0.5,
    min_tracking_confidence=0.5,
    output_segmentation_masks=False
)

pose_landmarker = PoseLandmarker.create_from_options(options)

# Track timestamp for VIDEO mode
import time
frame_timestamp_ms = int(time.time() * 1000)

# Pose landmark indices (MediaPipe Pose has 33 landmarks)
class PoseLandmark:
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32

# Exercise detection state
exercise_states = {
    "squat": {"count": 0, "stage": "up", "prev_angle": 180},
    "jumping_jack": {"count": 0, "stage": "closed", "prev_arm_distance": 0, "prev_leg_distance": 0},
    "burpee": {"count": 0, "stage": "standing", "prev_hip_y": 0},
    "mountain_climber": {"count": 0, "stage": "neutral", "prev_knee_y": 0, "knee_cycle": 0},
    "high_knee": {"count": 0, "stage": "down", "prev_left_knee_y": 0, "prev_right_knee_y": 0},
    "push_up": {"count": 0, "stage": "up", "prev_elbow_angle": 180},
    "lunge": {"count": 0, "stage": "standing", "prev_knee_angle": 180},
    "plank": {"count": 0, "stage": "not_plank", "hold_time": 0},
    "jump_squat": {"count": 0, "stage": "up", "prev_hip_y": 0, "prev_angle": 180},
    "star_jump": {"count": 0, "stage": "closed", "prev_arm_distance": 0, "prev_leg_distance": 0}
}

def calculate_angle(point1, point2, point3):
    """Calculate angle between three points (point2 is vertex)"""
    a = np.array([point1.x, point1.y])
    b = np.array([point2.x, point2.y])
    c = np.array([point3.x, point3.y])
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
    
    return angle

def calculate_distance(point1, point2):
    """Calculate Euclidean distance between two points"""
    return math.sqrt((point1.x - point2.x)**2 + (point1.y - point2.y)**2)

def detect_squat(landmarks):
    """Detect squat exercise"""
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    left_knee = landmarks[PoseLandmark.LEFT_KNEE]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    
    angle_knee = calculate_angle(left_hip, left_knee, left_ankle)
    
    state = exercise_states["squat"]
    
    # Detect squat down
    if angle_knee < 90 and state["stage"] == "up":
        state["stage"] = "down"
    
    # Detect squat up (rep complete)
    if angle_knee > 160 and state["stage"] == "down":
        state["stage"] = "up"
        state["count"] += 1
        return True
    
    return False

def detect_jumping_jack(landmarks):
    """Detect jumping jack exercise"""
    left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
    right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
    left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
    
    arm_distance = calculate_distance(left_wrist, right_wrist)
    leg_distance = calculate_distance(left_ankle, right_ankle)
    wrist_height = (left_wrist.y + right_wrist.y) / 2
    
    state = exercise_states["jumping_jack"]
    
    # Arms up and legs spread (open position)
    if arm_distance > 0.3 and leg_distance > 0.2 and wrist_height < left_shoulder.y:
        if state["stage"] == "closed":
            state["stage"] = "open"
    
    # Arms down and legs together (closed position)
    if arm_distance < 0.2 and leg_distance < 0.15:
        if state["stage"] == "open":
            state["stage"] = "closed"
            state["count"] += 1
            return True
    
    return False

def detect_burpee(landmarks):
    """Detect burpee exercise"""
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    left_knee = landmarks[PoseLandmark.LEFT_KNEE]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
    left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
    
    hip_y = left_hip.y
    wrist_y = left_wrist.y
    knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    
    state = exercise_states["burpee"]
    
    # State machine for burpee phases
    if state["stage"] == "standing":
        # Transition to squat
        if knee_angle < 100:
            state["stage"] = "squat"
    elif state["stage"] == "squat":
        # Transition to plank (hands down)
        if wrist_y > left_hip.y and hip_y > state["prev_hip_y"]:
            state["stage"] = "plank"
    elif state["stage"] == "plank":
        # Transition to jump (arms up, body up)
        if wrist_y < left_shoulder.y and hip_y < state["prev_hip_y"]:
            state["stage"] = "jump"
    elif state["stage"] == "jump":
        # Return to standing (rep complete)
        if knee_angle > 150 and hip_y < 0.6:
            state["stage"] = "standing"
            state["count"] += 1
            return True
    
    state["prev_hip_y"] = hip_y
    return False

def detect_mountain_climber(landmarks):
    """Detect mountain climber exercise"""
    left_knee = landmarks[PoseLandmark.LEFT_KNEE]
    right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
    left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
    right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    right_hip = landmarks[PoseLandmark.RIGHT_HIP]
    
    # Check if in plank position (hands on ground, body horizontal)
    wrist_y = (left_wrist.y + right_wrist.y) / 2
    hip_y = (left_hip.y + right_hip.y) / 2
    
    state = exercise_states["mountain_climber"]
    
    # Must be in plank position
    if wrist_y > hip_y and abs(wrist_y - hip_y) < 0.15:
        # Detect knee movement toward chest
        left_knee_up = left_knee.y < left_hip.y - 0.1
        right_knee_up = right_knee.y < right_hip.y - 0.1
        
        if state["stage"] == "neutral":
            if left_knee_up or right_knee_up:
                state["stage"] = "knee_up"
                state["knee_cycle"] += 1
        elif state["stage"] == "knee_up":
            # Knee returns down
            if not left_knee_up and not right_knee_up:
                state["stage"] = "neutral"
                # Count every 2 cycles (both legs)
                if state["knee_cycle"] >= 2:
                    state["count"] += 1
                    state["knee_cycle"] = 0
                    return True
    else:
        state["stage"] = "neutral"
        state["knee_cycle"] = 0
    
    return False

def detect_high_knee(landmarks):
    """Detect high knee exercise"""
    left_knee = landmarks[PoseLandmark.LEFT_KNEE]
    right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    right_hip = landmarks[PoseLandmark.RIGHT_HIP]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
    
    # Check if standing (ankles below hips)
    left_ankle_below = left_ankle.y > left_hip.y
    right_ankle_below = right_ankle.y > right_hip.y
    
    state = exercise_states["high_knee"]
    
    if left_ankle_below and right_ankle_below:
        # Detect knee lifting high
        left_knee_high = left_knee.y < left_hip.y - 0.15
        right_knee_high = right_knee.y < right_hip.y - 0.15
        
        if state["stage"] == "down":
            if left_knee_high or right_knee_high:
                state["stage"] = "up"
        elif state["stage"] == "up":
            # Knee returns down
            if not left_knee_high and not right_knee_high:
                state["stage"] = "down"
                state["count"] += 1
                return True
    
    return False

def detect_push_up(landmarks):
    """Detect push-up exercise"""
    left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
    left_elbow = landmarks[PoseLandmark.LEFT_ELBOW]
    left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
    right_shoulder = landmarks[PoseLandmark.RIGHT_SHOULDER]
    right_elbow = landmarks[PoseLandmark.RIGHT_ELBOW]
    right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
    
    # Calculate average elbow angle
    left_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
    right_angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
    avg_angle = (left_angle + right_angle) / 2
    
    # Check if in push-up position (hands below shoulders)
    wrist_y = (left_wrist.y + right_wrist.y) / 2
    shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
    
    state = exercise_states["push_up"]
    
    # Must be in push-up position
    if wrist_y > shoulder_y:
        # Detect push-up down (elbow bends)
        if avg_angle < 90 and state["stage"] == "up":
            state["stage"] = "down"
        
        # Detect push-up up (elbow straightens, rep complete)
        if avg_angle > 160 and state["stage"] == "down":
            state["stage"] = "up"
            state["count"] += 1
            return True
    
    return False

def detect_lunge(landmarks):
    """Detect lunge exercise"""
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    left_knee = landmarks[PoseLandmark.LEFT_KNEE]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    right_hip = landmarks[PoseLandmark.RIGHT_HIP]
    right_knee = landmarks[PoseLandmark.RIGHT_KNEE]
    right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
    
    # Calculate knee angles for both legs
    left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)
    
    # Detect which leg is forward (ankle in front of hip)
    left_forward = left_ankle.x < left_hip.x
    right_forward = right_ankle.x > right_hip.x
    
    state = exercise_states["lunge"]
    
    if state["stage"] == "standing":
        # Transition to lunge down
        if (left_forward and left_knee_angle < 90) or (right_forward and right_knee_angle < 90):
            state["stage"] = "down"
    elif state["stage"] == "down":
        # Return to standing (rep complete)
        if left_knee_angle > 150 and right_knee_angle > 150:
            state["stage"] = "standing"
            state["count"] += 1
            return True
    
    return False

def detect_plank(landmarks):
    """Detect plank exercise (counts seconds held)"""
    left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
    right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
    
    # Check if body is straight and horizontal (plank position)
    shoulder_hip_ankle_angle = calculate_angle(left_shoulder, left_hip, left_ankle)
    wrist_y = (left_wrist.y + right_wrist.y) / 2
    hip_y = left_hip.y
    
    state = exercise_states["plank"]
    
    # Plank position: body straight (angle ~180), hands on ground
    is_plank = (170 < shoulder_hip_ankle_angle < 190 and 
                wrist_y > hip_y and 
                abs(wrist_y - hip_y) < 0.2)
    
    if is_plank:
        if state["stage"] == "not_plank":
            state["stage"] = "plank"
            state["hold_time"] = 0
        else:
            state["hold_time"] += 1
            # Count every 30 frames (~1 second at 30fps)
            if state["hold_time"] % 30 == 0:
                state["count"] += 1
                return True
    else:
        state["stage"] = "not_plank"
        state["hold_time"] = 0
    
    return False

def detect_jump_squat(landmarks):
    """Detect jump squat exercise"""
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    left_knee = landmarks[PoseLandmark.LEFT_KNEE]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    
    angle_knee = calculate_angle(left_hip, left_knee, left_ankle)
    hip_y = left_hip.y
    
    state = exercise_states["jump_squat"]
    
    if state["stage"] == "up":
        # Detect squat down
        if angle_knee < 90:
            state["stage"] = "down"
            state["prev_hip_y"] = hip_y
    elif state["stage"] == "down":
        # Detect jump (hip moves up significantly)
        if hip_y < state["prev_hip_y"] - 0.05:
            state["stage"] = "jump"
        state["prev_hip_y"] = hip_y
    elif state["stage"] == "jump":
        # Return to standing (rep complete)
        if angle_knee > 160 and hip_y > state["prev_hip_y"] - 0.02:
            state["stage"] = "up"
            state["count"] += 1
            return True
        state["prev_hip_y"] = hip_y
    
    return False

def detect_star_jump(landmarks):
    """Detect star jump exercise"""
    left_wrist = landmarks[PoseLandmark.LEFT_WRIST]
    right_wrist = landmarks[PoseLandmark.RIGHT_WRIST]
    left_ankle = landmarks[PoseLandmark.LEFT_ANKLE]
    right_ankle = landmarks[PoseLandmark.RIGHT_ANKLE]
    left_shoulder = landmarks[PoseLandmark.LEFT_SHOULDER]
    left_hip = landmarks[PoseLandmark.LEFT_HIP]
    
    arm_distance = calculate_distance(left_wrist, right_wrist)
    leg_distance = calculate_distance(left_ankle, right_ankle)
    wrist_height = (left_wrist.y + right_wrist.y) / 2
    
    state = exercise_states["star_jump"]
    
    # Star position: arms and legs spread wide, arms above head
    if (arm_distance > 0.4 and leg_distance > 0.25 and 
        wrist_height < left_shoulder.y - 0.1):
        if state["stage"] == "closed":
            state["stage"] = "open"
    
    # Closed position: arms and legs together
    if arm_distance < 0.2 and leg_distance < 0.15:
        if state["stage"] == "open":
            state["stage"] = "closed"
            state["count"] += 1
            return True
    
    return False

class SurveyQuestion(BaseModel):
    id: str
    question: str
    type: Literal["multiple_choice", "short_answer"]
    options: Optional[List[str]] = None  # Only for multiple_choice


class WorkoutPreferences(BaseModel):
    time: int  # in minutes
    intensity: Literal["low", "medium", "high"]
    body_part: str  # e.g., "upper", "lower", "full", "arms", "legs", etc.
    equipment_available: Optional[List[str]] = []  # e.g., ["dumbbells", "pull-up bar"]


class GenerateWorkoutRequest(BaseModel):
    preferences: WorkoutPreferences
    survey_questions: List[SurveyQuestion]


class Exercise(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration: Optional[int] = None  # in seconds
    equipment: Optional[str] = None


class ExerciseMapping(BaseModel):
    option: str  # The multiple choice option text
    exercise: Exercise


class WorkoutSegment(BaseModel):
    question_id: str
    question: str
    question_type: str
    option_exercise_mapping: Optional[List[ExerciseMapping]] = None  # Explicit mapping: option -> exercise
    exercises: List[Exercise] = []  # Keep for backwards compatibility
    is_break: bool = False  # True for short_answer questions


class GeneratedWorkout(BaseModel):
    total_duration: int  # in minutes
    segments: List[WorkoutSegment]
    summary: str


def mock_llm_generate_workout(preferences: WorkoutPreferences, questions: List[SurveyQuestion]) -> GeneratedWorkout:
    """
    Mock LLM call that generates a workout based on preferences and survey questions.
    In production, this would call Gemini API.
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


@app.get("/")
def read_root():
    return {"message": "HIIT Exercise Detection API"}

@app.post("/process-frame")
async def process_frame(file: UploadFile = File(...)):
    """Process a video frame and detect exercises"""
    try:
        # Read image data
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        # Use faster decode flags
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR | cv2.IMREAD_IGNORE_ORIENTATION)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Resize image early for faster processing (before color conversion)
        height, width = img.shape[:2]
        if width > 640:
            scale = 640 / width
            new_width = 640
            new_height = int(height * scale)
            img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
        
        # Convert BGR to RGB and ensure contiguous array
        rgb_image = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        rgb_image = np.ascontiguousarray(rgb_image)
        
        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        # Process with MediaPipe Pose Landmarker (VIDEO mode for better performance)
        global frame_timestamp_ms
        frame_timestamp_ms += 33  # ~30 FPS increment
        detection_result = pose_landmarker.detect_for_video(mp_image, frame_timestamp_ms)
        
        if not detection_result.pose_landmarks or len(detection_result.pose_landmarks) == 0:
            return {
                "detected": False,
                "exercises": {
                    "squat": exercise_states["squat"]["count"],
                    "jumping_jack": exercise_states["jumping_jack"]["count"],
                    "burpee": exercise_states["burpee"]["count"],
                    "mountain_climber": exercise_states["mountain_climber"]["count"],
                    "high_knee": exercise_states["high_knee"]["count"],
                    "push_up": exercise_states["push_up"]["count"],
                    "lunge": exercise_states["lunge"]["count"],
                    "plank": exercise_states["plank"]["count"],
                    "jump_squat": exercise_states["jump_squat"]["count"],
                    "star_jump": exercise_states["star_jump"]["count"]
                },
                "landmarks": None
            }
        
        # Get first pose landmarks
        landmarks = detection_result.pose_landmarks[0]
        
        # Detect exercises
        squat_detected = detect_squat(landmarks)
        jumping_jack_detected = detect_jumping_jack(landmarks)
        burpee_detected = detect_burpee(landmarks)
        mountain_climber_detected = detect_mountain_climber(landmarks)
        high_knee_detected = detect_high_knee(landmarks)
        push_up_detected = detect_push_up(landmarks)
        lunge_detected = detect_lunge(landmarks)
        plank_detected = detect_plank(landmarks)
        jump_squat_detected = detect_jump_squat(landmarks)
        star_jump_detected = detect_star_jump(landmarks)
        
        # Convert landmarks to list for JSON serialization
        landmarks_list = [
            {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
            for lm in landmarks
        ]
        
        return {
            "detected": True,
            "exercises": {
                "squat": exercise_states["squat"]["count"],
                "jumping_jack": exercise_states["jumping_jack"]["count"],
                "burpee": exercise_states["burpee"]["count"],
                "mountain_climber": exercise_states["mountain_climber"]["count"],
                "high_knee": exercise_states["high_knee"]["count"],
                "push_up": exercise_states["push_up"]["count"],
                "lunge": exercise_states["lunge"]["count"],
                "plank": exercise_states["plank"]["count"],
                "jump_squat": exercise_states["jump_squat"]["count"],
                "star_jump": exercise_states["star_jump"]["count"]
            },
            "landmarks": landmarks_list,
            "current_detections": {
                "squat": squat_detected,
                "jumping_jack": jumping_jack_detected,
                "burpee": burpee_detected,
                "mountain_climber": mountain_climber_detected,
                "high_knee": high_knee_detected,
                "push_up": push_up_detected,
                "lunge": lunge_detected,
                "plank": plank_detected,
                "jump_squat": jump_squat_detected,
                "star_jump": star_jump_detected
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset-counters")
async def reset_counters():
    """Reset all exercise counters"""
    for exercise in exercise_states:
        exercise_states[exercise]["count"] = 0
    return {"message": "Counters reset"}

@app.get("/counters")
async def get_counters():
    """Get current exercise counters"""
    return {
        exercise_name: state["count"] 
        for exercise_name, state in exercise_states.items()
    }

@app.post("/generate-workout", response_model=GeneratedWorkout)
def generate_workout(request: GenerateWorkoutRequest):
    """
    Generate a workout plan based on preferences and survey questions.
    Mock LLM call simulates workout generation.
    """
    workout = mock_llm_generate_workout(request.preferences, request.survey_questions)
    return workout


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}