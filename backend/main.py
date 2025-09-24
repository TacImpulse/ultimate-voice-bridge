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
            "models": "/api/v1/models",
            "voice_chat": "/api/v1/voice-chat",
            "voice_to_llm": "/api/v1/voice-to-llm",
            "vibevoice_conversation": "/api/v1/vibevoice-conversation",
            "vibevoice_voices": "/api/v1/vibevoice-voices",
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


@app.post("/api/v1/voice-to-llm")
async def voice_to_llm_pipeline(
    audio: UploadFile = File(..., description="Audio file with user's voice message"),
    model: str = Form("bytedance/seed-oss-36b", description="LLM model to use"),
    language: str = Form("auto", description="STT language"),
    temperature: float = Form(0.7, description="LLM temperature"),
    max_tokens: int = Form(500, description="Maximum tokens for LLM response"),
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
    audio: UploadFile = File(..., description="Audio file with user's voice message"),
    voice: str = Form("default", description="TTS voice to use for response"),
    model: str = Form("default", description="LLM model to use"),
    language: str = Form("auto", description="STT language")
):
    """Complete voice chat pipeline: STT -> LLM -> TTS"""
    try:
        logger.info("🎤 Starting Voice Chat pipeline (STT + LLM + TTS)")
        
        # Step 1: Speech to Text
        audio_data = await audio.read()
        stt_result = await stt_service.transcribe(audio_data, language=language)
        
        if not stt_result.get("text"):
            raise HTTPException(status_code=400, detail="No speech detected in audio")
        
        logger.info(f"📝 Voice Chat STT result: '{stt_result['text']}'")
        
        # Step 2: Generate LLM response
        logger.info(f"🤖 Generating LLM response with model: {model}")
        
        # Clear any conversation history that might contain XML examples
        llm_service.clear_conversation_history()
        
        # NUCLEAR APPROACH: Use conversation examples to force clean responses
        messages = [
            {
                "role": "system", 
                "content": "You are Ava, a friendly AI assistant. Respond ONLY with natural conversational speech. NEVER include XML, code, technical terms, or structured data. Here are examples:\n\nUser: Hello\nAva: Hi there! How are you doing today?\n\nUser: How's the weather?\nAva: I'm not sure about the weather in your area, but I hope it's nice!\n\nIMPORTANT: Respond with ONLY natural speech like the examples above. No XML, no technical content, no structured data."
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
                "content": stt_result["text"]
            }
        ]
        
        llm_result = await llm_service.generate_response(
            messages=messages, 
            model=model,
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
        
        # NUCLEAR FILTER: Remove EVERYTHING that looks like XML or technical content
        logger.info("💣 NUCLEAR FILTER: Scanning for any XML/technical content...")
        
        # Split into sentences and find the FIRST sentence that sounds conversational
        sentences = re.split(r'[.!?\n]+', filtered_response)
        natural_sentences = []
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 3:  # Skip very short fragments
                continue
                
            # Skip sentences with ANY technical indicators
            technical_indicators = ['xml', 'encoding', 'www.', 'http', 'version', 'doctype', 'xmlns', 'utf', 
                                  'w3.org', 'schema', 'markup', '<?', '<!', '/>', 'namespace', 'declaration']
            
            if any(indicator in sentence.lower() for indicator in technical_indicators):
                logger.info(f"🚫 Skipping technical sentence: '{sentence[:50]}...'")
                continue
                
            # This looks like natural speech - keep it!
            if any(word in sentence.lower() for word in ['i', 'you', 'hi', 'hello', 'how', 'what', 'sure', 'great', 'nice', 'help']):
                natural_sentences.append(sentence)
                logger.info(f"✅ Found natural sentence: '{sentence[:50]}...'")
        
        if natural_sentences:
            # Take first 1-2 natural sentences
            filtered_response = '. '.join(natural_sentences[:2]).strip()
            if not filtered_response.endswith(('.', '!', '?')):
                filtered_response += '.'
            logger.info(f"🎉 NUCLEAR SUCCESS: '{filtered_response}'")
        else:
            # ULTIMATE FALLBACK
            filtered_response = "Hi there! I'm Ava, how can I help you today?"
            logger.info("🚀 Used ultimate fallback response")
        
        # Update the response
        llm_result["response"] = filtered_response
        
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
            
            # Remove control characters but keep printable ASCII
            cleaned = ''.join(char if 32 <= ord(char) <= 126 else ' ' for char in text)
            
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
        
        return StreamingResponse(
            io.BytesIO(tts_audio),
            media_type="audio/wav",
            headers={
                "X-Transcript": transcript_safe,
                "X-Transcript-Language": stt_result.get("language", "unknown"),
                "X-Transcript-Confidence": str(stt_result.get("confidence", 0)),
                "X-Transcript-Device": stt_result.get("device_used", "unknown"),
                "X-LLM-Response": llm_response_safe,
                "X-LLM-Reasoning": reasoning_safe,
                "X-LLM-Model": llm_result.get("model", model),
                "X-LLM-Tokens": str(llm_result.get("usage", {}).get("total_tokens", 0)),
                "X-STT-Time": str(stt_result.get("processing_time", 0)),
                "X-LLM-Time": str(llm_result.get("processing_time", 0)),
                "X-TTS-Time": str(await tts_service.get_last_processing_time()),
                "Content-Disposition": "inline; filename=voice_response.wav",
                # CORS headers to allow frontend to access our custom headers
                "Access-Control-Expose-Headers": "X-Transcript,X-Transcript-Language,X-Transcript-Confidence,X-Transcript-Device,X-LLM-Response,X-LLM-Reasoning,X-LLM-Model,X-LLM-Tokens,X-STT-Time,X-LLM-Time,X-TTS-Time"
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