"""
Test script to manually trigger the voice-chat endpoint
"""
import requests
import io

def test_voice_chat():
    """Test the voice-chat endpoint with a simple audio file"""
    
    # Create a simple test audio file (silent WAV)
    import wave
    import numpy as np
    
    # Create 1 second of tone (simulating speech)
    duration = 1.0  # seconds
    sample_rate = 16000
    t = np.linspace(0, duration, int(duration * sample_rate))
    # Create a 440Hz tone (A note) to simulate speech
    frequency = 440
    audio_data = (np.sin(2 * np.pi * frequency * t) * 16383).astype(np.int16)
    
    # Create WAV file in memory
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data.tobytes())
    
    audio_buffer.seek(0)
    
    # Prepare the request
    files = {
        'audio': ('test.wav', audio_buffer, 'audio/wav')
    }
    
    data = {
        'voice': 'en-US-AvaNeural',
        'model': 'default',
        'language': 'auto'
    }
    
    try:
        print("🧪 Testing voice-chat endpoint...")
        response = requests.post(
            'http://localhost:8001/api/v1/voice-chat',
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Voice chat endpoint responding!")
            print(f"Response size: {len(response.content)} bytes")
            # Save response audio for testing
            with open('test_response.wav', 'wb') as f:
                f.write(response.content)
            print("🎵 Response audio saved as test_response.wav")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_voice_chat()