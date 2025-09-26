"""
Voice Sample Generator
Generates authentic voice samples from different TTS engines for the voice library.
"""

import os
import asyncio
import hashlib
from pathlib import Path
from typing import Dict, Optional, List
import aiofiles
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceSampleGenerator:
    def __init__(self, samples_dir: str = "voice_samples"):
        self.samples_dir = Path(samples_dir)
        self.samples_dir.mkdir(exist_ok=True)
        
        # Create subdirectories for different sources
        self.source_dirs = {
            'microsoft': self.samples_dir / 'microsoft',
            'google': self.samples_dir / 'google', 
            'openvoice': self.samples_dir / 'openvoice',
            'coqui': self.samples_dir / 'coqui',
            'elevenlabs': self.samples_dir / 'elevenlabs',
            'system': self.samples_dir / 'system'
        }
        
        for source_dir in self.source_dirs.values():
            source_dir.mkdir(exist_ok=True)
    
    def get_sample_filename(self, voice_id: str, text: str) -> str:
        """Generate a consistent filename for voice samples"""
        text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
        return f"{voice_id}_{text_hash}.wav"
    
    def get_sample_path(self, voice_id: str, source: str, text: str) -> Path:
        """Get the full path for a voice sample file"""
        filename = self.get_sample_filename(voice_id, text)
        source_dir = self.source_dirs.get(source.lower(), self.samples_dir)
        return source_dir / filename
    
    async def generate_microsoft_sample(self, voice_name: str, text: str, voice_id: str) -> Optional[bytes]:
        """Generate voice sample using Microsoft Azure TTS"""
        try:
            import azure.cognitiveservices.speech as speechsdk
            
            # You'll need to set these environment variables or configure them
            speech_key = os.getenv("AZURE_SPEECH_KEY")
            service_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
            
            if not speech_key:
                logger.warning("Azure Speech Key not configured, skipping Microsoft TTS")
                return None
            
            # Configure speech config
            speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
            speech_config.speech_synthesis_voice_name = voice_name
            speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm)
            
            # Create synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
            
            # Generate speech
            result = synthesizer.speak_text_async(text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                logger.info(f"Generated Microsoft sample for {voice_id}")
                return result.audio_data
            else:
                logger.error(f"Microsoft TTS failed: {result.reason}")
                return None
                
        except ImportError:
            logger.warning("Azure Speech SDK not installed. Install with: pip install azure-cognitiveservices-speech")
            return None
        except Exception as e:
            logger.error(f"Microsoft TTS error: {e}")
            return None
    
    async def generate_google_sample(self, voice_name: str, text: str, voice_id: str) -> Optional[bytes]:
        """Generate voice sample using Google Cloud TTS"""
        try:
            from google.cloud import texttospeech
            
            # Initialize client (requires GOOGLE_APPLICATION_CREDENTIALS env var)
            client = texttospeech.TextToSpeechClient()
            
            # Set input text
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Build voice request
            voice = texttospeech.VoiceSelectionParams(
                name=voice_name,
                language_code="en-US"  # This should be dynamic based on voice
            )
            
            # Select audio file type
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.LINEAR16,
                sample_rate_hertz=24000
            )
            
            # Perform the text-to-speech request
            response = client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            
            logger.info(f"Generated Google sample for {voice_id}")
            return response.audio_content
            
        except ImportError:
            logger.warning("Google Cloud TTS SDK not installed. Install with: pip install google-cloud-texttospeech")
            return None
        except Exception as e:
            logger.error(f"Google TTS error: {e}")
            return None
    
    async def generate_system_tts_sample(self, voice_name: str, text: str, voice_id: str) -> Optional[bytes]:
        """Generate voice sample using system TTS (Windows SAPI, macOS say, Linux espeak)"""
        try:
            import tempfile
            import subprocess
            import platform
            
            system = platform.system().lower()
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            try:
                if system == 'windows':
                    # Use Windows SAPI via PowerShell
                    ps_script = f'''
                    Add-Type -AssemblyName System.Speech
                    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
                    $synth.SelectVoice("{voice_name}")
                    $synth.SetOutputToWaveFile("{tmp_path}")
                    $synth.Speak("{text}")
                    $synth.Dispose()
                    '''
                    
                    subprocess.run([
                        'powershell', '-Command', ps_script
                    ], check=True, capture_output=True)
                    
                elif system == 'darwin':  # macOS
                    subprocess.run([
                        'say', '-v', voice_name, '-o', tmp_path, '--data-format=LEF32@22050', text
                    ], check=True)
                    
                elif system == 'linux':
                    # Use espeak or festival
                    subprocess.run([
                        'espeak', '-v', voice_name, '-w', tmp_path, text
                    ], check=True)
                
                # Read the generated audio file
                if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                    async with aiofiles.open(tmp_path, 'rb') as f:
                        audio_data = await f.read()
                    logger.info(f"Generated system TTS sample for {voice_id}")
                    return audio_data
                else:
                    logger.error(f"System TTS failed to generate audio for {voice_id}")
                    return None
                    
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                    
        except Exception as e:
            logger.error(f"System TTS error: {e}")
            return None
    
    async def generate_coqui_sample(self, model_path: str, text: str, voice_id: str) -> Optional[bytes]:
        """Generate voice sample using Coqui TTS"""
        try:
            from TTS.api import TTS
            import tempfile
            import torch
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            try:
                # Initialize Coqui TTS
                tts = TTS(model_path)
                
                # Generate audio
                tts.tts_to_file(text=text, file_path=tmp_path)
                
                # Read the generated audio file
                if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                    async with aiofiles.open(tmp_path, 'rb') as f:
                        audio_data = await f.read()
                    logger.info(f"Generated Coqui sample for {voice_id}")
                    return audio_data
                else:
                    return None
                    
            finally:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                    
        except ImportError:
            logger.warning("Coqui TTS not installed. Install with: pip install TTS")
            return None
        except Exception as e:
            logger.error(f"Coqui TTS error: {e}")
            return None
    
    async def get_or_generate_sample(self, voice_config: Dict) -> Optional[str]:
        """Get existing sample or generate new one for a voice"""
        voice_id = voice_config['id']
        source = voice_config['source'].lower()
        text = voice_config.get('sample_text', 
            f"Hello! This is {voice_config['name']}, demonstrating the quality and characteristics of this voice.")
        
        # Check if sample already exists
        sample_path = self.get_sample_path(voice_id, source, text)
        if sample_path.exists():
            logger.info(f"Using existing sample for {voice_id}")
            return str(sample_path)
        
        # Generate new sample based on source
        audio_data = None
        
        try:
            if source == 'microsoft':
                ms_voice_name = voice_config.get('ms_voice_name', 'en-US-AriaNeural')
                audio_data = await self.generate_microsoft_sample(ms_voice_name, text, voice_id)
                
            elif source == 'google':
                google_voice_name = voice_config.get('google_voice_name', 'en-US-Standard-A')
                audio_data = await self.generate_google_sample(google_voice_name, text, voice_id)
                
            elif source == 'system':
                system_voice_name = voice_config.get('system_voice_name', 'Microsoft Aria Online')
                audio_data = await self.generate_system_tts_sample(system_voice_name, text, voice_id)
                
            elif source == 'coqui-tts':
                model_path = voice_config.get('model_path', 'tts_models/en/ljspeech/tacotron2-DDC')
                audio_data = await self.generate_coqui_sample(model_path, text, voice_id)
            
            # Save the generated audio data
            if audio_data:
                async with aiofiles.open(sample_path, 'wb') as f:
                    await f.write(audio_data)
                logger.info(f"Saved new sample for {voice_id} at {sample_path}")
                return str(sample_path)
            else:
                logger.warning(f"Failed to generate sample for {voice_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error generating sample for {voice_id}: {e}")
            return None
    
    async def generate_library_samples(self, voice_library: List[Dict]) -> Dict[str, str]:
        """Generate samples for all voices in the library"""
        results = {}
        
        logger.info(f"Generating samples for {len(voice_library)} voices")
        
        # Generate samples concurrently (but limit concurrency to avoid resource issues)
        semaphore = asyncio.Semaphore(3)  # Max 3 concurrent generations
        
        async def generate_with_semaphore(voice_config):
            async with semaphore:
                return await self.get_or_generate_sample(voice_config)
        
        tasks = [generate_with_semaphore(voice) for voice in voice_library]
        sample_paths = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, (voice, sample_path) in enumerate(zip(voice_library, sample_paths)):
            if isinstance(sample_path, Exception):
                logger.error(f"Failed to generate sample for {voice['id']}: {sample_path}")
                results[voice['id']] = None
            else:
                results[voice['id']] = sample_path
        
        logger.info(f"Generated {len([p for p in results.values() if p])} samples successfully")
        return results
    
    def get_sample_url(self, voice_id: str, base_url: str = "http://localhost:8001") -> Optional[str]:
        """Get the URL to access a voice sample"""
        # Find the sample file for this voice
        for source_dir in self.source_dirs.values():
            for sample_file in source_dir.glob(f"{voice_id}_*.wav"):
                relative_path = sample_file.relative_to(self.samples_dir)
                return f"{base_url}/api/v1/voice-samples/{relative_path.as_posix()}"
        return None

# Global instance
voice_sample_generator = VoiceSampleGenerator()