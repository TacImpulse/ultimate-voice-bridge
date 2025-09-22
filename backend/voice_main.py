"""
Ultimate Voice Bridge - Enhanced Backend with Real STT Processing
Optimized for RTX 5090 GPU acceleration
"""

import asyncio
import io
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import Settings
from app.websocket_manager import WebSocketManager
from services.stt_service import STTService
from utils.audio_utils import validate_audio_file, convert_audio_format, detect_voice_activity, get_audio_info

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global settings
settings = Settings()

# Service instances
stt_service: STTService = None
websocket_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("🚀 Starting Ultimate Voice Bridge with STT...")
    
    global stt_service
    
    # Initialize STT service
    try:
        stt_service = STTService()
        await stt_service.initialize()
        logger.info("✅ STT Service initialized with GPU support")
        
        logger.info("🎙️ Ultimate Voice Bridge is ready for voice processing!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Ultimate Voice Bridge...")
    
    if stt_service:
        await stt_service.cleanup()
    
    logger.info("👋 Ultimate Voice Bridge shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Ultimate Voice Bridge API with STT",
    description="State-of-the-art STT-TTS-LLM bridge with RTX 5090 GPU acceleration",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
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


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "🎙️ Ultimate Voice Bridge API with STT",
        "version": "1.1.0",
        "description": "State-of-the-art STT-TTS-LLM bridge with GPU acceleration",
        "features": [
            "🎤 Real-time Speech-to-Text (Whisper + RTX 5090)",
            "🤖 LLM Integration Ready",
            "🔊 TTS Voice Synthesis Ready", 
            "📊 GPU Performance Monitoring",
            "🎯 WebSocket Streaming Support"
        ],
        "endpoints": {
            "health": "/health",
            "stt": "/api/v1/stt",
            "stt_info": "/api/v1/stt/info",
            "audio_info": "/api/v1/audio/info",
            "websocket": "/ws",
            "docs": "/docs"
        },
        "status": "ready",
        "gpu_available": await check_gpu_available()
    }


@app.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    try:
        gpu_info = await get_gpu_info()
        stt_healthy = await stt_service.health_check() if stt_service else False
        
        # Get STT performance stats
        stt_stats = await stt_service.get_performance_stats() if stt_service else {}
        
        return {
            "status": "healthy" if stt_healthy else "degraded",
            "timestamp": asyncio.get_event_loop().time(),
            "services": {
                "stt": "healthy" if stt_healthy else "unhealthy",
                "gpu": "available" if gpu_info["cuda_available"] else "unavailable"
            },
            "gpu_info": gpu_info,
            "stt_stats": stt_stats,
            "version": "1.1.0"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "timestamp": asyncio.get_event_loop().time(),
            "error": str(e),
            "version": "1.1.0"
        }


@app.post("/api/v1/stt")
async def speech_to_text(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: str = Form("auto", description="Language code (auto for auto-detection)"),
    include_segments: bool = Form(False, description="Include detailed segment information"),
    trim_silence: bool = Form(True, description="Remove silence from audio")
):
    """
    🎤 Convert speech to text using Whisper with RTX 5090 acceleration
    
    Supports: WAV, MP3, FLAC, OGG, M4A, WebM
    Max file size: 50MB
    """
    try:
        # Validate audio file
        if not validate_audio_file(audio):
            raise HTTPException(
                status_code=400, 
                detail="Invalid audio file. Supported formats: WAV, MP3, FLAC, OGG, M4A, WebM"
            )
        
        # Read audio data
        audio_data = await audio.read()
        logger.info(f"📄 Processing audio file: {audio.filename} ({len(audio_data)} bytes)")
        
        # Get audio information
        audio_info = get_audio_info(audio_data)
        
        # Detect voice activity
        voice_activity = detect_voice_activity(audio_data)
        if not voice_activity['has_voice']:
            return {
                "text": "",
                "language": "unknown",
                "confidence": 0.0,
                "processing_time": 0.0,
                "message": "No voice activity detected in audio",
                "audio_info": audio_info,
                "voice_activity": voice_activity
            }
        
        # Convert to standard format for Whisper
        converted_audio, conversion_info = convert_audio_format(audio_data)
        
        # Process with silence trimming if requested
        final_audio = converted_audio
        if trim_silence:
            from utils.audio_utils import trim_silence
            final_audio = trim_silence(converted_audio)
        
        # Transcribe using STT service
        result = await stt_service.transcribe(final_audio, language=language)
        
        # Build response
        response = {
            "text": result["text"],
            "language": result["language"],
            "confidence": result["confidence"],
            "processing_time": result["processing_time"],
            "device_used": result["device_used"],
            "audio_info": audio_info,
            "conversion_info": conversion_info,
            "voice_activity": voice_activity
        }
        
        # Include segments if requested
        if include_segments and result.get("segments"):
            response["segments"] = result["segments"]
        
        logger.info(f"✅ Transcription successful: '{result['text'][:50]}...' ({result['processing_time']:.2f}s)")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ STT endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Speech transcription failed: {str(e)}")


