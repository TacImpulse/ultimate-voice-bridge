"""
VibeVoice & Advanced TTS Service - Multi-Engine Support
Supports VibeVoice, Dia TTS, Orpheus TTS, Higgs Audio, and more
High-quality conversational AI voices for long-form synthesis
"""

import asyncio
import logging
import time
import tempfile
import os
import io
import subprocess
from typing import Optional, Dict, List, Any, Union, Tuple
from pathlib import Path
import json
from dataclasses import dataclass
from enum import Enum

try:
    import torch
    import numpy as np
    import soundfile as sf
    from pydub import AudioSegment
    import librosa
    TORCH_AVAILABLE = True
except ImportError as e:
    TORCH_AVAILABLE = False
    torch = None

logger = logging.getLogger(__name__)


class TTSEngine(Enum):
    """Supported TTS engines"""
    VIBEVOICE_1_5B = "vibevoice-1.5b"
    VIBEVOICE_7B = "vibevoice-7b" 
    DIA_TTS = "dia-tts"
    ORPHEUS_TTS = "orpheus-tts"
    HIGGS_AUDIO_V2 = "higgs-audio-v2"
    LLM_TTS = "llm-tts"
    EDGE_TTS = "edge-tts"  # Fallback


@dataclass
class VoiceConfig:
    """Configuration for a voice/speaker"""
    name: str
    engine: TTSEngine
    model_path: Optional[str] = None
    voice_sample: Optional[str] = None
    speaker_id: Optional[str] = None
    language: str = "en"
    quality: str = "high"  # low, medium, high, ultra
    description: str = ""


@dataclass
class TTSRequest:
    """TTS generation request"""
    text: str
    voice_config: VoiceConfig
    output_format: str = "wav"
    sample_rate: int = 24000
    speed: float = 1.0
    emotion: Optional[str] = None
    multi_speaker: bool = False
    speaker_mapping: Optional[Dict[str, str]] = None


