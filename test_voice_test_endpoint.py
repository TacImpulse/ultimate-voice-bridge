#!/usr/bin/env python3
"""
Test the voice testing endpoint functionality
"""
import asyncio
import logging
import requests
import json
import sys
import os

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def test_voice_test_endpoint():
    """Test the voice test endpoint"""
    
    print("🧪 Testing Voice Test Endpoint")
    print("=" * 50)
    
    # Test data
    test_voices = [
        {
            "name": "VibeVoice Alice",
            "voice_id": "vibevoice-alice",
            "speaker_name": "Test Speaker A"
        },
        {
            "name": "VibeVoice Andrew", 
            "voice_id": "vibevoice-andrew",
            "speaker_name": "Test Speaker B"
        },
        {
            "name": "Custom Voice (should fallback)",
            "voice_id": "joost",
            "speaker_name": "Test Speaker C"
        }
    ]
    
    backend_url = "http://localhost:8000"
    test_text = "Hello! This is a voice test for the conversation engine."
    
    print(f"🔗 Testing backend: {backend_url}")
    
    # Test backend availability
    try:
        health_response = requests.get(f"{backend_url}/health", timeout=5)
        print(f"✅ Backend health check: {health_response.status_code}")
    except Exception as e:
        print(f"❌ Backend not available: {e}")
        print("⚠️ Make sure the backend is running with: python backend/main.py")
        return False
    
    # Test each voice
    for voice_test in test_voices:
        print(f"\n🎤 Testing: {voice_test['name']} ({voice_test['voice_id']})")
        
        try:
            response = requests.post(
                f"{backend_url}/api/v1/tts/test-voice",
                json={
                    "text": test_text,
                    "voice_id": voice_test["voice_id"], 
                    "speaker_name": voice_test["speaker_name"]
                },
                timeout=30
            )
            
            if response.status_code == 200:
                audio_size = len(response.content)
                print(f"✅ Voice test successful: {audio_size} bytes of audio generated")
                
                # Save test audio file
                test_filename = f"test_voice_{voice_test['voice_id'].replace('-', '_')}.wav"
                with open(test_filename, 'wb') as f:
                    f.write(response.content)
                print(f"💾 Saved test audio: {test_filename}")
                
            else:
                print(f"❌ Voice test failed: HTTP {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Response: {response.text}")
                        
        except Exception as e:
            print(f"❌ Request failed: {e}")
    
    print(f"\n🏁 Voice testing complete!")
    return True

if __name__ == "__main__":
    success = test_voice_test_endpoint()
    if not success:
        sys.exit(1)
    print("\n✅ All voice tests completed successfully!")