@app.get("/api/v1/stt/info")
async def get_stt_info():
    """Get STT service information and performance statistics"""
    try:
        if not stt_service:
            raise HTTPException(status_code=503, detail="STT service not available")
        
        stats = await stt_service.get_performance_stats()
        gpu_info = await get_gpu_info()
        
        return {
            "service": "OpenAI Whisper with GPU acceleration",
            "model": settings.whisper_model,
            "device": stats.get("device", "unknown"),
            "gpu_info": gpu_info if gpu_info["cuda_available"] else None,
            "performance_stats": stats,
            "supported_languages": [
                "auto", "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh",
                "ar", "hi", "tr", "pl", "nl", "sv", "da", "no", "fi"
            ],
            "supported_formats": ["WAV", "MP3", "FLAC", "OGG", "M4A", "WebM"],
            "max_file_size_mb": 50,
            "features": [
                "🚀 GPU acceleration (RTX 5090)",
                "🎯 Real-time processing",
                "🌍 Multi-language support",
                "📊 Confidence scoring",
                "🔧 Voice activity detection",
                "✂️ Automatic silence trimming"
            ]
        }
        
    except Exception as e:
        logger.error(f"STT info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/audio/info")
async def analyze_audio(audio: UploadFile = File(..., description="Audio file to analyze")):
    """Analyze audio file and return detailed information"""
    try:
        if not validate_audio_file(audio):
            raise HTTPException(status_code=400, detail="Invalid audio file")
        
        audio_data = await audio.read()
        
        # Get comprehensive audio analysis
        audio_info = get_audio_info(audio_data)
        voice_activity = detect_voice_activity(audio_data)
        
        return {
            "filename": audio.filename,
            "audio_info": audio_info,
            "voice_activity": voice_activity,
            "analysis": {
                "suitable_for_stt": voice_activity['has_voice'] and audio_info['duration'] > 0.5,
                "recommended_processing": "trim_silence" if voice_activity['voice_percentage'] < 0.8 else "none",
                "quality_score": min(1.0, voice_activity['voice_percentage'] * 2)  # Simple quality metric
            }
        }
        
    except Exception as e:
        logger.error(f"Audio analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Enhanced WebSocket endpoint for real-time voice communication"""
    try:
        await websocket_manager.connect(websocket)
        logger.info(f"🔌 WebSocket client connected: {websocket.client}")
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "audio_chunk":
                # Process real-time audio chunk for streaming STT
                audio_data = data.get("audio_data")
                
                if audio_data and stt_service:
                    try:
                        # Convert base64 to bytes if needed
                        import base64
                        if isinstance(audio_data, str):
                            audio_bytes = base64.b64decode(audio_data)
                        else:
                            audio_bytes = audio_data
                        
                        # Stream transcribe
                        result = await stt_service.stream_transcribe(audio_bytes)
                        
                        if result:
                            await websocket.send_json({
                                "type": "transcription",
                                "text": result["text"],
                                "confidence": result.get("confidence", 0),
                                "language": result.get("language", "unknown"),
                                "is_final": True
                            })
                    except Exception as e:
                        logger.error(f"Stream transcription error: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Stream transcription failed: {str(e)}"
                        })
            
            elif data.get("type") == "ping":
                # Heartbeat
                await websocket.send_json({"type": "pong"})
                
        
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket client disconnected: {websocket.client}")
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })


async def check_gpu_available():
    """Check if GPU is available"""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


async def get_gpu_info():
    """Get detailed GPU information"""
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "cuda_available": True,
                "device_name": torch.cuda.get_device_name(0),
                "memory_gb": torch.cuda.get_device_properties(0).total_memory // 1024**3,
                "device_count": torch.cuda.device_count(),
                "cuda_version": torch.version.cuda
            }
        else:
            return {"cuda_available": False}
    except ImportError:
        return {"cuda_available": False, "error": "PyTorch not available"}


if __name__ == "__main__":
    logger.info("🎙️ Starting Ultimate Voice Bridge with STT...")
    logger.info(f"🎯 GPU Available: {asyncio.run(check_gpu_available())}")
    
    uvicorn.run(
        "voice_main:app",
        host=settings.backend_host,
        port=8001,  # Different port to avoid conflicts
        reload=False,
        log_level=settings.log_level.lower()
    )