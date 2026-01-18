"""Application configuration"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MediaPipe Configuration
MODEL_PATH = "pose_landmarker_full.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"

# SurveyMonkey Configuration
SURVEYMONKEY_TOKEN = os.getenv("SURVEYMONKEY_ACCESS_TOKEN", "")
SURVEYMONKEY_BASE_URL = os.getenv("SURVEYMONKEY_BASE_URL", "https://api.surveymonkey.com/v3")

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ElevenLabs Configuration
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# MongoDB Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "uottahack")

# CORS Configuration
CORS_ORIGINS = ["*"]  # In production, specify actual origins
