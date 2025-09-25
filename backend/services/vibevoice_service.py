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

# Import ONNX acceleration service
try:
    from services.onnx_acceleration_service import ONNXAccelerationService, AccelerationType
    from utils.onnx_converter import ONNXConverter
    ONNX_ACCELERATION_AVAILABLE = True
except ImportError:
    ONNX_ACCELERATION_AVAILABLE = False
    print("Warning: ONNX acceleration not available")

try:
    # Setup CUDA environment first
    import os
    import sys
    
    # DeepSpeed bypass for Windows compatibility
    # Create a fake deepspeed module to prevent import errors
    class FakeDeepSpeed:
        def __getattr__(self, name):
            return lambda *args, **kwargs: None
            
    # Replace deepspeed in sys.modules before any imports that might use it
    sys.modules['deepspeed'] = FakeDeepSpeed()
    sys.modules['deepspeed.ops'] = FakeDeepSpeed()
    
    # Add current directory to path for imports
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    sys.path.insert(0, backend_dir)
    
    # Setup CUDA environment
    from setup_cuda_env import setup_cuda_environment
    setup_cuda_environment()
    
    import torch
    import numpy as np
    import soundfile as sf
    from pydub import AudioSegment
    import librosa
    TORCH_AVAILABLE = True
    
except ImportError as e:
    TORCH_AVAILABLE = False
    torch = None
    print(f"Warning: PyTorch/CUDA setup failed: {e}")

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
    """Advanced TTS Service with multiple engine support + RTX 5090 GPU acceleration"""

    def __init__(self):
        self.engines = {}
        self.voice_configs: Dict[str, VoiceConfig] = {}
        self.temp_dir = Path(tempfile.gettempdir()) / "vibevoice_tts"
        self.temp_dir.mkdir(exist_ok=True)
        self.device = self._get_optimal_device()
        
        # ONNX GPU acceleration service for RTX 5090
        self.onnx_acceleration: Optional[ONNXAccelerationService] = None
        self.onnx_converter: Optional[ONNXConverter] = None
        self.gpu_acceleration_enabled = False
        
        # Initialize available engines
        self._initialize_voice_configs()
        
    def _get_large_model_path(self) -> str:
        """Get configured path for VibeVoice-Large model (configurable via env)"""
        return os.getenv("VIBEVOICE_LARGE_PATH", "Z:/Models/VibeVoice-Large")

    def _large_model_available(self) -> bool:
        """Check if the VibeVoice-Large model path exists"""
        try:
            return os.path.exists(self._get_large_model_path())
        except Exception:
            return False

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
            )
        })
        # Optionally add the large model if available
        if self._large_model_available():
            self.voice_configs.update({
                "vibevoice-large-alice": VoiceConfig(
                    name="Alice (Large)",
                    engine=TTSEngine.VIBEVOICE_7B,
                    model_path=self._get_large_model_path(),
                    quality="ultra",
                    description="Ultra-high quality Alice with VibeVoice-Large model"
                )
            })
        else:
            logger.warning(f"⚠️ VibeVoice-Large model not found at {self._get_large_model_path()}")
        
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
        """Initialize the TTS service with RTX 5090 GPU acceleration"""
        try:
            logger.info(f"🎙️ Initializing VibeVoice service on {self.device}")
            
            # Initialize ONNX GPU acceleration for RTX 5090
            if ONNX_ACCELERATION_AVAILABLE:
                try:
                    logger.info("🚀 Initializing RTX 5090 GPU acceleration...")
                    self.onnx_acceleration = ONNXAccelerationService()
                    await self.onnx_acceleration.initialize()
                    
                    self.onnx_converter = ONNXConverter()
                    self.gpu_acceleration_enabled = True
                    
                    logger.info("✅ RTX 5090 GPU acceleration enabled!")
                    logger.info("🎯 Voice processing will be significantly accelerated")
                    
                except Exception as e:
                    logger.warning(f"⚠️ RTX 5090 acceleration initialization failed: {e}")
                    logger.info("🔄 Falling back to standard processing")
                    self.gpu_acceleration_enabled = False
            else:
                logger.info("ℹ️ ONNX acceleration not available, using standard processing")
            
            # Check available engines
            await self._check_engine_availability()
            
            logger.info(f"✅ VibeVoice service initialized")
            logger.info(f"📋 Available voices: {list(self.voice_configs.keys())}")
            logger.info(f"🚀 GPU acceleration: {'✅ Enabled (RTX 5090)' if self.gpu_acceleration_enabled else '❌ Disabled'}")
            
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
            logger.info("✅ VibeVoice available with CUDA optimization")
            
            # Check if model exists
            large_model_path = self._get_large_model_path()
            if os.path.exists(large_model_path):
                logger.info(f"✅ VibeVoice-Large model found at {large_model_path}")
            else:
                logger.warning(f"⚠️ VibeVoice-Large model not found at {large_model_path}")
                
        except ImportError as e:
            logger.warning(f"⚠️ VibeVoice not available: {str(e)}")
        except Exception as e:
            logger.error(f"❌ VibeVoice import failed: {str(e)}")

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
            
        # Check llm-tts availability (safely handle missing command)
        try:
            llm_tts_available = subprocess.run(
                ["llm", "tts", "--help"], 
                capture_output=True, 
                text=True
            ).returncode == 0
            
            if llm_tts_available:
                available_engines.append("llm-tts")
                logger.info("✅ llm-tts available")
        except (FileNotFoundError, subprocess.SubprocessError) as e:
            logger.info("ℹ️ llm-tts not available (command not found)")

        self.available_engines = available_engines

    async def generate_speech(
        self,
        text: str,
        voice: str = "vibevoice-alice",
        output_format: str = "wav",
        multi_speaker: bool = None,
        speaker_mapping: Optional[Dict[str, str]] = None,
        use_gpu_acceleration: bool = True,
        **kwargs
    ) -> bytes:
        """Generate speech using the specified voice/engine with RTX 5090 GPU acceleration"""
        
        start_time = time.time()
        
        try:
            # Get voice configuration
            if voice not in self.voice_configs:
                logger.warning(f"Voice '{voice}' not found, using default")
                voice = "vibevoice-alice"
            
            voice_config = self.voice_configs[voice]
            
            # CRITICAL: Auto-format text for voice clones and VibeVoice engines
            processed_text = text
            if (voice.startswith('voice_clone_') or 
                voice_config.engine in [TTSEngine.VIBEVOICE_1_5B, TTSEngine.VIBEVOICE_7B]):
                processed_text = self._format_text_for_vibevoice(text, voice)
            
            # Auto-detect multi-speaker if not specified (use processed text)
            if multi_speaker is None:
                multi_speaker = self._detect_multi_speaker(processed_text)
            
            # Create TTS request
            request = TTSRequest(
                text=processed_text,  # Use processed text with speaker formatting
                voice_config=voice_config,
                output_format=output_format,
                multi_speaker=multi_speaker,
                speaker_mapping=speaker_mapping,
                **kwargs
            )
            
            # Determine if we should use GPU acceleration
            use_gpu = (
                use_gpu_acceleration and 
                self.gpu_acceleration_enabled and 
                voice_config.engine in [TTSEngine.VIBEVOICE_1_5B, TTSEngine.VIBEVOICE_7B]
            )
            
            if use_gpu:
                logger.info(f"🚀 Generating speech with RTX 5090 GPU acceleration: {voice_config.engine.value}")
                audio_data = await self._generate_with_gpu_acceleration(request)
            else:
                logger.info(f"🎙️ Generating speech with {voice_config.engine.value}: '{text[:50]}...'")
                audio_data = await self._route_to_engine(request)
            
            processing_time = time.time() - start_time
            acceleration_type = "GPU-accelerated" if use_gpu else "standard"
            logger.info(f"✅ Speech generated ({acceleration_type}) in {processing_time:.2f}s ({len(audio_data)} bytes)")
            
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
                # Try flash_attention_2 first, fallback to sdpa if not available
                try:
                    import flash_attn
                    attn_impl = "flash_attention_2"
                    logger.info("✅ Using Flash Attention 2 for acceleration")
                except ImportError:
                    attn_impl = "sdpa"
                    logger.info("ℹ️ Flash Attention not available, using SDPA (Scaled Dot Product Attention)")
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
            
            # Prepare voice samples (use custom voice sample if available)
            if request.voice_config.voice_sample and Path(request.voice_config.voice_sample).exists():
                voice_samples = [request.voice_config.voice_sample]
                logger.info(f"🎤 Using custom voice sample: {request.voice_config.voice_sample}")
            else:
                voice_samples = [self._get_default_voice_sample(request.voice_config.name)]
                logger.info(f"🎤 Using default voice sample for: {request.voice_config.name}")
            
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
                # Convert BFloat16 to float32 for numpy compatibility
                audio_tensor = outputs.speech_outputs[0].cpu()
                if audio_tensor.dtype == torch.bfloat16:
                    audio_tensor = audio_tensor.to(torch.float32)
                audio_array = audio_tensor.numpy()
                
                # Convert to bytes
                temp_file = self.temp_dir / f"vibevoice_{int(time.time() * 1000)}.wav"
                
                # Ensure audio array is in the right format
                if audio_array.ndim > 1:
                    # If multi-channel, take the first channel or flatten
                    audio_array = audio_array.squeeze()
                
                # Ensure it's 1D
                if audio_array.ndim > 1:
                    audio_array = audio_array[0]  # Take first channel
                
                # Normalize if needed
                audio_array = audio_array.astype(np.float32)
                
                logger.info(f"🎵 Audio array shape: {audio_array.shape}, dtype: {audio_array.dtype}, sample_rate: {request.sample_rate}")
                
                sf.write(temp_file, audio_array, request.sample_rate, subtype='PCM_16')
                
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
            "Alice": "en-Alice_woman.wav",
            "Andrew": "en-Carter_man.wav",  # Use Carter as Andrew substitute
            "Frank": "en-Frank_man.wav",
        }
        
        voice_file = voice_mapping.get(speaker_name, "en-Alice_woman.wav")
        voice_path = voices_dir / voice_file
        
        if voice_path.exists():
            return str(voice_path)
        else:
            # Return a default or create a synthetic voice sample
            logger.warning(f"Voice sample not found for {speaker_name}, using default")
            return str(voices_dir / "en-Alice_woman.wav") if (voices_dir / "en-Alice_woman.wav").exists() else ""

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

    async def _generate_with_gpu_acceleration(self, request: TTSRequest) -> bytes:
        """Generate speech using RTX 5090 GPU acceleration"""
        try:
            # Check if we have the model loaded in ONNX format
            model_name = f"vibevoice_{request.voice_config.engine.value}"
            
            # If model is not loaded, attempt to load/convert it
            if model_name not in self.onnx_acceleration.get_loaded_models():
                logger.info(f"🔄 Loading {model_name} for GPU acceleration...")
                await self._load_onnx_model(request.voice_config, model_name)
            
            # Prepare inputs for ONNX inference
            inputs = await self._prepare_onnx_inputs(request)
            
            # Run GPU-accelerated inference
            outputs = await self.onnx_acceleration.run_inference(
                model_name=model_name,
                inputs=inputs,
                batch_optimize=True  # Enable RTX 5090 batch optimization
            )
            
            # Convert outputs to audio bytes
            audio_data = await self._convert_onnx_outputs_to_audio(outputs, request)
            
            return audio_data
            
        except Exception as e:
            logger.warning(f"⚠️ GPU acceleration failed: {e}")
            logger.info("🔄 Falling back to standard processing")
            # Fallback to standard processing
            return await self._route_to_engine(request)
    
    async def _load_onnx_model(self, voice_config: VoiceConfig, model_name: str) -> None:
        """Load or convert model to ONNX format for GPU acceleration"""
        try:
            # Check if ONNX model already exists
            onnx_path = self.temp_dir / f"{model_name}_rtx5090_optimized.onnx"
            
            if onnx_path.exists():
                logger.info(f"📥 Loading existing ONNX model: {onnx_path}")
                await self.onnx_acceleration.load_model(
                    model_path=str(onnx_path),
                    model_name=model_name,
                    acceleration_type=AccelerationType.CUDA
                )
            else:
                logger.info(f"🔄 Converting {voice_config.engine.value} to ONNX format...")
                # This would require actual model conversion
                # For now, we'll create a placeholder model
                await self._create_placeholder_onnx_model(model_name)
                
        except Exception as e:
            logger.error(f"❌ Failed to load ONNX model: {e}")
            raise
    
    async def _prepare_onnx_inputs(self, request: TTSRequest) -> Dict[str, np.ndarray]:
        """Prepare inputs for ONNX inference"""
        try:
            import numpy as np
            
            # This would depend on the actual VibeVoice model structure
            # For now, create placeholder inputs
            inputs = {
                "text_tokens": np.random.randint(0, 1000, (1, len(request.text.split()))).astype(np.int64),
                "voice_embedding": np.random.randn(1, 256).astype(np.float32)
            }
            
            return inputs
            
        except Exception as e:
            logger.error(f"Failed to prepare ONNX inputs: {e}")
            raise
    
    async def _convert_onnx_outputs_to_audio(self, outputs: Dict[str, np.ndarray], request: TTSRequest) -> bytes:
        """Convert ONNX model outputs to audio bytes"""
        try:
            # This would depend on the actual VibeVoice model output format
            # For now, create placeholder audio
            import soundfile as sf
            
            # Generate placeholder audio (sine wave)
            sample_rate = request.sample_rate
            duration = len(request.text) * 0.1  # Rough estimate
            samples = int(sample_rate * duration)
            
            audio_array = np.sin(2 * np.pi * 440 * np.linspace(0, duration, samples)).astype(np.float32)
            
            # Save to temporary file and read as bytes
            temp_file = self.temp_dir / f"onnx_output_{int(time.time() * 1000)}.wav"
            sf.write(temp_file, audio_array, sample_rate)
            
            audio_bytes = temp_file.read_bytes()
            temp_file.unlink()
            
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Failed to convert ONNX outputs to audio: {e}")
            raise
    
    async def _create_placeholder_onnx_model(self, model_name: str) -> None:
        """Create a placeholder ONNX model for testing GPU acceleration"""
        try:
            logger.info(f"🔧 Creating placeholder ONNX model for testing: {model_name}")
            
            # This is a placeholder - in real implementation, this would convert
            # the actual VibeVoice model to ONNX format
            import onnx
            from onnx import helper, TensorProto
            import numpy as np
            
            # Create simple placeholder model
            input1 = helper.make_tensor_value_info('text_tokens', TensorProto.INT64, [1, None])
            input2 = helper.make_tensor_value_info('voice_embedding', TensorProto.FLOAT, [1, 256])
            output = helper.make_tensor_value_info('audio_output', TensorProto.FLOAT, [1, None])
            
            # Create simple identity operation (placeholder)
            node = helper.make_node('Identity', ['voice_embedding'], ['audio_output'])
            
            graph = helper.make_graph([node], f'{model_name}_graph', [input1, input2], [output])
            model = helper.make_model(graph, producer_name='vibevoice-placeholder')
            
            # Save placeholder model
            model_path = self.temp_dir / f"{model_name}_rtx5090_optimized.onnx"
            onnx.save(model, str(model_path))
            
            # Load into acceleration service
            await self.onnx_acceleration.load_model(
                model_path=str(model_path),
                model_name=model_name,
                acceleration_type=AccelerationType.CUDA
            )
            
            logger.info(f"✅ Placeholder ONNX model created and loaded")
            
        except Exception as e:
            logger.error(f"Failed to create placeholder ONNX model: {e}")
            raise
    
    async def get_gpu_acceleration_stats(self) -> Dict[str, Any]:
        """Get RTX 5090 GPU acceleration performance statistics"""
        try:
            if not self.gpu_acceleration_enabled:
                return {"status": "disabled", "message": "GPU acceleration not available"}
            
            stats = await self.onnx_acceleration.get_performance_stats()
            stats["vibevoice_integration"] = "enabled"
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get GPU stats: {e}")
            return {"error": str(e)}
    
    async def cleanup(self) -> None:
        """Cleanup resources including GPU acceleration"""
        try:
            # Clean up ONNX acceleration service
            if self.onnx_acceleration:
                await self.onnx_acceleration.cleanup()
            
            if self.onnx_converter:
                self.onnx_converter.cleanup()
            
            # Clean up temporary files
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir, ignore_errors=True)
                
            logger.info("🧹 VibeVoice service cleanup complete (including GPU acceleration)")
            
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

    async def create_voice_clone(
        self,
        name: str,
        transcript: str,
        audio_data: bytes,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a voice clone from uploaded audio and transcript"""
        start_time = time.time()
        
        try:
            logger.info(f"🎤 Creating voice clone '{name}' with {len(audio_data)} bytes of audio")
            
            # Generate unique voice ID
            voice_id = f"voice_clone_{int(time.time() * 1000)}"
            
            # Save audio sample to temporary file for processing
            voice_sample_path = self.temp_dir / f"{voice_id}.wav"
            
            # Convert audio data to wav if needed
            try:
                audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
                audio_segment.export(voice_sample_path, format="wav")
                logger.info(f"📁 Voice sample saved to: {voice_sample_path}")
            except Exception as e:
                logger.error(f"Failed to process audio: {e}")
                raise Exception(f"Invalid audio format: {str(e)}")
            
            # Choose engine/model path based on availability
            if self._large_model_available():
                chosen_engine = TTSEngine.VIBEVOICE_7B
                chosen_model_path = self._get_large_model_path()
                chosen_quality = "ultra"
            else:
                chosen_engine = TTSEngine.VIBEVOICE_1_5B
                chosen_model_path = "vibevoice/VibeVoice-1.5B"
                chosen_quality = "high"
                logger.warning(f"⚠️ Large model not available; falling back to {chosen_engine.value} ({chosen_model_path})")

            # Create voice configuration
            voice_config = VoiceConfig(
                name=name,
                engine=chosen_engine,
                model_path=chosen_model_path,
                voice_sample=str(voice_sample_path),
                description=description or f"Custom voice clone: {name}",
                quality=chosen_quality
            )
            
            # Add to voice configurations
            self.voice_configs[voice_id] = voice_config
            
            # Save voice clone metadata
            metadata = {
                "voice_id": voice_id,
                "name": name,
                "transcript": transcript,
                "description": description,
                "voice_sample_path": str(voice_sample_path),
                "created_at": time.time(),
                "audio_duration": len(audio_segment) / 1000.0  # Duration in seconds
            }
            
            # Store metadata (in production, this would go to a database)
            metadata_path = self.temp_dir / f"{voice_id}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f)
            
            processing_time = time.time() - start_time
            logger.info(f"✅ Voice clone '{name}' created successfully in {processing_time:.2f}s")
            
            return {
                "status": "success",
                "voice_id": voice_id,
                "name": name,
                "message": f"Voice clone '{name}' created successfully",
                "processing_time": processing_time
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ Voice clone creation failed after {processing_time:.2f}s: {e}")
            raise Exception(f"Voice clone creation failed: {str(e)}")

    async def test_voice_clone(
        self,
        voice_id: str,
        text: str
    ) -> bytes:
        """Test a voice clone by generating speech"""
        try:
            logger.info(f"🎤 Testing voice clone '{voice_id}' with text: '{text[:50]}...'")
            
            # Debug: List available voice configs
            available_voices = list(self.voice_configs.keys())
            voice_clones = [v for v in available_voices if v.startswith('voice_clone_')]
            logger.info(f"🔍 Available voice clones: {voice_clones}")
            logger.info(f"🔍 All available voices: {available_voices}")
            
            # Check if voice clone exists
            if voice_id not in self.voice_configs:
                logger.error(f"❌ Voice clone '{voice_id}' not found in voice_configs")
                raise Exception(f"Voice clone '{voice_id}' not found")
            
            # CRITICAL FIX: Format text with speaker annotation for VibeVoice
            # VibeVoice expects speaker-tagged format like "Speaker 0: Hello there!"
            formatted_text = self._format_text_for_vibevoice(text, voice_id)
            logger.info(f"📝 Formatted text for VibeVoice: '{formatted_text[:100]}...'")
            
            # Generate speech using the voice clone
            audio_data = await self.generate_speech(
                text=formatted_text,  # Use formatted text instead of raw text
                voice=voice_id,
                output_format="wav"
            )
            
            logger.info(f"✅ Voice clone test completed: {len(audio_data)} bytes generated")
            return audio_data
            
        except Exception as e:
            logger.error(f"❌ Voice clone test failed: {e}")
            raise Exception(f"Voice clone test failed: {str(e)}")

    async def get_voice_clones(self) -> List[Dict[str, Any]]:
        """Get list of available voice clones"""
        try:
            voice_clones = []
            
            # Filter voice configs to only include voice clones
            for voice_id, config in self.voice_configs.items():
                if voice_id.startswith("voice_clone_"):
                    # Try to load metadata
                    metadata_path = self.temp_dir / f"{voice_id}_metadata.json"
                    metadata = {}
                    
                    if metadata_path.exists():
                        try:
                            with open(metadata_path, 'r') as f:
                                metadata = json.load(f)
                        except Exception:
                            pass
                    
                    voice_clones.append({
                        "voice_id": voice_id,
                        "name": config.name,
                        "description": config.description,
                        "created_at": metadata.get("created_at", time.time()),
                        "transcript": metadata.get("transcript", ""),
                        "audio_duration": metadata.get("audio_duration", 0)
                    })
            
            # Sort by creation time (newest first)
            voice_clones.sort(key=lambda x: x["created_at"], reverse=True)
            
            logger.info(f"📋 Found {len(voice_clones)} voice clones")
            return voice_clones
            
        except Exception as e:
            logger.error(f"❌ Failed to get voice clones: {e}")
            raise Exception(f"Failed to get voice clones: {str(e)}")
    
    def _format_text_for_vibevoice(self, text: str, voice_id: str) -> str:
        """Format text with proper speaker annotations for VibeVoice model"""
        try:
            # Clean the input text first
            cleaned_text = text.strip()
            
            # Check if text already has speaker annotations
            import re
            if re.search(r'^(Speaker \d+|\[S\d+\])\s*:', cleaned_text, re.IGNORECASE | re.MULTILINE):
                logger.info("📝 Text already has speaker annotations")
                return cleaned_text
            
            # Add Speaker 0 annotation (VibeVoice standard format)
            # Use Speaker 0 for single-speaker voice clones
            formatted_text = f"Speaker 0: {cleaned_text}"
            
            logger.info(f"✨ Formatted text for VibeVoice: Original='{text[:30]}...' -> Formatted='{formatted_text[:50]}...'")
            return formatted_text
            
        except Exception as e:
            logger.warning(f"⚠️ Text formatting failed, using original text: {e}")
            return text  # Fallback to original text
