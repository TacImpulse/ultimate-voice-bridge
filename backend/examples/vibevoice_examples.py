"""
VibeVoice Integration Examples
Demonstrating how to use the new VibeVoice TTS capabilities
"""

import asyncio
import json
import requests
from pathlib import Path

BASE_URL = "http://localhost:8000"

# Example 1: Basic VibeVoice TTS
def example_basic_vibevoice_tts():
    """Basic text-to-speech using VibeVoice"""
    
    data = {
        "text": "Hello! This is a demonstration of VibeVoice text-to-speech. The quality is remarkably natural and expressive.",
        "voice": "vibevoice_vibevoice-alice",
        "speed": 1.0,
        "pitch": 1.0
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/tts", json=data)
    
    if response.status_code == 200:
        # Save the audio
        with open("vibevoice_basic_example.wav", "wb") as f:
            f.write(response.content)
        print("✅ Basic VibeVoice TTS generated: vibevoice_basic_example.wav")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")


# Example 2: Multi-speaker Conversation
def example_vibevoice_conversation():
    """Create a multi-speaker conversation using VibeVoice"""
    
    conversation_script = """
    Speaker 1: Welcome to our podcast about artificial intelligence. I'm really excited to dive into this topic today.
    Speaker 2: Thank you for having me! AI is such a fascinating field, and there's so much happening right now.
    Speaker 1: Absolutely. So let's start with the basics. How would you explain what AI is to someone who's completely new to the concept?
    Speaker 2: That's a great question. At its core, artificial intelligence is about creating systems that can perform tasks that typically require human intelligence.
    Speaker 1: That makes sense. And we're seeing AI applications everywhere these days, from voice assistants to recommendation systems.
    Speaker 2: Exactly! The applications are endless, and we're just scratching the surface of what's possible.
    """
    
    data = {
        "script": conversation_script,
        "speaker_voices": {
            "Speaker 1": "vibevoice_vibevoice-alice",
            "Speaker 2": "vibevoice_vibevoice-andrew"
        },
        "output_format": "wav"
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/vibevoice-conversation", json=data)
    
    if response.status_code == 200:
        # Save the conversation audio
        with open("vibevoice_conversation_example.wav", "wb") as f:
            f.write(response.content)
        print("✅ VibeVoice conversation generated: vibevoice_conversation_example.wav")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")


# Example 3: Get Available VibeVoice Voices
def example_get_vibevoice_voices():
    """Get list of available VibeVoice voices"""
    
    response = requests.get(f"{BASE_URL}/api/v1/vibevoice-voices")
    
    if response.status_code == 200:
        voices_data = response.json()
        print("✅ Available VibeVoice voices:")
        print(json.dumps(voices_data, indent=2))
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")


# Example 4: Voice-to-LLM with VibeVoice Response
def example_voice_to_llm_with_vibevoice(audio_file_path: str):
    """Complete voice pipeline with VibeVoice TTS response"""
    
    if not Path(audio_file_path).exists():
        print(f"❌ Audio file not found: {audio_file_path}")
        return
    
    with open(audio_file_path, "rb") as audio_file:
        files = {"audio": audio_file}
        data = {
            "model": "default",
            "language": "auto",
            "temperature": 0.7,
            "max_tokens": 200
        }
        
        # Get LLM response
        response = requests.post(f"{BASE_URL}/api/v1/voice-to-llm", files=files, data=data)
        
        if response.status_code == 200:
            result = response.json()
            llm_text = result["llm_response"]["text"]
            print(f"📝 Transcript: {result['transcript']['text']}")
            print(f"🤖 LLM Response: {llm_text}")
            
            # Now convert LLM response to VibeVoice speech
            tts_data = {
                "text": llm_text,
                "voice": "vibevoice_vibevoice-alice",
                "speed": 1.0
            }
            
            tts_response = requests.post(f"{BASE_URL}/api/v1/tts", json=tts_data)
            
            if tts_response.status_code == 200:
                with open("vibevoice_llm_response.wav", "wb") as f:
                    f.write(tts_response.content)
                print("✅ VibeVoice LLM response generated: vibevoice_llm_response.wav")
            else:
                print(f"❌ TTS Error: {tts_response.status_code}")
        else:
            print(f"❌ Voice-to-LLM Error: {response.status_code} - {response.text}")


# Example 5: Long-form Content Generation
def example_long_form_content():
    """Generate long-form audio content using VibeVoice"""
    
    long_text = """
    Welcome to this comprehensive guide about the future of artificial intelligence. 
    In today's episode, we'll explore how AI is transforming various industries and what this means for society.
    
    First, let's talk about healthcare. AI is revolutionizing medical diagnosis, drug discovery, and personalized treatment plans.
    Machine learning algorithms can analyze medical images with incredible accuracy, sometimes surpassing human specialists.
    
    In the field of education, AI-powered tutoring systems are providing personalized learning experiences.
    These systems can adapt to each student's pace and learning style, making education more effective and accessible.
    
    Transportation is another area where we see significant AI impact. Autonomous vehicles are becoming more sophisticated,
    promising to reduce accidents and improve traffic efficiency. The technology is advancing rapidly, with major companies
    investing billions in research and development.
    
    However, with these advances come important ethical considerations. We must ensure that AI systems are fair, 
    transparent, and beneficial for all members of society. This requires ongoing collaboration between technologists,
    policymakers, and ethicists.
    
    Thank you for listening to this overview of AI's impact on our world. The future is exciting, and we're just
    getting started on this incredible journey of technological advancement.
    """
    
    data = {
        "text": long_text.strip(),
        "voice": "vibevoice_vibevoice-alice",
        "speed": 0.9,  # Slightly slower for long-form content
        "emotion": "friendly"
    }
    
    print("🎙️ Generating long-form content with VibeVoice...")
    response = requests.post(f"{BASE_URL}/api/v1/tts", json=data, timeout=120)  # Longer timeout for long content
    
    if response.status_code == 200:
        with open("vibevoice_long_form_example.wav", "wb") as f:
            f.write(response.content)
        print("✅ Long-form VibeVoice content generated: vibevoice_long_form_example.wav")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")


# Example 6: Health Check and Service Status
def example_health_check():
    """Check service health and VibeVoice availability"""
    
    response = requests.get(f"{BASE_URL}/health")
    
    if response.status_code == 200:
        health_data = response.json()
        print("✅ Service Health Check:")
        print(json.dumps(health_data, indent=2))
        
        if health_data.get("services", {}).get("tts") == "healthy":
            print("🎙️ TTS service (including VibeVoice) is healthy")
        else:
            print("⚠️ TTS service may have issues")
    else:
        print(f"❌ Health check failed: {response.status_code}")


if __name__ == "__main__":
    print("🎙️ VibeVoice Integration Examples")
    print("================================")
    
    # Run examples
    print("\n1. Health Check:")
    example_health_check()
    
    print("\n2. Get Available VibeVoice Voices:")
    example_get_vibevoice_voices()
    
    print("\n3. Basic VibeVoice TTS:")
    example_basic_vibevoice_tts()
    
    print("\n4. Multi-speaker Conversation:")
    example_vibevoice_conversation()
    
    print("\n5. Long-form Content:")
    example_long_form_content()
    
    print("\n6. Voice-to-LLM with VibeVoice (requires audio file):")
    print("   To test this, provide an audio file path:")
    print("   example_voice_to_llm_with_vibevoice('path/to/your/audio.wav')")
    
    print("\n✅ All examples completed!")
    print("\nGenerated files:")
    print("- vibevoice_basic_example.wav")
    print("- vibevoice_conversation_example.wav") 
    print("- vibevoice_long_form_example.wav")
    print("- vibevoice_llm_response.wav (if audio file provided)")