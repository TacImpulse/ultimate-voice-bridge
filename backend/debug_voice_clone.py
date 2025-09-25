import asyncio
import sys
import os
import json
from pathlib import Path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.vibevoice_service import VibeVoiceService

async def debug_voice_clone():
    print("🔍 Voice Clone Diagnostic Script")
    print("=" * 60)
    
    try:
        vibevoice = VibeVoiceService()
        await vibevoice.initialize()
        
        print("\n📋 Available Voice Configurations:")
        for voice_id, config in vibevoice.voice_configs.items():
            print(f"  - {voice_id}:")
            print(f"    Name: {config.name}")
            print(f"    Engine: {config.engine.value}")
            print(f"    Model Path: {config.model_path}")
            print(f"    Voice Sample: {config.voice_sample}")
            if config.voice_sample:
                sample_exists = Path(config.voice_sample).exists() if config.voice_sample else False
                print(f"    Sample Exists: {'✅' if sample_exists else '❌'}")
                if sample_exists:
                    sample_size = Path(config.voice_sample).stat().st_size
                    print(f"    Sample Size: {sample_size:,} bytes")
            print()
        
        print("\n🎤 Voice Clone Metadata Check:")
        voice_clones = [v for v in vibevoice.voice_configs.keys() if v.startswith('voice_clone_')]
        
        if not voice_clones:
            print("❌ No voice clones found!")
            return
            
        for voice_id in voice_clones:
            print(f"\n🔍 Checking voice clone: {voice_id}")
            
            # Check metadata file
            metadata_path = vibevoice.temp_dir / f"{voice_id}_metadata.json"
            if metadata_path.exists():
                print(f"✅ Metadata file exists: {metadata_path}")
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                print(f"   Name: {metadata.get('name', 'Unknown')}")
                print(f"   Description: {metadata.get('description', 'None')}")
                print(f"   Created: {metadata.get('created_at', 'Unknown')}")
                print(f"   Audio Duration: {metadata.get('audio_duration', 'Unknown')}s")
                print(f"   Transcript: {metadata.get('transcript', 'None')[:100]}...")
            else:
                print(f"❌ Metadata file missing: {metadata_path}")
            
            # Check voice sample file
            config = vibevoice.voice_configs[voice_id]
            if config.voice_sample:
                sample_path = Path(config.voice_sample)
                if sample_path.exists():
                    print(f"✅ Voice sample exists: {sample_path}")
                    print(f"   Size: {sample_path.stat().st_size:,} bytes")
                    
                    # Try to read audio info
                    try:
                        import soundfile as sf
                        info = sf.info(str(sample_path))
                        print(f"   Audio Info: {info.samplerate}Hz, {info.channels} channels, {info.duration:.2f}s")
                    except Exception as e:
                        print(f"   Audio Info Error: {e}")
                else:
                    print(f"❌ Voice sample missing: {sample_path}")
            else:
                print("❌ No voice sample path configured")
        
        print("\n🧪 Testing Voice Clone Generation:")
        
        # Test the first voice clone
        if voice_clones:
            test_voice_id = voice_clones[0]
            config = vibevoice.voice_configs[test_voice_id]
            
            print(f"\n🎤 Testing voice clone: {test_voice_id}")
            print(f"   Name: {config.name}")
            print(f"   Voice Sample: {config.voice_sample}")
            
            test_text = "Speaker 1: Hello, this is a test of my custom voice clone."
            
            print(f"   Test Text: '{test_text}'")
            print(f"   Model Path: {config.model_path}")
            print(f"   Engine: {config.engine.value}")
            
            try:
                # Test with detailed logging
                audio_data = await vibevoice.test_voice_clone(test_voice_id, test_text)
                print(f"✅ Voice clone test successful: {len(audio_data):,} bytes generated")
                
                # Save test output
                test_file = f"voice_clone_debug_{test_voice_id}.wav"
                with open(test_file, 'wb') as f:
                    f.write(audio_data)
                print(f"🎧 Test audio saved to: {test_file}")
                
            except Exception as e:
                print(f"❌ Voice clone test failed: {e}")
                import traceback
                traceback.print_exc()
        
        print("\n🔧 VibeVoice Model Status:")
        print(f"   Device: {vibevoice.device}")
        print(f"   Available Engines: {vibevoice.available_engines}")
        print(f"   Large Model Available: {vibevoice._large_model_available()}")
        if vibevoice._large_model_available():
            print(f"   Large Model Path: {vibevoice._get_large_model_path()}")
        
        print("\n💡 Voice Cloning Analysis:")
        print("   1. Check if voice sample files exist and are valid audio")
        print("   2. Verify the VibeVoice model is using the correct voice sample")
        print("   3. Ensure the voice clone was created with sufficient training data")
        print("   4. Wait for VibeVoice-Large model to finish loading for better results")
        
    except Exception as e:
        print(f"❌ Debug script failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        try:
            await vibevoice.cleanup()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(debug_voice_clone())