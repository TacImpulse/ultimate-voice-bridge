#!/usr/bin/env python3
"""
Expand Voice Library
Automatically generates voice samples for all available TTS engines
"""

import asyncio
import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from voice_sample_generator import voice_sample_generator

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Expanded voice configurations for all available engines
voice_expansions = [
    # ====== SYSTEM TTS VOICES (Always Available) ======
    {
        'id': 'webspeech_samantha',
        'name': 'Samantha (System)',
        'source': 'System',
        'sample_text': 'Hello! This is Samantha, a built-in system voice with clear pronunciation, available on most devices for immediate testing.',
        'system_voice_name': 'Samantha'
    },
    {
        'id': 'webspeech_alex',
        'name': 'Alex (System)',
        'source': 'System',
        'sample_text': 'Hello! This is Alex, a built-in male system voice with natural tone, widely available for testing and applications.',
        'system_voice_name': 'Alex'
    },
    {
        'id': 'system_zira',
        'name': 'Zira (Windows)',
        'source': 'System',
        'sample_text': 'Hello! This is Zira, a Windows system voice with clear female pronunciation and professional tone.',
        'system_voice_name': 'Microsoft Zira Desktop'
    },
    {
        'id': 'system_david',
        'name': 'David (Windows)',
        'source': 'System',
        'sample_text': 'Hello! This is David, a Windows system voice with clear male pronunciation and authoritative tone.',
        'system_voice_name': 'Microsoft David Desktop'
    },
    {
        'id': 'system_hazel',
        'name': 'Hazel (Windows)',
        'source': 'System',
        'sample_text': 'Hello! This is Hazel, a Windows system voice with warm British pronunciation and elegant tone.',
        'system_voice_name': 'Microsoft Hazel Desktop'
    },
    {
        'id': 'system_mark',
        'name': 'Mark (Windows)',
        'source': 'System',
        'sample_text': 'Hello! This is Mark, a Windows system voice with professional male pronunciation and business tone.',
        'system_voice_name': 'Microsoft Mark Desktop'
    },
    
    # ====== AZURE SPEECH VOICES (If Configured) ======
    {
        'id': 'microsoft_aria',
        'name': 'Aria (Microsoft Neural)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Aria, a conversational Microsoft Neural voice with natural intonation and friendly tone. Perfect for modern applications and user interactions.',
        'ms_voice_name': 'en-US-AriaNeural'
    },
    {
        'id': 'microsoft_guy',
        'name': 'Guy (Microsoft Neural)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Guy, a casual male Microsoft Neural voice with natural speech patterns and modern appeal. Great for relaxed, contemporary content.',
        'ms_voice_name': 'en-US-GuyNeural'
    },
    {
        'id': 'microsoft_jenny',
        'name': 'Jenny (Microsoft Neural)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Jenny, a professional and reliable Microsoft Neural voice perfect for business applications and customer service.',
        'ms_voice_name': 'en-US-JennyNeural'
    },
    {
        'id': 'microsoft_ryan',
        'name': 'Ryan (Microsoft Neural)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Ryan, an authoritative news-style Microsoft Neural voice with commanding presence and clear delivery.',
        'ms_voice_name': 'en-US-RyanNeural'
    },
    {
        'id': 'microsoft_libby',
        'name': 'Libby (Microsoft Neural UK)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Libby, a sophisticated British Microsoft Neural voice with elegant pronunciation and professional tone.',
        'ms_voice_name': 'en-GB-LibbyNeural'
    },
    {
        'id': 'microsoft_emma',
        'name': 'Emma (Microsoft Neural)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Emma, a warm storytelling Microsoft Neural voice perfect for narratives and engaging content.',
        'ms_voice_name': 'en-US-EmmaNeural'
    },
    
    # ====== GOOGLE CLOUD TTS VOICES (If Configured) ======
    {
        'id': 'google_en_us_standard_a',
        'name': 'Standard-A (Google)',
        'source': 'Google',
        'sample_text': 'Hello! This is Google Standard-A, a clear female voice with professional pronunciation and reliable quality.',
        'google_voice_name': 'en-US-Standard-A'
    },
    {
        'id': 'google_en_us_standard_b',
        'name': 'Standard-B (Google)',
        'source': 'Google',
        'sample_text': 'Hello! This is Google Standard-B, a professional male voice with authoritative tone and clear articulation.',
        'google_voice_name': 'en-US-Standard-B'
    },
    {
        'id': 'google_en_us_wavenet_a',
        'name': 'WaveNet-A (Google Premium)',
        'source': 'Google',
        'sample_text': 'Hello! This is Google WaveNet-A, a premium quality female voice with natural intonation and advanced neural processing.',
        'google_voice_name': 'en-US-Wavenet-A'
    },
    {
        'id': 'google_en_us_wavenet_b',
        'name': 'WaveNet-B (Google Premium)',
        'source': 'Google',
        'sample_text': 'Hello! This is Google WaveNet-B, a premium quality male voice with natural speech patterns and advanced neural processing.',
        'google_voice_name': 'en-US-Wavenet-B'
    },
    {
        'id': 'google_en_gb_standard_a',
        'name': 'UK Standard-A (Google)',
        'source': 'Google',
        'sample_text': 'Hello! This is Google UK Standard-A, a British female voice with elegant pronunciation and sophisticated tone.',
        'google_voice_name': 'en-GB-Standard-A'
    },
    {
        'id': 'google_en_gb_wavenet_a',
        'name': 'UK WaveNet-A (Google Premium)',
        'source': 'Google',
        'sample_text': 'Hello! This is Google UK WaveNet-A, a premium British female voice with natural intonation and sophisticated accent.',
        'google_voice_name': 'en-GB-Wavenet-A'
    }
]

