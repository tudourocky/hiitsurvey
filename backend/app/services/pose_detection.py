"""MediaPipe pose detection service"""
import os
import time
import urllib.request
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from app.config import MODEL_PATH, MODEL_URL


class PoseDetectionService:
    """Service for MediaPipe pose detection"""
    
    def __init__(self):
        self._pose_landmarker = None
        self._frame_timestamp_ms = int(time.time() * 1000)
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize MediaPipe pose landmarker model"""
        # Download model file if it doesn't exist
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
        
        self._pose_landmarker = PoseLandmarker.create_from_options(options)
    
    def detect_pose(self, mp_image):
        """Detect pose in a MediaPipe image"""
        # Increment timestamp for VIDEO mode (~30 FPS)
        self._frame_timestamp_ms += 33
        detection_result = self._pose_landmarker.detect_for_video(mp_image, self._frame_timestamp_ms)
        return detection_result


# Singleton instance
pose_detection_service = PoseDetectionService()
