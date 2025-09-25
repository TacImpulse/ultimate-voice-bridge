"""
TTS Service - Microsoft Azure Neural Voices with Edge-TTS
High-quality conversational AI voices optimized for real-time synthesis
"""

import asyncio
import logging
import time
import tempfile
import os
from typing import Optional, Dict, List, Any
from pathlib import Path
import json

# Import VibeVoice service
try:
    from .vibevoice_service import VibeVoiceService
    VIBEVOICE_AVAILABLE = True
except ImportError as e:
    VIBEVOICE_AVAILABLE = False
    logger.warning(f"VibeVoice service not available: {e}")

try:
    import edge_tts
    from pydub import AudioSegment
    import librosa
    import soundfile as sf
    import numpy as np
    EDGE_TTS_AVAILABLE = True
except ImportError as e:
    EDGE_TTS_AVAILABLE = False
    logger.warning(f"Edge-TTS or audio processing libraries not available: {e}")

logger = logging.getLogger(__name__)


class VoiceProfile:
    """Voice profile with customization settings"""
    def __init__(self, name: str, voice_id: str, description: str, 
                 speed: float = 1.0, pitch: float = 1.0, volume: float = 1.0,
                 emotion: str = "neutral", style: str = "general"):
        self.name = name
        self.voice_id = voice_id  
        self.description = description
        self.speed = speed
        self.pitch = pitch
        self.volume = volume
        self.emotion = emotion
        self.style = style
        self.created_at = time.time()


