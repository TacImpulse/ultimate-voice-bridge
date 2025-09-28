#!/usr/bin/env python3
"""
Test script to create a sample voice clone and verify the process works
"""

import sys
import os
import asyncio
from pathlib import Path
import tempfile
import json

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from services.vibevoice_service import VibeVoiceService

async def main():
    print("🧪 Testing Voice Clone Creation Process")
    print("=" * 50)
    
    try:
        # Initialize service
        print("📚 Initializing VibeVoice service...")
        service = VibeVoiceService()
        await service.initialize()
        
        # Create a sample audio file (just a tiny silent WAV for testing)
        print("🎵 Creating sample audio data...")
        
        # Generate a minimal WAV file with silence (for testing only)
        import struct
        
        # WAV header for 1 second of silence at 24kHz, 16-bit mono
        sample_rate = 24000
        duration = 1  # 1 second
        num_samples = sample_rate * duration
        
        # WAV header
        wav_data = b'RIFF'
        wav_data += struct.pack('<I', 36 + num_samples * 2)  # File size
        wav_data += b'WAVE'
        wav_data += b'fmt '
        wav_data += struct.pack('<I', 16)  # Subchunk size
        wav_data += struct.pack('<H', 1)   # Audio format (PCM)
        wav_data += struct.pack('<H', 1)   # Number of channels
        wav_data += struct.pack('<I', sample_rate)  # Sample rate
        wav_data += struct.pack('<I', sample_rate * 2)  # Byte rate
        wav_data += struct.pack('<H', 2)   # Block align
        wav_data += struct.pack('<H', 16)  # Bits per sample
        wav_data += b'data'
        wav_data += struct.pack('<I', num_samples * 2)  # Data size
        
        # Add silence (zeros)
        wav_data += b'\\x00\\x00' * num_samples
        
        print(f"✅ Generated {len(wav_data)} bytes of test audio")
        
        # Test voice clone creation
        print("🎤 Creating test voice clone...")
        try:
            result = await service.create_voice_clone(
                name="Test Voice Clone",
                transcript="Hello, this is a test voice clone speaking.",
                audio_data=wav_data,
                description="Test voice clone for debugging"
            )
            
            print(f"✅ Voice clone created successfully!")
            print(f"  - Voice ID: {result['voice_id']}")
            print(f"  - Name: {result['name']}")
            print(f"  - Processing time: {result['processing_time']:.2f}s")
            
            # Check if it's now in voice configs
            voice_id = result['voice_id']
            if voice_id in service.voice_configs:
                print(f"✅ Voice clone found in voice_configs")
                config = service.voice_configs[voice_id]
                print(f"  - Config name: {config.name}")
                print(f"  - Voice sample path: {config.voice_sample}")
                
                # Check if files exist
                if config.voice_sample and Path(config.voice_sample).exists():
                    print(f"  ✅ Voice sample file exists: {Path(config.voice_sample).stat().st_size} bytes")
                else:
                    print(f"  ❌ Voice sample file missing")
                
                # Check metadata
                metadata_path = service.temp_dir / f"{voice_id}_metadata.json"
                if metadata_path.exists():
                    print(f"  ✅ Metadata file exists")
                else:
                    print(f"  ❌ Metadata file missing")
            else:
                print(f"❌ Voice clone not found in voice_configs after creation")
            
            # Test the voice clone
            print("🧪 Testing the created voice clone...")
            try:
                test_text = "Hello, this is a test of my voice clone."
                audio_data = await service.test_voice_clone(voice_id, test_text)
                print(f"✅ Voice clone test successful: {len(audio_data)} bytes of audio generated")
            except Exception as test_error:
                print(f"❌ Voice clone test failed: {test_error}")
            
            # List all voice clones
            print("📋 Listing all voice clones after creation...")
            voice_clones = await service.get_voice_clones()
            print(f"Found {len(voice_clones)} voice clones:")
            for clone in voice_clones:
                print(f"  - {clone['voice_id']}: {clone['name']}")
                
        except Exception as creation_error:
            print(f"❌ Voice clone creation failed: {creation_error}")
            import traceback
            traceback.print_exc()
        
        print(f"\\n✨ Test complete!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())