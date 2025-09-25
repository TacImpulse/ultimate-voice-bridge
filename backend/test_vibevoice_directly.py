import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.vibevoice_service import VibeVoiceService

async def test_vibevoice():
    print("🎙️ Testing VibeVoice directly...")
    print("=" * 60)
    
    try:
        vibevoice = VibeVoiceService()
        await vibevoice.initialize()
        
        test_text = "Speaker 1: Hello! This is a test of VibeVoice voice cloning technology."
        
        print(f"📝 Input text: '{test_text}'")
        print("=" * 60)
        
        # Test with Alice voice
        print("🎤 Testing with Alice voice...")
        audio_data = await vibevoice.generate_speech(
            text=test_text,
            voice="vibevoice-alice",
            output_format="wav"
        )
        
        print(f"✅ VibeVoice generated {len(audio_data)} bytes of audio")
        
        # Save audio
        with open("test_vibevoice_output.wav", "wb") as f:
            f.write(audio_data)
        
        print("🎧 Saved audio to test_vibevoice_output.wav")
        
        # List available voices
        voices = await vibevoice.get_available_voices()
        print(f"\n📋 Available voices: {len(voices)}")
        for voice_id, voice_info in voices.items():
            print(f"  - {voice_id}: {voice_info['name']} ({voice_info.get('description', 'No description')})")
        
    except Exception as e:
        print(f"❌ VibeVoice Error: {e}")
        import traceback
        print("Full traceback:")
        traceback.print_exc()
    
    finally:
        try:
            await vibevoice.cleanup()
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_vibevoice())