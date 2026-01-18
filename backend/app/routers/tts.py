"""Text-to-Speech router using ElevenLabs API"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from elevenlabs.client import ElevenLabs
from app.config import ELEVENLABS_API_KEY
import io

router = APIRouter()

# Initialize ElevenLabs client (will be set on first request if API key is available)
_client = None


def get_client():
    """Get or create ElevenLabs client"""
    global _client
    if _client is None and ELEVENLABS_API_KEY:
        _client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    return _client


class TextToSpeechRequest(BaseModel):
    """Request model for text-to-speech"""
    text: str
    voice_id: str = "JBFqnCBsd6RMkjVDRZzb"  # Default: Adam voice
    model_id: str = "eleven_multilingual_v2"
    output_format: str = "mp3_44100_128"


@router.post("/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Convert text to speech using ElevenLabs API.
    Returns audio as a streaming response.
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in your environment."
        )
    
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )
    
    try:
        client = get_client()
        if not client:
            raise HTTPException(
                status_code=500,
                detail="Failed to initialize ElevenLabs client"
            )
        
        print(f"🎤 Generating speech for text: {request.text[:50]}...")
        
        # Generate audio using the client
        audio_generator = client.text_to_speech.convert(
            text=request.text,
            voice_id=request.voice_id,
            model_id=request.model_id,
            output_format=request.output_format
        )
        
        # Convert generator to bytes
        audio_chunks = []
        for chunk in audio_generator:
            if chunk:
                audio_chunks.append(chunk)
        
        audio_bytes = b"".join(audio_chunks)
        
        print(f"✅ Generated audio: {len(audio_bytes)} bytes")
        
        if len(audio_bytes) == 0:
            raise HTTPException(
                status_code=500,
                detail="Generated audio is empty"
            )
        
        # Determine content type based on output format
        content_type = "audio/mpeg"  # Default for mp3
        if "mp3" in request.output_format:
            content_type = "audio/mpeg"
        elif "wav" in request.output_format:
            content_type = "audio/wav"
        elif "pcm" in request.output_format:
            content_type = "audio/pcm"
        
        # Return as Response (not StreamingResponse) for better compatibility
        # StreamingResponse can sometimes have issues with blob() in the frontend
        return Response(
            content=audio_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": "inline; filename=speech.mp3",
                "Content-Length": str(len(audio_bytes)),
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating speech: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate speech: {str(e)}"
        )
