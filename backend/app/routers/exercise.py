"""Exercise detection router"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np
import cv2
import mediapipe as mp
from app.services.pose_detection import pose_detection_service
from app.services.exercise_detection import exercise_detection_service

router = APIRouter()


@router.post("/process-frame")
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
        detection_result = pose_detection_service.detect_pose(mp_image)
        
        # Only track the 4 hardcoded exercises: push_up, squat, jumping_jack, arm_circle
        four_exercises = ["push_up", "squat", "jumping_jack", "arm_circle"]
        
        if not detection_result.pose_landmarks or len(detection_result.pose_landmarks) == 0:
            all_counters = exercise_detection_service.get_counters()
            filtered_counters = {key: all_counters.get(key, 0) for key in four_exercises}
            return {
                "detected": False,
                "exercises": filtered_counters,
                "landmarks": None
            }
        
        # Get first pose landmarks
        landmarks = detection_result.pose_landmarks[0]
        
        # Detect exercises (still detects all, but we'll filter the response)
        current_detections = exercise_detection_service.detect_all_exercises(landmarks)
        
        # Get all counters and filter to only the 4 we care about
        all_counters = exercise_detection_service.get_counters()
        filtered_counters = {key: all_counters.get(key, 0) for key in four_exercises}
        
        # Convert landmarks to list for JSON serialization
        landmarks_list = [
            {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
            for lm in landmarks
        ]
        
        # Filter current_detections to only the 4 exercises
        filtered_current_detections = {key: current_detections.get(key, False) for key in four_exercises}
        
        return {
            "detected": True,
            "exercises": filtered_counters,
            "landmarks": landmarks_list,
            "current_detections": filtered_current_detections
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset-counters")
async def reset_counters():
    """Reset all exercise counters"""
    exercise_detection_service.reset_counters()
    return {"message": "Counters reset"}


@router.get("/counters")
async def get_counters():
    """Get current exercise counters (only the 4 hardcoded exercises)"""
    all_counters = exercise_detection_service.get_counters()
    four_exercises = ["push_up", "squat", "jumping_jack", "arm_circle"]
    return {key: all_counters.get(key, 0) for key in four_exercises}
