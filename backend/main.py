"""
Ultimate Voice Bridge - FastAPI Backend
State-of-the-art STT-TTS-LLM bridge with real-time voice processing
"""

import asyncio
import io
import logging
from contextlib import asynccontextmanager
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import Settings
from app.websocket_manager import WebSocketManager
from services.stt_service import STTService
from services.tts_service import TTSService
from services.llm_service import LLMService
from models.voice_models import (
    TranscriptionRequest, 
    TranscriptionResponse,
    TTSRequest,
    TTSResponse,
    LLMRequest,
    LLMResponse,
    VoiceMessage,
    HealthResponse
)
from utils.audio_utils import validate_audio_file
from utils.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Global settings
settings = Settings()

# Service instances
stt_service: STTService = None
tts_service: TTSService = None
llm_service: LLMService = None
websocket_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("🚀 Starting Ultimate Voice Bridge...")
    
    global stt_service, tts_service, llm_service
    
    # Initialize services
    try:
        stt_service = STTService()
        await stt_service.initialize()
        logger.info("✅ STT Service initialized")
        
        tts_service = TTSService()
        await tts_service.initialize()
        logger.info("✅ TTS Service initialized")
        
        llm_service = LLMService()
        await llm_service.initialize()
        logger.info("✅ LLM Service initialized")
        
        logger.info("🎙️ Ultimate Voice Bridge is ready!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Ultimate Voice Bridge...")
    
    if stt_service:
        await stt_service.cleanup()
    if tts_service:
        await tts_service.cleanup()
    if llm_service:
        await llm_service.cleanup()
    
    logger.info("👋 Ultimate Voice Bridge shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Ultimate Voice Bridge API",
    description="State-of-the-art STT-TTS-LLM bridge with real-time voice processing",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount static files for audio samples (optional)
# app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_model=dict)
async def root():
    """Root endpoint with API information"""
    return {
        "message": "🎙️ Ultimate Voice Bridge API",
        "version": "1.0.0",
        "description": "State-of-the-art STT-TTS-LLM bridge",
        "endpoints": {
            "health": "/health",
            "stt": "/api/v1/stt",
            "tts": "/api/v1/tts", 
            "llm": "/api/v1/llm",
            "voice_chat": "/api/v1/voice-chat",
            "websocket": "/ws",
            "docs": "/docs"
        },
        "status": "ready"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check service health
        stt_healthy = await stt_service.health_check() if stt_service else False
        tts_healthy = await tts_service.health_check() if tts_service else False
        llm_healthy = await llm_service.health_check() if llm_service else False
        
        overall_healthy = stt_healthy and tts_healthy and llm_healthy
        
        return HealthResponse(
            status="healthy" if overall_healthy else "degraded",
            timestamp=asyncio.get_event_loop().time(),
            services={
                "stt": "healthy" if stt_healthy else "unhealthy",
                "tts": "healthy" if tts_healthy else "unhealthy", 
                "llm": "healthy" if llm_healthy else "unhealthy"
            },
            version="1.0.0"
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            timestamp=asyncio.get_event_loop().time(),
            services={
                "stt": "unknown",
                "tts": "unknown",
                "llm": "unknown"
            },
            version="1.0.0",
            error=str(e)
        )


@app.post("/api/v1/stt", response_model=TranscriptionResponse)
async def speech_to_text(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: str = Form("auto", description="Language code (auto for auto-detection)")
):
    """Convert speech to text using Whisper"""
    try:
        # Validate audio file
        if not validate_audio_file(audio):
            raise HTTPException(status_code=400, detail="Invalid audio file format")
        
        # Read audio data
        audio_data = await audio.read()
        
        # Transcribe using STT service
        result = await stt_service.transcribe(audio_data, language=language)
        
        return TranscriptionResponse(**result)
        
    except Exception as e:
        logger.error(f"STT error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/v1/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using Coqui TTS"""
    try:
        # Generate speech using TTS service
        audio_data = await tts_service.generate_speech(
            text=request.text,
            voice=request.voice,
            speed=request.speed,
            pitch=request.pitch
        )
        
        # Return audio file as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=speech.wav"}
        )
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {str(e)}")


@app.post("/api/v1/llm", response_model=LLMResponse)
async def chat_completion(request: LLMRequest):
    """Generate LLM response"""
    try:
        # Generate response using LLM service
        response = await llm_service.generate_response(
            messages=request.messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return LLMResponse(**response)
        
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {str(e)}")


@app.post("/api/v1/voice-chat")
async def voice_chat_pipeline(
    audio: UploadFile = File(..., description="Audio file with user's voice message"),
    voice: str = Form("default", description="TTS voice to use for response"),
    model: str = Form("default", description="LLM model to use"),
    language: str = Form("auto", description="STT language")
):
    """Complete voice chat pipeline: STT -> LLM -> TTS"""
    try:
        # Step 1: Speech to Text
        audio_data = await audio.read()
        stt_result = await stt_service.transcribe(audio_data, language=language)
        
        if not stt_result.get("text"):
            raise HTTPException(status_code=400, detail="No speech detected in audio")
        
        # Step 2: Generate LLM response
        messages = [{"role": "user", "content": stt_result["text"]}]
        llm_result = await llm_service.generate_response(messages=messages, model=model)
        
        if not llm_result.get("response"):
            raise HTTPException(status_code=500, detail="LLM failed to generate response")
        
        # Step 3: Text to Speech
        tts_audio = await tts_service.generate_speech(
            text=llm_result["response"],
            voice=voice
        )
        
        # Return combined result
        return {
            "transcript": stt_result["text"],
            "llm_response": llm_result["response"],
            "audio_response": tts_audio,
            "processing_time": {
                "stt": stt_result.get("processing_time", 0),
                "llm": llm_result.get("processing_time", 0),
                "tts": await tts_service.get_last_processing_time()
            }
        }
        
    except Exception as e:
        logger.error(f"Voice chat pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time voice communication"""
    try:
        await websocket_manager.connect(websocket)
        logger.info(f"WebSocket client connected: {websocket.client}")
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "audio_chunk":
                # Process real-time audio chunk
                audio_chunk = data.get("audio_data")
                
                # Stream STT results
                if audio_chunk:
                    stt_result = await stt_service.stream_transcribe(audio_chunk)
                    if stt_result:
                        await websocket.send_json({
                            "type": "transcription",
                            "text": stt_result["text"],
                            "confidence": stt_result.get("confidence", 0)
                        })
            
            elif data.get("type") == "text_message":
                # Process text message through LLM and TTS
                text = data.get("text")
                
                # Generate LLM response
                messages = [{"role": "user", "content": text}]
                llm_response = await llm_service.generate_response(messages=messages)
                
                # Send text response
                await websocket.send_json({
                    "type": "llm_response",
                    "text": llm_response["response"]
                })
                
                # Generate and send audio response
                audio_data = await tts_service.generate_speech(
                    text=llm_response["response"]
                )
                
                await websocket.send_json({
                    "type": "audio_response",
                    "audio_data": audio_data
                })
            
            elif data.get("type") == "ping":
                # Heartbeat
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {websocket.client}")
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": asyncio.get_event_loop().time()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": asyncio.get_event_loop().time()
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.reload,
        log_level=settings.log_level.lower()
    )