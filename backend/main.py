"""
Ultimate Voice Bridge - FastAPI Backend
State-of-the-art STT-TTS-LLM bridge with real-time voice processing
"""

import asyncio
import io
import logging
from contextlib import asynccontextmanager
from typing import List, Dict

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
from services.vibevoice_service import VibeVoiceService
from services.conversation_engine import ConversationEngine, ConversationStyle, EmotionType

# RTX 5090 GPU Acceleration imports
try:
    from services.onnx_acceleration_service import ONNXAccelerationService
    from utils.onnx_converter import ONNXConverter
    GPU_ACCELERATION_AVAILABLE = True
except ImportError:
    GPU_ACCELERATION_AVAILABLE = False
from models.voice_models import (
    TranscriptionRequest, 
    TranscriptionResponse,
    TTSRequest,
    TTSResponse,
    LLMRequest,
    LLMResponse,
    VoiceMessage,
    HealthResponse,
    VoiceCloneRequest,
    VoiceCloneResponse,
    VoiceCloneTestRequest,
    VoiceCloneTestResponse,
    VoiceCloneListResponse
)

# VibeVoice conversation request model
class VibeVoiceConversationRequest(BaseModel):
    script: str = Field(..., description="Conversation script with speaker indicators")
    speaker_voices: Dict[str, str] = Field(
        default={"Speaker 1": "vibevoice_vibevoice-alice", "Speaker 2": "vibevoice_vibevoice-andrew"}, 
        description="Mapping of speaker names to voice IDs"
    )
    output_format: str = Field(default="wav", description="Output audio format")
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
vibevoice_service: VibeVoiceService = None
onnx_acceleration_service: ONNXAccelerationService = None
conversation_engine: ConversationEngine = None
websocket_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager"""
    # Startup
    logger.info("🚀 Starting Ultimate Voice Bridge...")
    
    global stt_service, tts_service, llm_service, vibevoice_service, onnx_acceleration_service, conversation_engine
    
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
        
        # Initialize RTX 5090 GPU Acceleration (if available)
        if GPU_ACCELERATION_AVAILABLE and settings.gpu_acceleration_enabled:
            logger.info("🚀 Initializing RTX 5090 GPU Acceleration...")
            try:
                onnx_acceleration_service = ONNXAccelerationService()
                await onnx_acceleration_service.initialize()
                logger.info("✅ RTX 5090 GPU Acceleration initialized successfully!")
                
                # Initialize VibeVoice with GPU acceleration
                vibevoice_service = VibeVoiceService()
                await vibevoice_service.initialize()
                logger.info("✅ VibeVoice with GPU Acceleration initialized")
                
                # Initialize ConversationEngine with VibeVoice
                conversation_engine = ConversationEngine(vibevoice_service)
                logger.info("✅ Multi-Speaker Conversation Engine initialized")
                
                # Log GPU info
                if onnx_acceleration_service.device_info:
                    gpu_name = onnx_acceleration_service.device_info.get('gpu_name', 'Unknown')
                    cuda_available = onnx_acceleration_service.device_info.get('cuda_available', False)
                    logger.info(f"🎮 GPU: {gpu_name} (CUDA: {cuda_available})")
                
            except Exception as e:
                logger.warning(f"⚠️ RTX 5090 GPU acceleration initialization failed: {e}")
                logger.info("🚑 Falling back to CPU-only operation")
                onnx_acceleration_service = None
                vibevoice_service = None
        else:
            if not GPU_ACCELERATION_AVAILABLE:
                logger.info("💻 GPU acceleration libraries not available - running CPU-only")
            else:
                logger.info("💻 GPU acceleration disabled in settings - running CPU-only")
        
        logger.info("🎤️ Ultimate Voice Bridge is ready!")
        
        # Display startup summary
        startup_summary = [
            f"STT Service: {'✅' if stt_service else '❌'}",
            f"TTS Service: {'✅' if tts_service else '❌'}",
            f"LLM Service: {'✅' if llm_service else '❌'}",
            f"GPU Acceleration: {'🚀 RTX 5090' if onnx_acceleration_service else '💻 CPU Only'}",
            f"VibeVoice GPU: {'✅' if vibevoice_service else '❌'}"
        ]
        
        logger.info("🎯 Service Status Summary:")
        for status in startup_summary:
            logger.info(f"   {status}")
        
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
    
    # Cleanup RTX 5090 GPU Acceleration services
    if vibevoice_service:
        await vibevoice_service.cleanup()
        logger.info("✅ VibeVoice GPU service cleaned up")
    if onnx_acceleration_service:
        await onnx_acceleration_service.cleanup()
        logger.info("✅ RTX 5090 GPU acceleration service cleaned up")
    
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
            "models": "/api/v1/models",
            "voice_chat": "/api/v1/voice-chat",
            "voice_to_llm": "/api/v1/voice-to-llm",
            "vibevoice_conversation": "/api/v1/vibevoice-conversation",
            "vibevoice_voices": "/api/v1/vibevoice-voices",
            "voice_clone": "/api/v1/voice-clone",
            "voice_clone_test": "/api/v1/voice-clone/test",
            "voice_clones_list": "/api/v1/voice-clones",
            "conversation_create": "/api/v1/conversation/create",
            "conversation_styles": "/api/v1/conversation/styles",
            "conversation_emotions": "/api/v1/conversation/emotions",
            "conversation_analytics": "/api/v1/conversation/analytics",
            "conversation_clear_history": "/api/v1/conversation/clear-history",
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
        
        # Check GPU acceleration health
        gpu_acceleration_healthy = False  # Default to False
        vibevoice_gpu_healthy = True
        
        if onnx_acceleration_service:
            try:
                gpu_metrics = await onnx_acceleration_service.get_performance_metrics()
                gpu_acceleration_healthy = gpu_metrics.get('status') in ['healthy', 'degraded']
                logger.info(f"🎮 GPU acceleration status: {gpu_metrics.get('status_detail', 'Unknown')}")
            except Exception as e:
                logger.warning(f"⚠️ GPU acceleration health check failed: {e}")
                gpu_acceleration_healthy = False
        else:
            logger.info("💻 ONNX acceleration service not initialized")
        
        if vibevoice_service:
            try:
                vibevoice_gpu_healthy = await vibevoice_service.health_check()
            except:
                vibevoice_gpu_healthy = False
        
        overall_healthy = stt_healthy and tts_healthy and llm_healthy
        
        return HealthResponse(
            status="healthy" if overall_healthy else "degraded",
            timestamp=asyncio.get_event_loop().time(),
            services={
                "stt": "healthy" if stt_healthy else "unhealthy",
                "tts": "healthy" if tts_healthy else "unhealthy", 
                "llm": "healthy" if llm_healthy else "unhealthy",
                "gpu_acceleration": "healthy" if gpu_acceleration_healthy else "unavailable",
                "vibevoice_gpu": "healthy" if vibevoice_gpu_healthy else "unavailable"
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


# Voice test endpoint request model
class VoiceTestRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize for testing")
    voice_id: str = Field(..., description="Voice ID to test")
    speaker_name: str = Field(default="Test Speaker", description="Speaker name for testing")


@app.post("/api/v1/tts/test-voice")
async def test_voice(request: VoiceTestRequest):
    """Test a specific voice with given text - supports both VibeVoice and custom voice clones"""
    try:
        logger.info(f"🎤 Testing voice: {request.voice_id} for speaker: {request.speaker_name}")
        logger.info(f"📝 Test text: '{request.text[:100]}{'...' if len(request.text) > 100 else ''}'")
        
        # Check if it's a VibeVoice voice (vibevoice- prefix)
        if request.voice_id.startswith('vibevoice-'):
            # Use VibeVoice service if available
            if vibevoice_service:
                logger.info(f"🎵 Using VibeVoice service for voice: {request.voice_id}")
                
                # Create a simple single-speaker conversation for testing
                test_script = f"{request.speaker_name}: {request.text}"
                speaker_mapping = {request.speaker_name: request.voice_id}
                
                # Generate audio using VibeVoice
                audio_data = await vibevoice_service.generate_conversation(
                    script=test_script,
                    speaker_mapping=speaker_mapping,
                    conversation_style="natural"
                )
                
                logger.info(f"✅ VibeVoice test audio generated: {len(audio_data)} bytes")
                
                return StreamingResponse(
                    io.BytesIO(audio_data),
                    media_type="audio/wav",
                    headers={
                        "Content-Disposition": f"inline; filename=voice_test_{request.voice_id}.wav",
                        "X-Voice-ID": request.voice_id,
                        "X-Speaker-Name": request.speaker_name,
                        "X-Voice-Engine": "VibeVoice"
                    }
                )
            else:
                logger.warning("⚠️ VibeVoice service not available, falling back to regular TTS")
        
        # Fallback to regular TTS service for other voices or if VibeVoice fails
        logger.info(f"🎵 Using standard TTS service for voice: {request.voice_id}")
        
        # Generate speech using standard TTS service
        audio_data = await tts_service.generate_speech(
            text=request.text,
            voice=request.voice_id
        )
        
        logger.info(f"✅ Standard TTS test audio generated: {len(audio_data)} bytes")
        
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"inline; filename=voice_test_{request.voice_id}.wav",
                "X-Voice-ID": request.voice_id,
                "X-Speaker-Name": request.speaker_name,
                "X-Voice-Engine": "Standard TTS"
            }
        )
        
    except Exception as e:
        logger.error(f"Voice test error for {request.voice_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Voice test failed: {str(e)}")


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


@app.post("/api/v1/voice-to-llm")
async def voice_to_llm_pipeline(
    audio: UploadFile = File(..., description="Audio file with user's voice message"),
    model: str = Form("bytedance/seed-oss-36b", description="LLM model to use"),
    language: str = Form("auto", description="STT language"),
    temperature: float = Form(0.7, description="LLM temperature"),
    max_tokens: int = Form(2000, description="Maximum tokens for LLM response"),
    include_reasoning: bool = Form(True, description="Include reasoning for reasoning models"),
    use_conversation_history: bool = Form(True, description="Use conversation context")
):
    """Voice-to-LLM pipeline: STT -> OSS36B LLM (optimized for voice conversation)"""
    try:
        # Step 1: Speech to Text
        logger.info("🎤 Starting Voice-to-LLM pipeline")
        audio_data = await audio.read()
        stt_result = await stt_service.transcribe(audio_data, language=language)
        
        if not stt_result.get("text") or not stt_result["text"].strip():
            raise HTTPException(status_code=400, detail="No speech detected in audio")
        
        transcribed_text = stt_result["text"]
        logger.info(f"📝 Transcribed: '{transcribed_text}'")
        
        # Step 2: Generate LLM response with OSS36B
        messages = [{"role": "user", "content": transcribed_text}]
        llm_result = await llm_service.generate_response(
            messages=messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            include_reasoning=include_reasoning,
            use_conversation_history=use_conversation_history
        )
        
        if not llm_result.get("response"):
            raise HTTPException(status_code=500, detail="LLM failed to generate response")
        
        logger.info(f"🤖 LLM Response: '{llm_result['response'][:100]}...'")
        
        # Return comprehensive result
        return {
            "status": "success",
            "transcript": {
                "text": transcribed_text,
                "language": stt_result.get("language", "unknown"),
                "confidence": stt_result.get("confidence", 0),
                "processing_time": stt_result.get("processing_time", 0)
            },
            "llm_response": {
                "text": llm_result["response"],
                "reasoning": llm_result.get("reasoning", ""),
                "model": llm_result.get("model", model),
                "processing_time": llm_result.get("processing_time", 0),
                "usage": llm_result.get("usage", {}),
                "finish_reason": llm_result.get("finish_reason", "unknown"),
                "conversation_length": llm_result.get("conversation_length", 0)
            },
            "total_processing_time": stt_result.get("processing_time", 0) + llm_result.get("processing_time", 0),
            "pipeline_version": "voice-bridge-v1.0"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice-to-LLM pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice-to-LLM pipeline failed: {str(e)}")


@app.post("/api/v1/voice-chat")
async def voice_chat_pipeline(
    # Optional audio file for voice input
    audio: UploadFile = File(None, description="Audio file with user's voice message (optional)"),
    # Optional text input for direct text processing
    text_input: str = Form(None, description="Direct text input (alternative to audio)"),
    # Optional selected model parameter
    selected_model: str = Form("default", description="LLM model to use"),
    # TTS voice settings
    voice: str = Form("default", description="TTS voice to use for response"),
    model: str = Form("default", description="LLM model to use (legacy support)"),
    language: str = Form("auto", description="STT language"),
    # Primary file selection and metadata
    primary_file_index: int = Form(None, description="Index of primary file for analysis"),
    total_files: int = Form(0, description="Total number of files uploaded"),
    # Multimodal file support
    file_0: UploadFile = File(None, description="Additional file 0"),
    file_1: UploadFile = File(None, description="Additional file 1"),
    file_2: UploadFile = File(None, description="Additional file 2"),
    file_3: UploadFile = File(None, description="Additional file 3"),
    file_4: UploadFile = File(None, description="Additional file 4"),
    # File metadata
    file_0_name: str = Form(None, description="Name of file 0"),
    file_0_type: str = Form(None, description="MIME type of file 0"),
    file_0_is_primary: bool = Form(False, description="Whether file 0 is primary"),
    file_1_name: str = Form(None, description="Name of file 1"),
    file_1_type: str = Form(None, description="MIME type of file 1"),
    file_1_is_primary: bool = Form(False, description="Whether file 1 is primary"),
    file_2_name: str = Form(None, description="Name of file 2"),
    file_2_type: str = Form(None, description="MIME type of file 2"),
    file_2_is_primary: bool = Form(False, description="Whether file 2 is primary"),
    file_3_name: str = Form(None, description="Name of file 3"),
    file_3_type: str = Form(None, description="MIME type of file 3"),
    file_3_is_primary: bool = Form(False, description="Whether file 3 is primary"),
    file_4_name: str = Form(None, description="Name of file 4"),
    file_4_type: str = Form(None, description="MIME type of file 4"),
    file_4_is_primary: bool = Form(False, description="Whether file 4 is primary")
):
    """Complete multimodal chat pipeline: (STT + Files + Text) -> LLM -> TTS"""
    try:
        logger.info("🎤 Starting Multimodal Voice Chat pipeline")
        
        # Determine the actual model to use (prioritize selected_model)
        actual_model = selected_model if selected_model != "default" else model
        logger.info(f"🤖 Using model: {actual_model}")
        
        user_content = ""
        stt_result = None
        
        # Step 1: Process input (either audio or text)
        if audio and audio.filename:
            # Voice input - use STT
            logger.info("🎤 Processing audio input with STT")
            audio_data = await audio.read()
            stt_result = await stt_service.transcribe(audio_data, language=language)
            
            if not stt_result.get("text"):
                raise HTTPException(status_code=400, detail="No speech detected in audio")
            
            user_content = stt_result["text"]
            logger.info(f"📝 Voice Chat STT result: '{user_content}'")
            
        elif text_input and text_input.strip():
            # Text input - use directly
            logger.info("📝 Processing text input directly")
            user_content = text_input.strip()
            logger.info(f"📝 Text input: '{user_content}'")
            
            # Create a mock STT result for consistency
            stt_result = {
                "text": user_content,
                "language": "text-input",
                "confidence": 1.0,
                "processing_time": 0,
                "device_used": "Text Input"
            }
        else:
            # Check if we have any files - allow file-only submissions
            has_files = any(f and f.filename for f in [file_0, file_1, file_2, file_3, file_4])
            if not has_files:
                raise HTTPException(status_code=400, detail="Either audio file, text_input, or uploaded files must be provided")
            
            # File-only submission - use a generic prompt
            logger.info("📁 Processing file-only submission")
            user_content = "Please analyze the uploaded files."
            
            # Create a mock STT result for consistency
            stt_result = {
                "text": user_content,
                "language": "file-input",
                "confidence": 1.0,
                "processing_time": 0,
                "device_used": "File Upload"
            }
        
        # Step 1.5: Process any additional files with primary file awareness
        uploaded_files = []
        file_descriptions = []
        primary_file_description = None
        used_files = []
        
        # Create mapping of metadata
        file_metadata = [
            (file_0, file_0_name, file_0_type, file_0_is_primary),
            (file_1, file_1_name, file_1_type, file_1_is_primary),
            (file_2, file_2_name, file_2_type, file_2_is_primary),
            (file_3, file_3_name, file_3_type, file_3_is_primary),
            (file_4, file_4_name, file_4_type, file_4_is_primary)
        ]
        
        for i, (file_param, file_name, file_type, is_primary) in enumerate(file_metadata):
            if file_param and file_param.filename:
                # Use provided metadata if available, otherwise fallback to file attributes
                actual_name = file_name or file_param.filename
                actual_type = file_type or file_param.content_type
                
                logger.info(f"📁 Processing file {i}: {actual_name} ({actual_type}) {'[PRIMARY]' if is_primary else ''}")
                
                # Read file content
                file_content = await file_param.read()
                uploaded_files.append(file_content)
                used_files.append({
                    "index": i,
                    "name": actual_name,
                    "type": actual_type,
                    "is_primary": is_primary
                })
                
                # Create description for LLM based on file type
                if actual_type and actual_type.startswith('image/'):
                    description = f"[{'PRIMARY ' if is_primary else ''}Image: {actual_name}]"
                elif actual_type == 'application/pdf':
                    description = f"[{'PRIMARY ' if is_primary else ''}PDF: {actual_name}]"
                elif actual_type and actual_type.startswith('text/'):
                    try:
                        text_content = file_content.decode('utf-8')[:500]  # Limit for context
                        description = f"[{'PRIMARY ' if is_primary else ''}Text file '{actual_name}': {text_content}...]"
                    except:
                        description = f"[{'PRIMARY ' if is_primary else ''}Text file: {actual_name}]"
                else:
                    description = f"[{'PRIMARY ' if is_primary else ''}File: {actual_name} ({actual_type})]"
                
                if is_primary:
                    primary_file_description = description
                    logger.info(f"🎯 Primary file identified: {actual_name}")
                
                file_descriptions.append(description)
        
        # Combine user content with file descriptions
        if file_descriptions:
            combined_content = user_content + "\n\nAttached files:\n" + "\n".join(file_descriptions)
            logger.info(f"📁 Combined content with {len(file_descriptions)} files")
        else:
            combined_content = user_content
        
        # Step 2: Generate LLM response
        logger.info(f"🤖 Generating LLM response with model: {actual_model}")
        
        # Clear any conversation history that might contain XML examples
        llm_service.clear_conversation_history()
        
        # NUCLEAR APPROACH: Use conversation examples to force clean responses
        messages = [
            {
                "role": "system", 
                "content": "You are Ava, a friendly AI assistant. You can analyze text, describe images, and work with various file types. Respond with natural conversational speech. If files are mentioned, acknowledge them and provide helpful responses about their content."
            },
            {
                "role": "user",
                "content": "Hi Ava"
            },
            {
                "role": "assistant",
                "content": "Hello! Nice to meet you!"
            },
            {
                "role": "user", 
                "content": combined_content  # Use the combined content with files
            }
        ]
        
        llm_result = await llm_service.generate_response(
            messages=messages, 
            model=actual_model,  # Use the actual model (prioritized selected_model)
            include_reasoning=True,  # Enable reasoning for models that support it
            use_conversation_history=False  # We're managing history manually
        )
        
        if not llm_result.get("response"):
            raise HTTPException(status_code=500, detail="LLM failed to generate response")
        
        # Filter out any XML/technical content that might have slipped through
        raw_response = llm_result["response"]
        
        # LOG THE RAW RESPONSE TO SEE WHAT'S REALLY BEING GENERATED
        logger.info(f"🔍 RAW LLM Response (first 500 chars): '{raw_response[:500]}'")
        
        filtered_response = raw_response
        
        # Remove common XML/HTML patterns AGGRESSIVELY
        import re
        xml_patterns = [
            r'<\?xml[^>]*\?>',  # XML declarations like <?xml version="1.0" encoding="UTF-8"?>
            r'<!DOCTYPE[^>]*>',  # DOCTYPE declarations
            r'<[^>]+>',  # Any XML/HTML tags
            r'www\.w3\.org[^\s]*',  # W3 URLs
            r'xmlns[^\s]*',  # XML namespaces
            r'encoding="[^"]*"',  # Encoding attributes
            r'version="[^"]*"',  # Version attributes
            r'XML version [0-9\.]+',  # Plain text XML version references
            r'encoding [A-Za-z0-9-]+',  # Plain text encoding references
        ]
        
        for pattern in xml_patterns:
            filtered_response = re.sub(pattern, '', filtered_response, flags=re.IGNORECASE)
        
        # Clean up extra whitespace
        filtered_response = re.sub(r'\s+', ' ', filtered_response.strip())
        
        # Light filtering: Only remove actual XML/HTML tags, preserve natural content
        logger.info("🧹 Light filtering: Removing only XML tags, preserving natural content...")
        
        # Only remove actual XML content if present, but keep everything else
        if any(marker in filtered_response.lower() for marker in ['<?xml', '<!doctype', '<html>', '</html>']):
            logger.info("⚠️ Found XML content, applying stronger filtering")
            # Keep the existing XML removal patterns but don't break natural content
            pass
        else:
            logger.info("✅ No XML detected, keeping full response intact")
        
        # Use the filtered response (but only if we actually filtered XML content)
        if any(marker in raw_response.lower() for marker in ['<?xml', '<!doctype', '<html>', '</html>']):
            llm_result["response"] = filtered_response
            logger.info("🧹 Applied XML filtering to response")
        else:
            # Keep the original response intact for natural content
            logger.info("✅ Keeping original response - no XML filtering needed")
        
        logger.info(f"🤖 Voice Chat LLM response (filtered): '{llm_result['response'][:100]}...'")
        
        # Step 3: Text to Speech
        logger.info(f"🎤️ Generating TTS with voice: {voice}")
        
        # LOG WHAT GETS SENT TO TTS
        tts_text = llm_result["response"]
        logger.info(f"🔍 Text being sent to TTS (first 200 chars): '{tts_text[:200]}'")
        
        tts_audio = await tts_service.generate_speech(
            text=tts_text,
            voice=voice
        )
        
        logger.info("✅ Voice Chat pipeline completed successfully")
        
        # Return audio as streaming response with metadata in headers
        # Clean encoding for HTTP headers (preserve common punctuation)
        def clean_for_header(text: str, max_length: int = None) -> str:
            """Clean text for HTTP headers while preserving punctuation"""
            if not text:
                return ""
            
            # Replace problematic characters but preserve common punctuation
            text = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
            text = text.replace('\t', ' ')
            
            # Remove control characters but keep printable ASCII and common punctuation
            cleaned = ''.join(char if 32 <= ord(char) <= 126 else ' ' for char in text)
            # Ensure apostrophes are preserved
            cleaned = cleaned.replace("'", "'").replace("'", "'")
            
            # Clean up multiple spaces
            cleaned = ' '.join(cleaned.split())
            
            if max_length and len(cleaned) > max_length:
                cleaned = cleaned[:max_length].rsplit(' ', 1)[0] + "..."
            
            return cleaned
        
        transcript_safe = clean_for_header(stt_result["text"])
        llm_response_safe = clean_for_header(llm_result["response"], 200)
        
        # Include reasoning if available (truncated for header)
        reasoning_safe = ""
        if llm_result.get("reasoning"):
            reasoning_safe = clean_for_header(llm_result["reasoning"], 300)
        
        # Create comprehensive metadata for the response
        response_metadata = {
            "transcript": {
                "text": stt_result["text"],
                "language": stt_result.get("language", "unknown"),
                "confidence": stt_result.get("confidence", 0),
                "device_used": stt_result.get("device_used", "unknown"),
                "processing_time": stt_result.get("processing_time", 0)
            },
            "llm_response": {
                "text": llm_result["response"],
                "reasoning": llm_result.get("reasoning", ""),  # Full reasoning, no truncation!
                "model": llm_result.get("model", model),
                "tokens": llm_result.get("usage", {}).get("total_tokens", 0),
                "processing_time": llm_result.get("processing_time", 0),
                "finish_reason": llm_result.get("finish_reason", "unknown")
            },
            "tts": {
                "processing_time": await tts_service.get_last_processing_time(),
                "voice": voice
            },
            "total_processing_time": (
                stt_result.get("processing_time", 0) + 
                llm_result.get("processing_time", 0) + 
                await tts_service.get_last_processing_time()
            )
        }
        
        # Convert metadata to JSON string for header
        import json
        metadata_json = json.dumps(response_metadata, ensure_ascii=True)
        
        return StreamingResponse(
            io.BytesIO(tts_audio),
            media_type="audio/wav",
            headers={
                # Keep essential headers for backward compatibility
                "X-Transcript": transcript_safe,
                "X-LLM-Response": llm_response_safe,
                "X-LLM-Reasoning": reasoning_safe,
                "X-LLM-Model": str(llm_result.get("model", actual_model)),
                "X-LLM-Tokens": str(llm_result.get("usage", {}).get("total_tokens", 0)),
                "X-LLM-Processing-Time": str(llm_result.get("processing_time", 0)),
                "X-TTS-Processing-Time": str(await tts_service.get_last_processing_time()),
                "X-Used-Files": json.dumps([f["name"] for f in used_files]) if used_files else "",
                "X-Primary-File": primary_file_description or "",
                "X-File-Count": str(len(used_files)),
                # NEW: Full metadata in JSON format
                "X-Voice-Bridge-Data": metadata_json,
                "Content-Disposition": "inline; filename=voice_response.wav",
                # CORS headers to allow frontend to access our custom headers
                "Access-Control-Expose-Headers": "X-Transcript,X-LLM-Response,X-LLM-Reasoning,X-LLM-Model,X-LLM-Tokens,X-LLM-Processing-Time,X-TTS-Processing-Time,X-Used-Files,X-Primary-File,X-File-Count,X-Voice-Bridge-Data"
            }
        )
        
    except Exception as e:
        logger.error(f"Voice chat pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice chat failed: {str(e)}")


@app.post("/api/v1/vibevoice-conversation")
async def vibevoice_conversation(request: VibeVoiceConversationRequest):
    """Create multi-speaker conversations using VibeVoice"""
    try:
        if not tts_service.vibevoice_service:
            raise HTTPException(status_code=503, detail="VibeVoice service not available")
        
        logger.info(f"🎭 Creating VibeVoice conversation with {len(request.speaker_voices)} speakers")
        
        # Create the conversation using VibeVoice
        audio_data = await tts_service.vibevoice_service.create_conversation(
            script=request.script,
            speaker_voices=request.speaker_voices,
            output_format=request.output_format
        )
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type=f"audio/{request.output_format}",
            headers={"Content-Disposition": f"inline; filename=conversation.{request.output_format}"}
        )
        
    except Exception as e:
        logger.error(f"VibeVoice conversation error: {e}")
        raise HTTPException(status_code=500, detail=f"VibeVoice conversation failed: {str(e)}")


@app.get("/api/v1/vibevoice-voices")
async def get_vibevoice_voices():
    """Get available VibeVoice voices"""
    try:
        if not tts_service.vibevoice_service:
            raise HTTPException(status_code=503, detail="VibeVoice service not available")
        
        voices = await tts_service.vibevoice_service.get_available_voices()
        
        return {
            "status": "success",
            "voices": voices,
            "total_voices": len(voices)
        }
        
    except Exception as e:
        logger.error(f"Error getting VibeVoice voices: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get VibeVoice voices: {str(e)}")


@app.get("/api/v1/models")
async def get_available_models():
    """Get available LM Studio models"""
    try:
        if not llm_service:
            raise HTTPException(status_code=503, detail="LLM service not available")
        
        models = await llm_service.get_available_models()
        
        return {
            "status": "success",
            "models": models,
            "total_models": len(models),
            "current_default": llm_service.default_model
        }
        
    except Exception as e:
        logger.error(f"Error getting available models: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get models: {str(e)}")


@app.post("/api/v1/voice-clone", response_model=VoiceCloneResponse)
async def create_voice_clone(
    name: str = Form(..., description="Voice clone name"),
    transcript: str = Form(..., description="Transcript for the voice sample"),
    audio: UploadFile = File(..., description="Voice sample audio file"),
    description: str = Form(None, description="Optional description of the voice")
):
    """Create a new voice clone from uploaded audio and transcript"""
    try:
        logger.info(f"🎤 Voice clone request: name='{name}', filename='{audio.filename}', content_type='{audio.content_type}', size={audio.size if hasattr(audio, 'size') else 'unknown'}")
        
        if not tts_service or not tts_service.vibevoice_service:
            logger.error("VibeVoice service not available")
            raise HTTPException(status_code=503, detail="VibeVoice service not available")
        
        # Detailed audio file validation with logging
        logger.info(f"🔍 Validating audio file: {audio.filename} ({audio.content_type})")
        if not validate_audio_file(audio):
            logger.error(f"❌ Audio validation failed for: {audio.filename} ({audio.content_type})")
            raise HTTPException(status_code=400, detail="Invalid audio file format")
        
        logger.info("✅ Audio validation passed")
        
        # Read audio data
        audio_data = await audio.read()
        logger.info(f"📁 Read {len(audio_data)} bytes of audio data")
        
        # Try to get audio info for debugging
        try:
            from utils.audio_utils import get_audio_info
            audio_info = get_audio_info(audio_data)
            logger.info(f"🎵 Audio info: {audio_info}")
        except Exception as info_error:
            logger.warning(f"Could not get audio info: {info_error}")
        
        logger.info(f"🎤 Creating voice clone '{name}' with transcript: '{transcript[:50]}...'")
        
        # Create voice clone using VibeVoice service
        result = await tts_service.vibevoice_service.create_voice_clone(
            name=name,
            transcript=transcript,
            audio_data=audio_data,
            description=description
        )
        
        logger.info(f"✅ Voice clone created successfully: {result}")
        return VoiceCloneResponse(**result)
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"❌ Voice clone creation error: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"❌ Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Voice clone creation failed: {str(e)}")


@app.post("/api/v1/voice-clone/test")
async def test_voice_clone(
    voice_id: str = Form(..., description="Voice clone ID to test"),
    text: str = Form(..., description="Text to synthesize with the cloned voice")
):
    """Test a voice clone by generating speech"""
    try:
        if not tts_service or not tts_service.vibevoice_service:
            raise HTTPException(status_code=503, detail="VibeVoice service not available")
        
        logger.info(f"🎤 Testing voice clone '{voice_id}' with text: '{text[:50]}...'")
        
        # Test voice clone using VibeVoice service
        try:
            audio_data = await tts_service.vibevoice_service.test_voice_clone(
                voice_id=voice_id,
                text=text
            )
        except Exception as e:
            # Fallback: if clone not found, try to reconcile with available clones
            if "not found" in str(e).lower():
                try:
                    clones = await tts_service.vibevoice_service.get_voice_clones()
                    candidate_id = None
                    if clones:
                        ids = [c.get("voice_id") for c in clones]
                        if voice_id not in ids and len(clones) == 1:
                            candidate_id = clones[0].get("voice_id")
                    if candidate_id:
                        logger.warning(f"Voice clone '{voice_id}' not found. Retrying with available voice clone '{candidate_id}'.")
                        audio_data = await tts_service.vibevoice_service.test_voice_clone(
                            voice_id=candidate_id,
                            text=text
                        )
                    else:
                        raise
                except Exception:
                    raise
            else:
                raise
        
        # Return audio as streaming response
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"inline; filename=voice_clone_{voice_id}_test.wav",
                "X-Voice-Clone-ID": voice_id,
                "X-Test-Text": text[:100],  # Truncate for header
                "Access-Control-Expose-Headers": "X-Voice-Clone-ID,X-Test-Text"
            }
        )
        
    except Exception as e:
        logger.error(f"Voice clone test error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice clone test failed: {str(e)}")


@app.get("/api/v1/voice-clones", response_model=VoiceCloneListResponse)
async def list_voice_clones():
    """Get list of available voice clones with cached test audio information"""
    try:
        if not tts_service or not tts_service.vibevoice_service:
            raise HTTPException(status_code=503, detail="VibeVoice service not available")
        
        voice_clones = await tts_service.vibevoice_service.get_voice_clones()
        
        # Add cached test audio information to each voice clone
        for clone in voice_clones:
            voice_id = clone.get("voice_id")
            cached_info = tts_service.vibevoice_service.get_cached_test_audio_info(voice_id)
            clone["cached_test_audio"] = cached_info
        
        return VoiceCloneListResponse(
            status="success",
            voice_clones=voice_clones,
            total_count=len(voice_clones)
        )
        
    except Exception as e:
        logger.error(f"Error getting voice clones: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get voice clones: {str(e)}")


@app.get("/api/v1/voice-clone/{voice_id}/cached-audio")
async def get_cached_test_audio(
    voice_id: str
):
    """Retrieve cached test audio for a voice clone"""
    try:
        if not tts_service or not tts_service.vibevoice_service:
            raise HTTPException(status_code=503, detail="VibeVoice service not available")
        
        # Get cached audio info
        cached_info = tts_service.vibevoice_service.get_cached_test_audio_info(voice_id)
        if not cached_info:
            raise HTTPException(status_code=404, detail="No cached test audio found for this voice clone")
        
        # Get the actual cached audio
        cached_audio = tts_service.vibevoice_service._get_cached_test_audio(
            voice_id, 
            cached_info['text']
        )
        
        if not cached_audio:
            raise HTTPException(status_code=404, detail="Cached audio file not found")
        
        logger.info(f"📋 Serving cached test audio for '{voice_id}': {len(cached_audio)} bytes")
        
        # Return cached audio as streaming response
        return StreamingResponse(
            io.BytesIO(cached_audio),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f"inline; filename=voice_clone_{voice_id}_cached_test.wav",
                "X-Voice-Clone-ID": voice_id,
                "X-Test-Text": cached_info['text'][:100],
                "X-Cached-Audio": "true",
                "X-Cache-Timestamp": str(cached_info.get('tested_at', '')),
                "Access-Control-Expose-Headers": "X-Voice-Clone-ID,X-Test-Text,X-Cached-Audio,X-Cache-Timestamp"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cached test audio: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cached test audio: {str(e)}")


# Multi-Speaker Conversation Engine Endpoints

@app.post("/api/v1/conversation/create")
async def create_dynamic_conversation(
    script: str = Form(..., description="Conversation script with speaker indicators"),
    speaker_mapping: str = Form(..., description="JSON string mapping speaker names to voice IDs"),
    conversation_style: str = Form(default="natural", description="Conversation style (natural, interview, debate, etc.)"),
    add_natural_interactions: bool = Form(default=True, description="Add interruptions and natural reactions"),
    include_background_sound: bool = Form(default=False, description="Include ambient background sounds"),
    background_sound_volume: int = Form(default=50, description="Background sound volume (10-100)"),
    emotional_intelligence: bool = Form(default=True, description="Enable emotion detection and response")
):
    """Create advanced multi-speaker conversation with emotion detection and natural speech patterns"""
    try:
        if not conversation_engine:
            raise HTTPException(status_code=503, detail="ConversationEngine service not available")
        
        # Parse speaker mapping JSON
        import json
        try:
            speaker_map = json.loads(speaker_mapping)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid speaker_mapping JSON: {e}")
        
        # Convert style string to enum
        try:
            style = ConversationStyle(conversation_style.lower())
        except ValueError:
            available_styles = [s.value for s in ConversationStyle]
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid conversation_style '{conversation_style}'. Available: {available_styles}"
            )
        
        logger.info(f"🎭 Creating dynamic conversation: style={style.value}, speakers={list(speaker_map.keys())}")
        
        # Create conversation
        audio_data, metadata = await conversation_engine.create_dynamic_conversation(
            script=script,
            speaker_mapping=speaker_map,
            conversation_style=style,
            add_natural_interactions=add_natural_interactions,
            include_background_sound=include_background_sound,
            background_sound_volume=background_sound_volume,
            emotional_intelligence=emotional_intelligence
        )
        
        # Convert emotion distribution to JSON-serializable format
        emotion_dist_json = {emotion.value: score for emotion, score in metadata.emotion_distribution.items()}
        
        # Return audio as streaming response with detailed metadata
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=dynamic_conversation.wav",
                "X-Conversation-Duration": str(metadata.total_duration),
                "X-Speaker-Count": str(metadata.speaker_count),
                "X-Word-Count": str(metadata.word_count),
                "X-Interaction-Complexity": str(metadata.interaction_complexity),
                "X-Emotion-Distribution": json.dumps(emotion_dist_json),
                "X-Conversation-Style": style.value,
                "Access-Control-Expose-Headers": "X-Conversation-Duration,X-Speaker-Count,X-Word-Count,X-Interaction-Complexity,X-Emotion-Distribution,X-Conversation-Style"
            }
        )
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"❌ Dynamic conversation creation failed: {type(e).__name__}: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Dynamic conversation creation failed: {str(e)}")

@app.get("/api/v1/conversation/styles")
async def get_conversation_styles():
    """Get available conversation styles with descriptions"""
    style_descriptions = {
        "natural": "Realistic everyday conversation with natural pauses and interruptions",
        "interview": "Structured Q&A format with longer thoughtful pauses between speakers",
        "debate": "Fast-paced argumentative style with quick responses and overlapping speech", 
        "podcast": "Professional broadcasting style with clear pacing and smooth transitions",
        "casual": "Informal chat with frequent interruptions and casual reactions",
        "formal": "Business or academic presentation style with structured speech patterns",
        "dramatic": "Theatrical performance with emotional emphasis and dramatic pauses"
    }
    
    return {
        "status": "success",
        "styles": [
            {
                "value": style.value,
                "name": style.value.title().replace('_', ' '),
                "description": style_descriptions.get(style.value, "")
            }
            for style in ConversationStyle
        ],
        "total_styles": len(ConversationStyle)
    }

@app.get("/api/v1/conversation/emotions")
async def get_supported_emotions():
    """Get supported emotion types for voice generation"""
    emotion_descriptions = {
        "neutral": "Normal speaking tone without emotional coloring",
        "happy": "Cheerful and upbeat with positive energy",
        "excited": "Energetic and enthusiastic with high energy", 
        "sad": "Melancholy and subdued with lower energy",
        "angry": "Aggressive and intense with forceful delivery",
        "surprised": "Shocked and amazed with sudden emphasis",
        "confused": "Uncertain and questioning with hesitant delivery",
        "confident": "Assured and authoritative with clear conviction",
        "nervous": "Anxious and hesitant with tentative speech patterns",
        "whispering": "Quiet and secretive with intimate delivery"
    }
    
    return {
        "status": "success",
        "emotions": [
            {
                "value": emotion.value,
                "name": emotion.value.title(),
                "description": emotion_descriptions.get(emotion.value, "")
            }
            for emotion in EmotionType
        ],
        "total_emotions": len(EmotionType)
    }

@app.get("/api/v1/conversation/analytics")
async def get_conversation_analytics():
    """Get conversation generation analytics and performance statistics"""
    try:
        if not conversation_engine:
            raise HTTPException(status_code=503, detail="ConversationEngine service not available")
            
        analytics = await conversation_engine.get_conversation_analytics()
        
        return {
            "status": "success",
            "analytics": analytics,
            "timestamp": asyncio.get_event_loop().time()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Analytics retrieval failed: {str(e)}")

@app.post("/api/v1/conversation/clear-history")
async def clear_conversation_history():
    """Clear conversation history and reset analytics data"""
    try:
        if not conversation_engine:
            raise HTTPException(status_code=503, detail="ConversationEngine service not available")
            
        conversation_engine.clear_conversation_history()
        
        return {
            "status": "success",
            "message": "Conversation history cleared successfully",
            "timestamp": asyncio.get_event_loop().time()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to clear conversation history: {e}")
        raise HTTPException(status_code=500, detail=f"History clearing failed: {str(e)}")


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


# Voice sample endpoints
from voice_sample_generator import voice_sample_generator

# Mount voice samples directory as static files
app.mount("/api/v1/voice-samples", StaticFiles(directory="voice_samples"), name="voice_samples")

@app.get("/api/v1/voice-library-samples")
async def get_voice_library_samples():
    """Get voice sample URLs for the entire voice library"""
    try:
        # This would be the voice library data from the frontend
        # For now, return sample URLs for existing samples
        sample_urls = {}
        
        # Scan for existing voice samples
        for source_dir in voice_sample_generator.source_dirs.values():
            for sample_file in source_dir.glob("*.wav"):
                # Extract voice ID from filename (voice_id_hash.wav)
                voice_id = sample_file.stem.split('_')[0]
                relative_path = sample_file.relative_to(voice_sample_generator.samples_dir)
                sample_urls[voice_id] = f"http://localhost:8001/api/v1/voice-samples/{relative_path.as_posix()}"
        
        return {
            "status": "success",
            "sample_urls": sample_urls,
            "total_samples": len(sample_urls)
        }
        
    except Exception as e:
        logger.error(f"Error getting voice library samples: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get voice samples: {str(e)}")

@app.post("/api/v1/generate-voice-sample")
async def generate_voice_sample(
    voice_id: str = Form(...),
    voice_name: str = Form(...),
    source: str = Form(...),
    text: str = Form(...),
    voice_config: str = Form("{}")  # JSON string with voice-specific config
):
    """Generate a voice sample for a specific voice library entry"""
    try:
        import json
        
        # Parse voice config
        config = json.loads(voice_config) if voice_config else {}
        config.update({
            'id': voice_id,
            'name': voice_name,
            'source': source,
            'sample_text': text
        })
        
        # Generate the sample
        sample_path = await voice_sample_generator.get_or_generate_sample(config)
        
        if sample_path:
            # Return the URL to access the sample
            sample_url = voice_sample_generator.get_sample_url(voice_id)
            return {
                "status": "success",
                "sample_url": sample_url,
                "voice_id": voice_id,
                "sample_path": sample_path
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to generate voice sample")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid voice_config JSON")
    except Exception as e:
        logger.error(f"Error generating voice sample: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate voice sample: {str(e)}")

@app.post("/api/v1/generate-library-samples")
async def generate_library_samples(
    voice_library: List[dict]
):
    """Generate voice samples for multiple voices in the library"""
    try:
        # Generate samples for all voices
        results = await voice_sample_generator.generate_library_samples(voice_library)
        
        # Convert file paths to URLs
        sample_urls = {}
        for voice_id, sample_path in results.items():
            if sample_path:
                sample_urls[voice_id] = voice_sample_generator.get_sample_url(voice_id)
        
        return {
            "status": "success",
            "sample_urls": sample_urls,
            "generated_count": len([p for p in results.values() if p]),
            "total_requested": len(voice_library)
        }
        
    except Exception as e:
        logger.error(f"Error generating library samples: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate library samples: {str(e)}")


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