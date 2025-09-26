"""
Speech-to-Text Service using OpenAI Whisper with GPU acceleration
Optimized for RTX 5090 performance
"""

import asyncio
import io
import logging
import tempfile
import time
from pathlib import Path
from typing import Dict, Any, Optional

import torch
import whisper
import numpy as np
from pydub import AudioSegment
import librosa

from app.config import Settings

logger = logging.getLogger(__name__)
settings = Settings()


class STTService:
    """High-performance Speech-to-Text service with GPU acceleration"""
    
    def __init__(self):
        self.model = None
        self.device = None
        self.model_name = settings.whisper_model
        self.language = settings.whisper_language
        self.sample_rate = settings.audio_sample_rate
        self.processing_times = []
        
    async def initialize(self):
        """Initialize Whisper model with GPU support"""
        try:
            # Detect best device (prioritize CUDA for RTX 5090)
            if torch.cuda.is_available():
                self.device = "cuda"
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory // 1024**3
                logger.info(f"🚀 Using GPU: {gpu_name} ({gpu_memory}GB)")
            else:
                self.device = "cpu"
                logger.info("💻 Using CPU for Whisper processing")
            
            # Load Whisper model
            logger.info(f"📥 Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(
                self.model_name, 
                device=self.device,
                download_root=Path("models/whisper")
            )
            
            # Optimize for GPU if available
            if self.device == "cuda":
                self.model.half()  # Use FP16 for faster inference
                torch.cuda.empty_cache()
            
            logger.info(f"✅ Whisper {self.model_name} model loaded on {self.device}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize STT service: {e}")
            raise
    
    async def transcribe(
        self, 
        audio_data: bytes, 
        language: str = "auto"
    ) -> Dict[str, Any]:
        """Transcribe audio data to text"""
        start_time = time.time()
        
        try:
            # Convert audio data to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            # Process audio with Whisper
            result = await self._process_audio_file(temp_file_path, language)
            
            # Cleanup
            Path(temp_file_path).unlink(missing_ok=True)
            
            processing_time = time.time() - start_time
            self.processing_times.append(processing_time)
            
            logger.info(f"🎯 Transcription completed in {processing_time:.2f}s")
            
            return {
                "text": result["text"].strip(),
                "language": result.get("language", "unknown"),
                "confidence": self._calculate_confidence(result),
                "processing_time": processing_time,
                "segments": result.get("segments", []),
                "device_used": self.device
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {e}")
            raise
    
    async def _process_audio_file(self, file_path: str, language: str) -> Dict:
        """Process audio file with Whisper"""
        try:
            # Prepare options
            options = {
                "task": "transcribe",
                "temperature": 0.0,  # Deterministic output
                "best_of": 1,
                "beam_size": 1 if self.device == "cpu" else 5,  # More beams for GPU
                "patience": 1.0,
                "suppress_tokens": [-1],
                "initial_prompt": None,
                "condition_on_previous_text": True,
                "fp16": self.device == "cuda",  # Use FP16 on GPU
                "compression_ratio_threshold": 2.4,
                "logprob_threshold": -1.0,
                "no_speech_threshold": 0.6
            }
            
            # Set language if specified
            if language != "auto":
                options["language"] = language
            
            # Run transcription
            if self.device == "cuda":
                # GPU optimized transcription
                with torch.cuda.amp.autocast():
                    result = self.model.transcribe(file_path, **options)
            else:
                result = self.model.transcribe(file_path, **options)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Audio processing failed: {e}")
            raise
    
    async def stream_transcribe(self, audio_chunk: bytes) -> Optional[Dict[str, Any]]:
        """Real-time transcription for streaming audio"""
        try:
            # For streaming, we'll use smaller chunks and faster processing
            if len(audio_chunk) < 1024:  # Too small to process
                return None
            
            # Convert to audio format Whisper expects
            audio_array = self._bytes_to_audio_array(audio_chunk)
            
            # Quick transcription with lower quality for real-time
            with torch.no_grad():
                if self.device == "cuda":
                    with torch.cuda.amp.autocast():
                        result = self.model.transcribe(
                            audio_array,
                            language=self.language if self.language != "auto" else None,
                            task="transcribe",
                            beam_size=1,  # Fast processing
                            best_of=1,
                            temperature=0.0
                        )
                else:
                    result = self.model.transcribe(
                        audio_array,
                        language=self.language if self.language != "auto" else None,
                        task="transcribe"
                    )
            
            if result["text"].strip():
                return {
                    "text": result["text"].strip(),
                    "confidence": self._calculate_confidence(result),
                    "language": result.get("language", "unknown")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Stream transcription failed: {e}")
            return None
    
    def _bytes_to_audio_array(self, audio_bytes: bytes) -> np.ndarray:
        """Convert audio bytes to numpy array for Whisper"""
        try:
            # Convert bytes to AudioSegment
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
            
            # Convert to mono and correct sample rate
            audio = audio.set_channels(1).set_frame_rate(16000)
            
            # Convert to numpy array
            audio_array = np.array(audio.get_array_of_samples(), dtype=np.float32)
            
            # Normalize
            audio_array = audio_array / np.max(np.abs(audio_array))
            
            return audio_array
            
        except Exception as e:
            logger.error(f"❌ Audio conversion failed: {e}")
            raise
    
    def _calculate_confidence(self, result: Dict) -> float:
        """Calculate confidence score from Whisper result"""
        try:
            if "segments" in result and result["segments"]:
                # Average confidence from segments
                confidences = []
                for segment in result["segments"]:
                    if "avg_logprob" in segment:
                        # Convert log probability to confidence (0-1)
                        confidence = np.exp(segment["avg_logprob"])
                        confidences.append(confidence)
                
                if confidences:
                    return float(np.mean(confidences))
            
            # Fallback confidence based on text length and no speech probability
            text_length = len(result.get("text", "").strip())
            if text_length == 0:
                return 0.0
            elif text_length < 10:
                return 0.7
            else:
                return 0.9
                
        except Exception as e:
            logger.warning(f"⚠️ Confidence calculation failed: {e}")
            return 0.8
    
    async def health_check(self) -> bool:
        """Check if STT service is healthy"""
        try:
            if self.model is None:
                return False
            
            # Test with a short silent audio
            test_audio = np.zeros(16000, dtype=np.float32)  # 1 second of silence
            
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                # Create a minimal WAV file
                import wave
                with wave.open(temp_file.name, 'wb') as wav_file:
                    wav_file.setnchannels(1)
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(16000)
                    wav_file.writeframes((test_audio * 32767).astype(np.int16).tobytes())
                
                # Test transcription
                result = await self._process_audio_file(temp_file.name, "en")
            
            # Cleanup with retry for Windows file locking
            try:
                Path(temp_file.name).unlink(missing_ok=True)
            except (OSError, PermissionError) as cleanup_error:
                # Windows file locking issue - ignore cleanup error
                logger.warning(f"⚠️ Cleanup warning (Windows file lock): {cleanup_error}")
                # Try delayed cleanup
                import time
                time.sleep(0.1)
                try:
                    Path(temp_file.name).unlink(missing_ok=True)
                except:
                    pass  # Ignore if still locked
                
            return True
            
        except Exception as e:
            logger.error(f"❌ STT health check failed: {e}")
            return False
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.processing_times:
            return {"average_time": 0, "total_processed": 0}
        
        return {
            "average_time": sum(self.processing_times) / len(self.processing_times),
            "min_time": min(self.processing_times),
            "max_time": max(self.processing_times),
            "total_processed": len(self.processing_times),
            "device": self.device,
            "model": self.model_name
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.device == "cuda":
                torch.cuda.empty_cache()
            self.model = None
            logger.info("🧹 STT service cleaned up")
        except Exception as e:
            logger.error(f"❌ STT cleanup failed: {e}")