async def check_tts_availability():
    """Check which TTS engines are available"""
    logger.info("🔍 Checking TTS engine availability...")
    
    available_engines = {
        'system': True,  # Always available
        'microsoft': False,
        'google': False,
        'coqui': False
    }
    
    # Check Azure Speech (Microsoft)
    azure_key = os.getenv("AZURE_SPEECH_KEY")
    if azure_key:
        try:
            import azure.cognitiveservices.speech as speechsdk
            available_engines['microsoft'] = True
            logger.info("   ✅ Microsoft Azure Speech Services available")
        except ImportError:
            logger.info("   ❌ Azure Speech SDK not installed")
    else:
        logger.info("   ⚠️  Microsoft Azure Speech Services: No API key configured")
    
    # Check Google Cloud TTS
    google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if google_creds and Path(google_creds).exists():
        try:
            from google.cloud import texttospeech
            available_engines['google'] = True
            logger.info("   ✅ Google Cloud TTS available")
        except ImportError:
            logger.info("   ❌ Google Cloud TTS SDK not installed")
    else:
        logger.info("   ⚠️  Google Cloud TTS: No credentials configured")
    
    # Check Coqui TTS
    try:
        from TTS.api import TTS
        available_engines['coqui'] = True
        logger.info("   ✅ Coqui TTS available")
    except ImportError:
        logger.info("   ⚠️  Coqui TTS: Not installed (Python 3.12 compatibility issue)")
    
    logger.info(f"   🎤 System TTS: {'✅ Available' if available_engines['system'] else '❌ Not available'}")
    
    return available_engines

