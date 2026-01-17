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
from typing import Dict, List, Optional
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
    "burpee": {"count": 0, "stage": "standing", "prev_hip_y": 0}
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
                    "burpee": exercise_states["burpee"]["count"]
                },
                "landmarks": None
            }
        
        # Get first pose landmarks
        landmarks = detection_result.pose_landmarks[0]
        
        # Detect exercises
        squat_detected = detect_squat(landmarks)
        jumping_jack_detected = detect_jumping_jack(landmarks)
        burpee_detected = detect_burpee(landmarks)
        
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
                "burpee": exercise_states["burpee"]["count"]
            },
            "landmarks": landmarks_list,
            "current_detections": {
                "squat": squat_detected,
                "jumping_jack": jumping_jack_detected,
                "burpee": burpee_detected
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reset-counters")
async def reset_counters():
    """Reset all exercise counters"""
    exercise_states["squat"]["count"] = 0
    exercise_states["jumping_jack"]["count"] = 0
    exercise_states["burpee"]["count"] = 0
    return {"message": "Counters reset"}

@app.get("/counters")
async def get_counters():
    """Get current exercise counters"""
    return {
        "squat": exercise_states["squat"]["count"],
        "jumping_jack": exercise_states["jumping_jack"]["count"],
        "burpee": exercise_states["burpee"]["count"]
    }