class TTSService:
    """Advanced TTS Service with Microsoft Neural Voices"""
    
    def __init__(self):
        self.last_processing_time = 0
        self.available_voices: Dict[str, Dict] = {}
        self.voice_profiles: Dict[str, VoiceProfile] = {}
        self.default_voice = "en-US-AvaNeural"  # Expressive, caring voice optimized for conversation
        self.temp_dir = Path(tempfile.gettempdir()) / "voice_bridge_tts"
        self.temp_dir.mkdir(exist_ok=True)
        
        # Initialize VibeVoice service if available
        self.vibevoice_service = None
        if VIBEVOICE_AVAILABLE:
            self.vibevoice_service = VibeVoiceService()
        
        # Initialize default voice profiles
        self._initialize_default_profiles()
        
    def _initialize_default_profiles(self):
        """Initialize default voice profiles with Microsoft's best conversational voices"""
        default_profiles = [
            VoiceProfile(
                name="Ava - Friendly Assistant",
                voice_id="en-US-AvaNeural",
                description="Expressive, Caring, Pleasant, Friendly - Perfect for conversational AI",
                speed=1.0,
                emotion="friendly"
            ),
            VoiceProfile(
                name="Andrew - Confident Guide", 
                voice_id="en-US-AndrewNeural",
                description="Warm, Confident, Authentic, Honest - Great for explanations",
                speed=1.0,
                emotion="confident"
            ),
            VoiceProfile(
                name="Brian - Casual Buddy",
                voice_id="en-US-BrianNeural", 
                description="Approachable, Casual, Sincere - Perfect for relaxed conversations",
                speed=1.0,
                emotion="casual"
            ),
            VoiceProfile(
                name="Emma - Cheerful Helper",
                voice_id="en-US-EmmaNeural",
                description="Cheerful, Clear, Conversational - Optimized for assistance",
                speed=1.0,
                emotion="cheerful"
            ),
            VoiceProfile(
                name="Jenny - Gentle Companion",
                voice_id="en-US-JennyNeural",
                description="Friendly, Considerate, Comfortable - Soothing and warm",
                speed=0.9,
                emotion="gentle"
            )
        ]
        
        for profile in default_profiles:
            self.voice_profiles[profile.name] = profile
        
    async def initialize(self) -> None:
        """Initialize the TTS service with voice discovery"""
        try:
            if not EDGE_TTS_AVAILABLE:
                raise Exception("Edge-TTS not available. Run: pip install edge-tts pydub librosa soundfile")
            
            # Get available voices
            await self._discover_voices()
            
            # Initialize VibeVoice service if available
            if self.vibevoice_service:
                try:
                    await self.vibevoice_service.initialize()
                    logger.info("✅ VibeVoice service initialized")
                    
                    # Add VibeVoice voices to available voices
                    vibevoice_voices = await self.vibevoice_service.get_available_voices()
                    for voice_id, voice_info in vibevoice_voices.items():
                        self.available_voices[f"vibevoice_{voice_id}"] = {
                            'name': f"VibeVoice {voice_info['name']}",
                            'engine': 'vibevoice',
                            'quality': voice_info['quality'],
                            'description': voice_info['description'],
                            'multi_speaker_capable': voice_info['multi_speaker_capable']
                        }
                        
                except Exception as e:
                    logger.warning(f"⚠️ VibeVoice initialization failed: {e}")
            
            # Test default voice
            await self._test_voice_generation()
            
            logger.info(f"✅ TTS Service initialized with {len(self.available_voices)} voices")
            logger.info(f"🎙️ Default voice: {self.default_voice}")
            logger.info(f"📋 Voice profiles loaded: {list(self.voice_profiles.keys())}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize TTS service: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Cleanup TTS resources"""
        try:
            # Cleanup VibeVoice service
            if self.vibevoice_service:
                await self.vibevoice_service.cleanup()
            
            # Clean up temporary files
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info("🧩 TTS Service cleanup complete")
        except Exception as e:
            logger.warning(f"TTS cleanup warning: {e}")
    
    async def _discover_voices(self) -> None:
        """Discover available Edge-TTS voices"""
        try:
            voices = await edge_tts.list_voices()
            
            # Focus on English voices, prioritize conversational ones
            for voice in voices:
                if voice['Locale'].startswith('en-'):
                    self.available_voices[voice['ShortName']] = {
                        'name': voice['FriendlyName'],
                        'gender': voice['Gender'], 
                        'locale': voice['Locale'],
                        'suggested_codec': voice.get('SuggestedCodec', 'audio-16khz-32kbitrate-mono-mp3'),
                        'voice_tag': voice.get('VoiceTag', {}),
                        'content_categories': voice.get('ContentCategories', []),
                        'voice_personalities': voice.get('VoicePersonalities', [])
                    }
            
            logger.info(f"🎤 Discovered {len(self.available_voices)} English voices")
            
        except Exception as e:
            logger.error(f"Voice discovery failed: {e}")
            # Set minimal fallback
            self.available_voices = {self.default_voice: {'name': 'Ava Neural', 'gender': 'Female'}}
    
    async def _test_voice_generation(self) -> None:
        """Test voice generation with default voice"""
        try:
            test_audio = await self.generate_speech("TTS service initialized successfully.", voice=self.default_voice)
            if len(test_audio) > 1000:  # Basic sanity check
                logger.info("✅ Voice generation test successful")
            else:
                logger.warning("⚠️ Voice generation test returned small audio file")
        except Exception as e:
            logger.warning(f"Voice generation test failed: {e}")
    
    async def health_check(self) -> bool:
        """Check if TTS service is healthy"""
        try:
            if not EDGE_TTS_AVAILABLE:
                return False
            return len(self.available_voices) > 0
        except Exception:
            return False
    
    async def generate_speech(
        self,
        text: str,
        voice: str = None,
        speed: float = 1.0,
        pitch: float = 1.0,
        volume: float = 1.0,
        emotion: str = "neutral",
        output_format: str = "wav"
    ) -> bytes:
        """Generate high-quality speech using Microsoft Neural Voices
        
        Args:
            text: Text to synthesize
            voice: Voice ID or profile name
            speed: Speech rate (0.5-2.0)
            pitch: Pitch adjustment (0.5-2.0) 
            volume: Volume level (0.1-2.0)
            emotion: Emotional style
            output_format: Output format (wav, mp3)
            
        Returns:
            Audio data as bytes
        """
        start_time = time.time()
        
        try:
            # Check if this is a VibeVoice request
            if voice.startswith("vibevoice_") and self.vibevoice_service:
                vibevoice_voice = voice[10:]  # Remove "vibevoice_" prefix
                logger.info(f"🎙️ Using VibeVoice for generation: '{text[:50]}...'")
                
                return await self.vibevoice_service.generate_speech(
                    text=text,
                    voice=vibevoice_voice,
                    output_format=output_format,
                    speed=speed,
                    emotion=emotion
                )
            
            # Use Edge-TTS for regular voices
            if not EDGE_TTS_AVAILABLE:
                raise Exception("Edge-TTS not available")
            
            # Resolve voice (profile name or direct voice ID)
            voice_id = self._resolve_voice_id(voice)
            
            # Apply voice profile settings if using a profile
            if voice in self.voice_profiles:
                profile = self.voice_profiles[voice]
                speed = profile.speed
                pitch = profile.pitch
                volume = profile.volume
                emotion = profile.emotion
            
            logger.info(f"🎙️ Generating speech: '{text[:50]}...' with {voice_id}")
            
            # TEMPORARILY DISABLE SSML - it's causing XML to be read aloud
            # Use plain text instead of SSML to avoid XML being spoken
            logger.info(f"🚫 Skipping SSML generation to avoid XML speech issues")
            
            # Generate speech with Edge-TTS using plain text
            tts = edge_tts.Communicate(text, voice_id)
            
            # Ensure temp directory exists
            self.temp_dir.mkdir(parents=True, exist_ok=True)
            
            # Save to temporary file
            temp_file = self.temp_dir / f"tts_{int(time.time() * 1000)}.mp3"
            await tts.save(str(temp_file))
            
            # Load and process audio
            audio_data = await self._process_audio(temp_file, output_format)
            
            # Cleanup temp file
            temp_file.unlink(missing_ok=True)
            
            self.last_processing_time = time.time() - start_time
            
            logger.info(f"✅ Speech generated in {self.last_processing_time:.2f}s ({len(audio_data)} bytes)")
            
            return audio_data
            
        except Exception as e:
            self.last_processing_time = time.time() - start_time
            logger.error(f"❌ Speech generation failed after {self.last_processing_time:.2f}s: {e}")
            raise Exception(f"TTS generation failed: {str(e)}")
    
    def _resolve_voice_id(self, voice: Optional[str]) -> str:
        """Resolve voice profile name to voice ID"""
        if not voice:
            return self.default_voice
            
        # Check if it's a profile name
        if voice in self.voice_profiles:
            return self.voice_profiles[voice].voice_id
            
        # Check if it's a valid voice ID
        if voice in self.available_voices:
            return voice
            
        logger.warning(f"Voice '{voice}' not found, using default: {self.default_voice}")
        return self.default_voice
    
    def _create_ssml(self, text: str, speed: float, pitch: float, volume: float, emotion: str) -> str:
        """Create SSML markup for advanced voice control"""
        # Clamp values to safe ranges
        speed = max(0.5, min(2.0, speed))
        pitch = max(0.5, min(2.0, pitch))
        volume = max(0.1, min(2.0, volume))
        
        # Convert to percentages for SSML
        speed_percent = f"{int((speed - 1) * 100):+d}%" if speed != 1.0 else "0%"
        pitch_percent = f"{int((pitch - 1) * 50):+d}%" if pitch != 1.0 else "0%"
        volume_percent = f"{int((volume - 1) * 100):+d}%" if volume != 1.0 else "0%"
        
        # Build SSML with prosody control
        ssml = f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
        ssml += f'<prosody rate="{speed_percent}" pitch="{pitch_percent}" volume="{volume_percent}">'
        
        # Add emotion/style if supported
        if emotion in ['excited', 'friendly', 'hopeful', 'sad', 'angry', 'fearful', 'disgruntled', 'serious', 'affectionate', 'gentle', 'calm']:
            ssml += f'<mstts:express-as style="{emotion}">{text}</mstts:express-as>'
        else:
            ssml += text
            
        ssml += '</prosody></speak>'
        
        return ssml
    
    async def _process_audio(self, audio_file: Path, output_format: str) -> bytes:
        """Process and convert audio to desired format"""
        try:
            # Load audio with pydub
            audio = AudioSegment.from_mp3(str(audio_file))
            
            # Apply any additional processing here
            # (noise reduction, normalization, etc.)
            
            # Normalize audio level
            audio = audio.normalize()
            
            # Export to desired format
            if output_format.lower() == "wav":
                return audio.export(format="wav").read()
            elif output_format.lower() == "mp3":
                return audio.export(format="mp3", bitrate="128k").read()
            else:
                return audio.export(format="wav").read()
                
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            # Return original file as fallback
            return audio_file.read_bytes()
    
    async def get_last_processing_time(self) -> float:
        """Get last processing time"""
        return self.last_processing_time
    
    def get_available_voices(self) -> Dict[str, Dict]:
        """Get all available voices"""
        return self.available_voices.copy()
    
    def get_voice_profiles(self) -> Dict[str, VoiceProfile]:
        """Get all voice profiles"""
        return self.voice_profiles.copy()
    
    def create_voice_profile(self, name: str, voice_id: str, **kwargs) -> bool:
        """Create a new voice profile"""
        try:
            if voice_id not in self.available_voices:
                logger.error(f"Voice ID '{voice_id}' not available")
                return False
                
            profile = VoiceProfile(name, voice_id, **kwargs)
            self.voice_profiles[name] = profile
            
            logger.info(f"✅ Created voice profile: {name} -> {voice_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create voice profile: {e}")
            return False
    
    async def get_performance_stats(self) -> Dict[str, Any]:
        """Get TTS performance statistics"""
        return {
            "available_voices": len(self.available_voices),
            "voice_profiles": len(self.voice_profiles),
            "default_voice": self.default_voice,
            "last_processing_time": self.last_processing_time,
            "temp_dir": str(self.temp_dir),
            "edge_tts_available": EDGE_TTS_AVAILABLE
        }