class VibeVoiceService:
    """Advanced TTS Service with multiple engine support"""

    def __init__(self):
        self.engines = {}
        self.voice_configs: Dict[str, VoiceConfig] = {}
        self.temp_dir = Path(tempfile.gettempdir()) / "vibevoice_tts"
        self.temp_dir.mkdir(exist_ok=True)
        self.device = self._get_optimal_device()
        
        # Initialize available engines
        self._initialize_voice_configs()
        
    def _get_optimal_device(self) -> str:
        """Get optimal device for inference"""
        if not TORCH_AVAILABLE:
            return "cpu"
        
        if torch.cuda.is_available():
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps" 
        else:
            return "cpu"

    def _initialize_voice_configs(self):
        """Initialize voice configurations for different engines"""
        
        # VibeVoice voices
        self.voice_configs.update({
            "vibevoice-alice": VoiceConfig(
                name="Alice",
                engine=TTSEngine.VIBEVOICE_1_5B,
                model_path="vibevoice/VibeVoice-1.5B",
                description="Expressive female voice, great for conversations"
            ),
            "vibevoice-andrew": VoiceConfig(
                name="Andrew", 
                engine=TTSEngine.VIBEVOICE_1_5B,
                model_path="vibevoice/VibeVoice-1.5B",
                description="Confident male voice, ideal for narration"
            ),
            "vibevoice-large-alice": VoiceConfig(
                name="Alice (Large)",
                engine=TTSEngine.VIBEVOICE_7B,
                model_path="vibevoice/VibeVoice-7B",
                quality="ultra",
                description="Ultra-high quality Alice with 7B model"
            ),
        })
        
        # Dia TTS voices
        self.voice_configs.update({
            "dia-default": VoiceConfig(
                name="Dia Default",
                engine=TTSEngine.DIA_TTS,
                model_path="nari-labs/dia-tts-1.6b",
                description="Ultra-realistic dialogue synthesis"
            ),
            "dia-speaker-1": VoiceConfig(
                name="Dia Speaker 1",
                engine=TTSEngine.DIA_TTS,
                speaker_id="S1",
                description="Dia TTS Speaker 1 - Natural conversation"
            ),
            "dia-speaker-2": VoiceConfig(
                name="Dia Speaker 2", 
                engine=TTSEngine.DIA_TTS,
                speaker_id="S2",
                description="Dia TTS Speaker 2 - Expressive dialogue"
            ),
        })
        
        # Orpheus TTS voices
        self.voice_configs.update({
            "orpheus-tara": VoiceConfig(
                name="Tara",
                engine=TTSEngine.ORPHEUS_TTS,
                speaker_id="tara",
                description="Natural, highly expressive voice"
            ),
        })

    async def initialize(self) -> None:
        """Initialize the TTS service"""
        try:
            logger.info(f"🎙️ Initializing VibeVoice service on {self.device}")
            
            # Check available engines
            await self._check_engine_availability()
            
            logger.info(f"✅ VibeVoice service initialized")
            logger.info(f"📋 Available voices: {list(self.voice_configs.keys())}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize VibeVoice service: {e}")
            raise

    async def _check_engine_availability(self):
        """Check which TTS engines are available"""
        available_engines = []
        
        # Check VibeVoice
        try:
            from vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
            from vibevoice.processor.vibevoice_processor import VibeVoiceProcessor
            available_engines.append("VibeVoice")
            logger.info("✅ VibeVoice available")
        except ImportError:
            logger.warning("⚠️ VibeVoice not available")

        # Check Dia TTS 
        try:
            # This would be the actual Dia TTS import
            # import dia_tts  # Placeholder
            logger.info("ℹ️ Dia TTS check skipped (not implemented yet)")
        except ImportError:
            pass

        # Check Orpheus TTS
        try:
            # This would be the actual Orpheus import 
            # from orpheus_tts import OrpheusModel  # Placeholder
            logger.info("ℹ️ Orpheus TTS check skipped (not implemented yet)")
        except ImportError:
            pass
            
        # Check llm-tts availability
        llm_tts_available = subprocess.run(
            ["llm", "tts", "--help"], 
            capture_output=True, 
            text=True
        ).returncode == 0
        
        if llm_tts_available:
            available_engines.append("llm-tts")
            logger.info("✅ llm-tts available")

        self.available_engines = available_engines

    async def generate_speech(
        self,
        text: str,
        voice: str = "vibevoice-alice",
        output_format: str = "wav",
        multi_speaker: bool = None,
        speaker_mapping: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> bytes:
        """Generate speech using the specified voice/engine"""
        
        start_time = time.time()
        
        try:
            # Get voice configuration
            if voice not in self.voice_configs:
                logger.warning(f"Voice '{voice}' not found, using default")
                voice = "vibevoice-alice"
            
            voice_config = self.voice_configs[voice]
            
            # Auto-detect multi-speaker if not specified
            if multi_speaker is None:
                multi_speaker = self._detect_multi_speaker(text)
            
            # Create TTS request
            request = TTSRequest(
                text=text,
                voice_config=voice_config,
                output_format=output_format,
                multi_speaker=multi_speaker,
                speaker_mapping=speaker_mapping,
                **kwargs
            )
            
            logger.info(f"🎙️ Generating speech with {voice_config.engine.value}: '{text[:50]}...'")
            
            # Route to appropriate engine
            audio_data = await self._route_to_engine(request)
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Speech generated in {processing_time:.2f}s ({len(audio_data)} bytes)")
            
            return audio_data
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ Speech generation failed after {processing_time:.2f}s: {e}")
            raise Exception(f"TTS generation failed: {str(e)}")

    def _detect_multi_speaker(self, text: str) -> bool:
        """Auto-detect if text contains multiple speakers"""
        speaker_patterns = [
            r'Speaker \d+:', r'\[S\d+\]', r'Person \d+:', 
            r'Host:', r'Guest:', r'Interviewer:', r'Interviewee:'
        ]
        
        import re
        for pattern in speaker_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    async def _route_to_engine(self, request: TTSRequest) -> bytes:
        """Route TTS request to appropriate engine"""
        
        engine = request.voice_config.engine
        
        if engine in [TTSEngine.VIBEVOICE_1_5B, TTSEngine.VIBEVOICE_7B]:
            return await self._generate_vibevoice(request)
        elif engine == TTSEngine.DIA_TTS:
            return await self._generate_dia_tts(request)
        elif engine == TTSEngine.ORPHEUS_TTS:
            return await self._generate_orpheus_tts(request)
        elif engine == TTSEngine.LLM_TTS:
            return await self._generate_llm_tts(request)
        else:
            raise ValueError(f"Unsupported engine: {engine}")

    async def _generate_vibevoice(self, request: TTSRequest) -> bytes:
        """Generate speech using VibeVoice"""
        try:
            from vibevoice.modular.modeling_vibevoice_inference import VibeVoiceForConditionalGenerationInference
            from vibevoice.processor.vibevoice_processor import VibeVoiceProcessor
            
            # Load model and processor
            model_path = request.voice_config.model_path
            processor = VibeVoiceProcessor.from_pretrained(model_path)
            
            # Configure model loading based on device
            if self.device == "mps":
                load_dtype = torch.float32
                attn_impl = "sdpa"
            elif self.device == "cuda":
                load_dtype = torch.bfloat16
                attn_impl = "flash_attention_2"
            else:
                load_dtype = torch.float32
                attn_impl = "sdpa"
                
            model = VibeVoiceForConditionalGenerationInference.from_pretrained(
                model_path,
                torch_dtype=load_dtype,
                attn_implementation=attn_impl,
                device_map=self.device if self.device != "cpu" else None,
            )
            
            if self.device == "mps":
                model.to("mps")
                
            model.eval()
            model.set_ddpm_inference_steps(num_steps=10)
            
            # Prepare voice samples (use default voices for now)
            voice_samples = [self._get_default_voice_sample(request.voice_config.name)]
            
            # Process text and generate
            inputs = processor(
                text=[request.text],
                voice_samples=[voice_samples],
                padding=True,
                return_tensors="pt",
                return_attention_mask=True,
            )
            
            # Move to device
            for k, v in inputs.items():
                if torch.is_tensor(v):
                    inputs[k] = v.to(self.device)
            
            # Generate audio
            outputs = model.generate(
                **inputs,
                max_new_tokens=None,
                cfg_scale=1.3,
                tokenizer=processor.tokenizer,
                generation_config={'do_sample': False},
                verbose=False,
            )
            
            # Convert to audio bytes
            if outputs.speech_outputs and outputs.speech_outputs[0] is not None:
                audio_array = outputs.speech_outputs[0].cpu().numpy()
                
                # Convert to bytes
                temp_file = self.temp_dir / f"vibevoice_{int(time.time() * 1000)}.wav"
                sf.write(temp_file, audio_array, request.sample_rate)
                
                audio_bytes = temp_file.read_bytes()
                temp_file.unlink()
                
                return audio_bytes
            else:
                raise Exception("No audio output generated")
                
        except ImportError:
            raise Exception("VibeVoice not available. Please install: pip install vibevoice")

    async def _generate_dia_tts(self, request: TTSRequest) -> bytes:
        """Generate speech using Dia TTS"""
        # Placeholder for Dia TTS implementation
        # This would be implemented when Dia TTS package is available
        raise NotImplementedError("Dia TTS integration not yet implemented")

    async def _generate_orpheus_tts(self, request: TTSRequest) -> bytes:
        """Generate speech using Orpheus TTS"""
        # Placeholder for Orpheus TTS implementation
        try:
            # This is a mock implementation based on the GitHub example
            # from orpheus_tts import OrpheusModel
            
            # model = OrpheusModel(
            #     model_name="canopylabs/orpheus-tts-0.1-finetune-prod",
            #     max_model_len=2048
            # )
            
            # syn_tokens = model.generate_speech(
            #     prompt=request.text,
            #     voice=request.voice_config.speaker_id or "tara"
            # )
            
            # # Convert syn_tokens to audio bytes
            # # This would depend on the actual Orpheus TTS API
            
            raise NotImplementedError("Orpheus TTS integration not yet implemented")
            
        except ImportError:
            raise Exception("Orpheus TTS not available")

    async def _generate_llm_tts(self, request: TTSRequest) -> bytes:
        """Generate speech using llm-tts (external command)"""
        try:
            temp_file = self.temp_dir / f"llm_tts_{int(time.time() * 1000)}.{request.output_format}"
            
            # Build llm-tts command
            cmd = [
                "llm", "tts",
                "--output-file", str(temp_file),
                "--model", "gpt-4o-mini-tts",  # or other supported models
                request.text
            ]
            
            # Run llm-tts
            result = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await result.communicate()
            
            if result.returncode != 0:
                raise Exception(f"llm-tts failed: {stderr.decode()}")
            
            if temp_file.exists():
                audio_bytes = temp_file.read_bytes()
                temp_file.unlink()
                return audio_bytes
            else:
                raise Exception("llm-tts did not produce output file")
                
        except FileNotFoundError:
            raise Exception("llm-tts not available. Install with: llm install git+https://github.com/mlang/llm-tts")

    def _get_default_voice_sample(self, speaker_name: str) -> str:
        """Get path to default voice sample for a speaker"""
        # This would return path to pre-recorded voice samples
        # For now, return a placeholder path
        voices_dir = Path(__file__).parent.parent / "vibevoice-community" / "demo" / "voices"
        
        # Map speaker names to voice files
        voice_mapping = {
            "Alice": "alice.wav",
            "Andrew": "andrew.wav",
            "Frank": "frank.wav",
        }
        
        voice_file = voice_mapping.get(speaker_name, "alice.wav")
        voice_path = voices_dir / voice_file
        
        if voice_path.exists():
            return str(voice_path)
        else:
            # Return a default or create a synthetic voice sample
            logger.warning(f"Voice sample not found for {speaker_name}, using default")
            return str(voices_dir / "alice.wav") if (voices_dir / "alice.wav").exists() else ""

    async def get_available_voices(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available voices"""
        voices = {}
        
        for voice_id, config in self.voice_configs.items():
            voices[voice_id] = {
                "name": config.name,
                "engine": config.engine.value,
                "language": config.language,
                "quality": config.quality,
                "description": config.description,
                "multi_speaker_capable": config.engine in [
                    TTSEngine.VIBEVOICE_1_5B, 
                    TTSEngine.VIBEVOICE_7B,
                    TTSEngine.DIA_TTS
                ]
            }
            
        return voices

    async def health_check(self) -> bool:
        """Check if the service is healthy"""
        try:
            return len(self.available_engines) > 0 and TORCH_AVAILABLE
        except Exception:
            return False

    async def cleanup(self) -> None:
        """Cleanup resources"""
        try:
            # Clean up temporary files
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info("🧹 VibeVoice service cleanup complete")
        except Exception as e:
            logger.warning(f"Cleanup warning: {e}")

    async def create_conversation(
        self,
        script: str,
        speaker_voices: Dict[str, str],
        output_format: str = "wav"
    ) -> bytes:
        """Create a multi-speaker conversation"""
        try:
            # Parse the script for speakers
            segments = self._parse_conversation_script(script)
            
            # Generate audio for each segment
            audio_segments = []
            
            for speaker, text in segments:
                voice = speaker_voices.get(speaker, "vibevoice-alice")
                audio_data = await self.generate_speech(
                    text=text,
                    voice=voice,
                    output_format=output_format
                )
                
                # Convert to AudioSegment for concatenation
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
                audio_segments.append(audio_segment)
                
                # Add small pause between speakers
                pause = AudioSegment.silent(duration=500)  # 500ms pause
                audio_segments.append(pause)
            
            # Concatenate all segments
            final_audio = sum(audio_segments)
            
            # Export to bytes
            buffer = io.BytesIO()
            final_audio.export(buffer, format=output_format)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Conversation creation failed: {e}")
            raise

    def _parse_conversation_script(self, script: str) -> List[Tuple[str, str]]:
        """Parse a conversation script into (speaker, text) segments"""
        import re
        
        segments = []
        lines = script.strip().split('\n')
        
        current_speaker = None
        current_text = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for speaker indicators
            speaker_match = re.match(r'^(Speaker \d+|Host|Guest|Interviewer|Interviewee|\[S\d+\])\s*:\s*(.*)$', line, re.IGNORECASE)
            
            if speaker_match:
                # Save previous segment
                if current_speaker and current_text:
                    segments.append((current_speaker, current_text.strip()))
                
                # Start new segment
                current_speaker = speaker_match.group(1)
                current_text = speaker_match.group(2)
            else:
                # Continue current speaker's text
                if current_text:
                    current_text += " " + line
                else:
                    current_text = line
        
        # Don't forget the last segment
        if current_speaker and current_text:
            segments.append((current_speaker, current_text.strip()))
        
        return segments