async def generate_available_samples(available_engines):
    """Generate samples for all available TTS engines"""
    logger.info("🎵 Generating voice samples for available engines...")
    
    # Filter voice configurations based on available engines
    voices_to_generate = []
    
    for voice_config in voice_expansions:
        source = voice_config['source'].lower()
        
        if source == 'system' and available_engines['system']:
            voices_to_generate.append(voice_config)
        elif source == 'microsoft' and available_engines['microsoft']:
            voices_to_generate.append(voice_config)
        elif source == 'google' and available_engines['google']:
            voices_to_generate.append(voice_config)
        elif source == 'coqui-tts' and available_engines['coqui']:
            voices_to_generate.append(voice_config)
    
    if not voices_to_generate:
        logger.warning("❌ No voices available for generation!")
        return False
    
    logger.info(f"📊 Planning to generate {len(voices_to_generate)} voice samples:")
    
    # Group by source
    by_source = {}
    for voice in voices_to_generate:
        source = voice['source']
        if source not in by_source:
            by_source[source] = []
        by_source[source].append(voice['name'])
    
    for source, names in by_source.items():
        logger.info(f"   {source}: {len(names)} voices ({', '.join(names[:3])}{'...' if len(names) > 3 else ''})")
    
    # Generate all samples
    try:
        results = await voice_sample_generator.generate_library_samples(voices_to_generate)
        
        # Report results
        successful = len([p for p in results.values() if p])
        total = len(voices_to_generate)
        
        logger.info(f"\n🎯 Generated {successful}/{total} voice samples successfully!")
        
        # Detailed results by source
        for source in by_source.keys():
            source_voices = [v for v in voices_to_generate if v['source'] == source]
            source_successful = len([v for v in source_voices if results.get(v['id'])])
            logger.info(f"   {source}: {source_successful}/{len(source_voices)} successful")
        
        # List sample URLs for successful generations
        if successful > 0:
            logger.info(f"\n📁 Generated sample URLs:")
            for voice_id, sample_path in results.items():
                if sample_path:
                    voice_name = next((v['name'] for v in voices_to_generate if v['id'] == voice_id), voice_id)
                    sample_url = voice_sample_generator.get_sample_url(voice_id)
                    logger.info(f"   ✅ {voice_name}: {sample_url}")
        
        return successful > 0
        
    except Exception as e:
        logger.error(f"❌ Error during sample generation: {e}")
        return False

async def show_setup_instructions(available_engines):
    """Show setup instructions for unavailable engines"""
    if not available_engines['microsoft']:
        logger.info("\n🔧 To enable Microsoft Azure Speech (Premium Neural Voices):")
        logger.info("   1. See azure_speech_setup.md for detailed setup")
        logger.info("   2. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION environment variables")
        logger.info("   3. Get 5 hours/month free with Azure's F0 tier!")
    
    if not available_engines['google']:
        logger.info("\n🔧 To enable Google Cloud TTS (High-Quality Voices):")  
        logger.info("   1. See google_tts_setup.md for detailed setup")
        logger.info("   2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
        logger.info("   3. Get 1M characters/month free with Google's free tier!")

async def main():
    """Main execution function"""
    print("🎤 Ultimate Voice Bridge - Voice Library Expansion")
    print("=" * 60)
    
    # Check TTS engine availability
    available_engines = await check_tts_availability()
    print()
    
    # Generate samples for available engines
    success = await generate_available_samples(available_engines)
    
    if success:
        print(f"\n🎉 Voice library expansion successful!")
        print("🚀 Next steps:")
        print("1. Start backend: python main.py")
        print("2. Start frontend: npm run dev") 
        print("3. Go to Voice Clone Studio > Explore Voices")
        print("4. Look for voices with '🎤 Real Sample' badges")
        print("5. Test authentic voice samples!")
        
        # Show what's available
        total_available = sum(1 for engine, available in available_engines.items() if available)
        print(f"\n📊 Available TTS Engines: {total_available}/4")
        if available_engines['system']:
            print("   ✅ System TTS (Windows SAPI)")
        if available_engines['microsoft']:
            print("   ✅ Microsoft Azure Speech (Neural)")
        if available_engines['google']:
            print("   ✅ Google Cloud TTS (WaveNet/Standard)")
        if available_engines['coqui']:
            print("   ✅ Coqui TTS (Open Source)")
        
    else:
        print("\n⚠️  Voice library expansion had limited success")
        print("Check the logs above for details")
    
    # Show setup instructions for missing engines
    await show_setup_instructions(available_engines)

if __name__ == "__main__":
    asyncio.run(main())