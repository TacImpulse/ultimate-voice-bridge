#!/usr/bin/env python3
"""
Generate Demo Voice Samples
Creates sample audio files for the voice library using available TTS engines
"""

import asyncio
import logging
from voice_sample_generator import voice_sample_generator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Demo voice configurations
demo_voices = [
    {
        'id': 'microsoft_aria',
        'name': 'Aria (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Aria, a conversational voice from Microsoft with natural intonation and friendly tone.',
        'ms_voice_name': 'en-US-AriaNeural',
        'system_voice_name': 'Microsoft Aria Online (Natural) - English (United States)'
    },
    {
        'id': 'microsoft_guy',
        'name': 'Guy (Microsoft)',
        'source': 'Microsoft', 
        'sample_text': 'Hello! This is Guy, a casual male voice from Microsoft with natural speech patterns and modern appeal.',
        'ms_voice_name': 'en-US-GuyNeural',
        'system_voice_name': 'Microsoft Guy Online (Natural) - English (United States)'
    },
    {
        'id': 'webspeech_samantha',
        'name': 'Samantha (System)',
        'source': 'System',
        'sample_text': 'Hello! This is Samantha, a built-in system voice with clear pronunciation, available on most devices.',
        'system_voice_name': 'Samantha'
    },
    {
        'id': 'webspeech_alex',
        'name': 'Alex (System)',
        'source': 'System',
        'sample_text': 'Hello! This is Alex, a built-in male system voice with natural tone, widely available for testing.',
        'system_voice_name': 'Alex'
    },
]

async def generate_demo_samples():
    """Generate demo voice samples"""
    logger.info("🎤 Generating demo voice samples...")
    
    try:
        # Generate samples for demo voices
        results = await voice_sample_generator.generate_library_samples(demo_voices)
        
        # Report results
        successful = len([p for p in results.values() if p])
        total = len(demo_voices)
        
        logger.info(f"✅ Generated {successful}/{total} demo voice samples")
        
        # List generated samples
        for voice_id, sample_path in results.items():
            voice_name = next((v['name'] for v in demo_voices if v['id'] == voice_id), voice_id)
            if sample_path:
                sample_url = voice_sample_generator.get_sample_url(voice_id)
                logger.info(f"   ✅ {voice_name}: {sample_url}")
            else:
                logger.warning(f"   ❌ {voice_name}: Failed to generate")
        
        if successful > 0:
            logger.info("🎉 Demo samples ready! You can now test voices in the frontend.")
            logger.info("🌐 Start the backend server to serve samples at: http://localhost:8001/api/v1/voice-samples/")
        else:
            logger.warning("⚠️  No samples were generated. Check TTS engine availability.")
            
    except Exception as e:
        logger.error(f"❌ Error generating demo samples: {e}")

def test_voice_sample_access():
    """Test voice sample URL generation"""
    logger.info("🔍 Testing voice sample access...")
    
    for voice in demo_voices:
        voice_id = voice['id'] 
        sample_url = voice_sample_generator.get_sample_url(voice_id)
        if sample_url:
            logger.info(f"   🔗 {voice['name']}: {sample_url}")
        else:
            logger.info(f"   ❌ {voice['name']}: No sample found")

if __name__ == "__main__":
    print("🎙️ Ultimate Voice Bridge - Demo Sample Generator")
    print("=" * 50)
    
    # Test sample access first
    test_voice_sample_access()
    print()
    
    # Generate demo samples
    asyncio.run(generate_demo_samples())
    
    print("\n🚀 Next steps:")
    print("1. Start the backend: python backend/main.py")
    print("2. Start the frontend: npm run dev")
    print("3. Go to Voice Clone Studio > Explore Voices tab")
    print("4. Click 'Test Voice' on any voice to hear authentic samples!")