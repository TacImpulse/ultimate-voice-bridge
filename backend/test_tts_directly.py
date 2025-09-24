import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.tts_service import TTSService

async def test_tts():
    tts = TTSService()
    await tts.initialize()
    
    test_text = "Hi there! I'm doing really well, thanks for asking—hope your day is going nice and smoothly too!"
    
    print("🧪 Testing TTS generation...")
    print("=" * 50)
    print(f"📝 Input text: '{test_text}'")
    print("=" * 50)
    
    try:
        audio_data = await tts.generate_speech(
            text=test_text,
            voice="en-US-AvaNeural"
        )
        
        print(f"🎵 TTS generated {len(audio_data)} bytes of audio")
        
        # Save to file so you can listen to it
        with open("test_tts_output.wav", "wb") as f:
            f.write(audio_data)
        
        print("🎧 Saved audio to test_tts_output.wav - play this file to hear what TTS generated!")
        
    except Exception as e:
        print(f"❌ TTS Error: {e}")
    
    await tts.cleanup()

if __name__ == "__main__":
    asyncio.run(test_tts())