"""
Audio utilities for voice processing and validation
"""

import io
import logging
from typing import Optional, Tuple
from fastapi import UploadFile
import numpy as np
from pydub import AudioSegment

logger = logging.getLogger(__name__)

# Supported audio formats
SUPPORTED_FORMATS = {'.wav', '.mp3', '.flac', '.ogg', '.m4a', '.webm'}
MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB max file size


def validate_audio_file(file: UploadFile) -> bool:
    """Validate uploaded audio file with flexible content type checking"""
    try:
        # More flexible content type checking
        valid_content_types = {
            'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg', 
            'audio/webm', 'audio/mp4', 'audio/x-wav', 'audio/x-flac', 'audio/x-ms-wma',
            'application/octet-stream',  # Common fallback for binary files
            None  # Allow files without content type
        }
        
        if file.content_type and file.content_type not in valid_content_types:
            # Log but don't reject - try to validate by extension instead
            logger.info(f"Unknown content type '{file.content_type}', checking file extension...")
        
        # Check file extension (primary validation)
        has_valid_extension = False
        if file.filename:
            file_extension = '.' + file.filename.split('.')[-1].lower()
            if file_extension in SUPPORTED_FORMATS:
                has_valid_extension = True
                logger.info(f"Valid audio file extension: {file_extension}")
            else:
                logger.warning(f"Unsupported format: {file_extension}")
        
        # For browser recordings without proper filename/extension, be more lenient
        if not has_valid_extension:
            # If content type suggests audio, allow it
            if file.content_type and file.content_type.startswith('audio/'):
                logger.info(f"Allowing audio based on content type: {file.content_type}")
                has_valid_extension = True
            # If it's a generic binary file, allow it and let pydub handle it
            elif file.content_type == 'application/octet-stream' or not file.content_type:
                logger.info("Allowing binary/unknown file type - will validate with pydub")
                has_valid_extension = True
        
        if not has_valid_extension:
            logger.warning(f"Rejected file: filename='{file.filename}', content_type='{file.content_type}'")
            return False
        
        # Check file size (if available)
        if hasattr(file.file, 'seek') and hasattr(file.file, 'tell'):
            current_pos = file.file.tell()
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(current_pos)  # Return to original position
            
            if file_size > MAX_AUDIO_SIZE:
                logger.warning(f"File too large: {file_size} bytes")
                return False
            
            if file_size < 1000:  # Less than 1KB is suspicious
                logger.warning(f"File too small: {file_size} bytes")
                return False
        
        logger.info(f"Audio file validation passed: {file.filename} ({file.content_type})")
        return True
        
    except Exception as e:
        logger.error(f"Audio validation error: {e}")
        return False


def convert_audio_format(
    audio_data: bytes, 
    target_sample_rate: int = 16000,
    target_channels: int = 1
) -> Tuple[bytes, dict]:
    """Convert audio to standard format"""
    try:
        # Load audio from bytes
        audio = AudioSegment.from_file(io.BytesIO(audio_data))
        
        # Get original properties
        original_info = {
            'duration': len(audio) / 1000.0,  # Duration in seconds
            'sample_rate': audio.frame_rate,
            'channels': audio.channels,
            'sample_width': audio.sample_width
        }
        
        # Convert to target format
        audio = audio.set_frame_rate(target_sample_rate)
        audio = audio.set_channels(target_channels)
        
        # Export as WAV
        output_buffer = io.BytesIO()
        audio.export(output_buffer, format="wav")
        converted_data = output_buffer.getvalue()
        
        conversion_info = {
            'original': original_info,
            'converted': {
                'duration': len(audio) / 1000.0,
                'sample_rate': target_sample_rate,
                'channels': target_channels,
                'format': 'wav'
            }
        }
        
        return converted_data, conversion_info
        
    except Exception as e:
        logger.error(f"Audio conversion error: {e}")
        raise


def detect_voice_activity(audio_data: bytes, threshold: float = 0.01) -> dict:
    """Simple voice activity detection"""
    try:
        # Load audio
        audio = AudioSegment.from_file(io.BytesIO(audio_data))
        
        # Convert to numpy array
        samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
        if audio.channels > 1:
            samples = samples.reshape((-1, audio.channels))
            samples = samples.mean(axis=1)  # Convert to mono
        
        # Normalize
        if np.max(np.abs(samples)) > 0:
            samples = samples / np.max(np.abs(samples))
        
        # Calculate RMS energy in chunks
        chunk_size = audio.frame_rate // 10  # 100ms chunks
        chunks = [samples[i:i+chunk_size] for i in range(0, len(samples), chunk_size)]
        
        voice_chunks = 0
        total_chunks = len(chunks)
        
        for chunk in chunks:
            if len(chunk) > 0:
                rms = np.sqrt(np.mean(chunk**2))
                if rms > threshold:
                    voice_chunks += 1
        
        voice_percentage = voice_chunks / total_chunks if total_chunks > 0 else 0
        
        return {
            'has_voice': voice_percentage > 0.1,  # At least 10% voice activity
            'voice_percentage': voice_percentage,
            'duration': len(audio) / 1000.0,
            'chunks_analyzed': total_chunks
        }
        
    except Exception as e:
        logger.error(f"Voice activity detection error: {e}")
        return {
            'has_voice': True,  # Default to assume voice is present
            'voice_percentage': 0.5,
            'duration': 0,
            'chunks_analyzed': 0
        }


def trim_silence(audio_data: bytes, silence_thresh: int = -40) -> bytes:
    """Trim silence from beginning and end of audio"""
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_data))
        
        # Trim silence
        trimmed = audio.strip_silence(silence_thresh=silence_thresh, chunk_len=100)
        
        # Export trimmed audio
        output_buffer = io.BytesIO()
        trimmed.export(output_buffer, format="wav")
        
        return output_buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Silence trimming error: {e}")
        return audio_data  # Return original if trimming fails


def get_audio_info(audio_data: bytes) -> dict:
    """Get detailed audio file information"""
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_data))
        
        return {
            'duration': len(audio) / 1000.0,  # seconds
            'sample_rate': audio.frame_rate,
            'channels': audio.channels,
            'sample_width': audio.sample_width,
            'frame_count': audio.frame_count(),
            'max_possible_amplitude': audio.max_possible_amplitude,
            'size_bytes': len(audio_data)
        }
        
    except Exception as e:
        logger.error(f"Audio info extraction error: {e}")
        return {
            'duration': 0,
            'sample_rate': 0,
            'channels': 0,
            'sample_width': 0,
            'frame_count': 0,
            'max_possible_amplitude': 0,
            'size_bytes': len(audio_data)
        }