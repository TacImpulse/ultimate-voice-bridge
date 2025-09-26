#!/usr/bin/env python3
"""
Generate Azure Speech Samples
Creates premium Microsoft Neural voice samples for the voice library
"""

import asyncio
import logging
import os
from dotenv import load_dotenv
from voice_sample_generator import voice_sample_generator

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Azure voice configurations for voice library
azure_voices = [
    # Featured Microsoft Neural Voices
    {
        'id': 'microsoft_aria',
        'name': 'Aria (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Aria, a conversational voice from Microsoft with natural intonation and friendly tone. Perfect for modern applications and user interactions.',
        'ms_voice_name': 'en-US-AriaNeural'
    },
    {
        'id': 'microsoft_guy',
        'name': 'Guy (Microsoft)',
        'source': 'Microsoft', 
        'sample_text': 'Hello! This is Guy, a casual male voice from Microsoft with natural speech patterns and modern appeal. Great for relaxed, contemporary content.',
        'ms_voice_name': 'en-US-GuyNeural'
    },
    {
        'id': 'microsoft_jenny',
        'name': 'Jenny (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Jenny, a professional and reliable voice from Microsoft perfect for business applications and customer service.',
        'ms_voice_name': 'en-US-JennyNeural'
    },
    {
        'id': 'microsoft_ryan',
        'name': 'Ryan (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Ryan, an authoritative news-style voice from Microsoft with commanding presence and clear delivery.',
        'ms_voice_name': 'en-US-RyanNeural'
    },
    {
        'id': 'microsoft_libby',
        'name': 'Libby (Microsoft UK)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Libby, a sophisticated British voice from Microsoft with elegant pronunciation and professional tone.',
        'ms_voice_name': 'en-GB-LibbyNeural'
    },
    {
        'id': 'microsoft_brian',
        'name': 'Brian (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Brian, a corporate executive voice from Microsoft perfect for business presentations and professional content.',
        'ms_voice_name': 'en-US-BrianNeural'  
    },
    {
        'id': 'microsoft_emma',
        'name': 'Emma (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Emma, a warm storytelling voice from Microsoft perfect for narratives and engaging content.',
        'ms_voice_name': 'en-US-EmmaNeural'
    },
    {
        'id': 'microsoft_andrew',
        'name': 'Andrew (Microsoft)',
        'source': 'Microsoft',
        'sample_text': 'Hello! This is Andrew, a clear educational voice from Microsoft ideal for learning content and instructional material.',
        'ms_voice_name': 'en-US-AndrewNeural'
    },
    
    # International Microsoft Neural Voices
    {
        'id': 'microsoft_fr_denise',
        'name': 'Denise (Microsoft French)',
        'source': 'Microsoft',
        'sample_text': 'Bonjour! Je suis Denise, une voix française de Microsoft avec une prononciation claire et naturelle.',
        'ms_voice_name': 'fr-FR-DeniseNeural'
    },
    {
        'id': 'microsoft_de_katja',
        'name': 'Katja (Microsoft German)',
        'source': 'Microsoft',
        'sample_text': 'Hallo! Ich bin Katja, eine deutsche Stimme von Microsoft mit klarer Aussprache und professionellem Ton.',
        'ms_voice_name': 'de-DE-KatjaNeural'
    },
    {
        'id': 'microsoft_es_elvira',
        'name': 'Elvira (Microsoft Spanish)',
        'source': 'Microsoft',
        'sample_text': 'Hola! Soy Elvira, una voz española de Microsoft con pronunciación clara y tono profesional.',
        'ms_voice_name': 'es-ES-ElviraNeural'
    },
    {
        'id': 'microsoft_it_elsa',
        'name': 'Elsa (Microsoft Italian)',
        'source': 'Microsoft',
        'sample_text': 'Ciao! Sono Elsa, una voce italiana di Microsoft con pronuncia chiara e tono professionale.',
        'ms_voice_name': 'it-IT-ElsaNeural'
    }
]

async def test_azure_setup():
    """Test Azure Speech Services setup before generating samples"""
    logger.info("🔧 Testing Azure Speech Services setup...")
    
    # Check for API keys
    speech_key = os.getenv("AZURE_SPEECH_KEY")
    service_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
    
    if not speech_key:
        logger.error("❌ AZURE_SPEECH_KEY not found in environment variables")
        logger.info("💡 Setup required:")
        logger.info("   1. Set environment variable: $env:AZURE_SPEECH_KEY=\"your_key_here\"")
        logger.info("   2. Set environment variable: $env:AZURE_SPEECH_REGION=\"your_region_here\"") 
        logger.info("   📖 See azure_speech_setup.md for detailed instructions")
        return False
    
    logger.info(f"✅ Found Azure Speech Key: {speech_key[:8]}...")
    logger.info(f"✅ Using region: {service_region}")
    
    try:
        import azure.cognitiveservices.speech as speechsdk
        logger.info("✅ Azure Speech SDK available")
        return True
    except ImportError:
        logger.error("❌ Azure Speech SDK not installed")
        logger.info("💡 Install with: pip install azure-cognitiveservices-speech")
        return False

async def generate_azure_samples():
    """Generate Azure voice samples for the voice library"""
    logger.info("🎤 Generating Azure Speech samples for voice library...")
    
    try:
        # Generate samples for Azure voices
        results = await voice_sample_generator.generate_library_samples(azure_voices)
        
        # Report results
        successful = len([p for p in results.values() if p])
        total = len(azure_voices)
        
        logger.info(f"🎯 Generated {successful}/{total} Azure voice samples")
        
        # List generated samples
        for voice_id, sample_path in results.items():
            voice_name = next((v['name'] for v in azure_voices if v['id'] == voice_id), voice_id)
            if sample_path:
                sample_url = voice_sample_generator.get_sample_url(voice_id)
                logger.info(f"   ✅ {voice_name}: {sample_url}")
            else:
                logger.warning(f"   ❌ {voice_name}: Failed to generate")
        
        if successful > 0:
            logger.info("🎉 Azure samples ready! High-quality Microsoft Neural voices available.")
            logger.info("🌐 Start the backend server to serve samples at: http://localhost:8001/api/v1/voice-samples/")
            
            # Show usage stats
            english_samples = len([v for v in azure_voices if v['id'].startswith('microsoft_') and not any(lang in v['id'] for lang in ['fr_', 'de_', 'es_', 'it_'])])
            intl_samples = len(azure_voices) - english_samples
            logger.info(f"📊 Generated: {successful} samples ({english_samples} English, {intl_samples} International)")
            
        else:
            logger.warning("⚠️  No Azure samples were generated. Check Azure Speech API configuration.")
            
        return successful > 0
            
    except Exception as e:
        logger.error(f"❌ Error generating Azure samples: {e}")
        return False

async def show_sample_info():
    """Show information about generated samples"""
    logger.info("📊 Azure Voice Sample Information:")
    
    # Group by language
    english_voices = [v for v in azure_voices if not any(lang in v['id'] for lang in ['fr_', 'de_', 'es_', 'it_'])]
    french_voices = [v for v in azure_voices if 'fr_' in v['id']]
    german_voices = [v for v in azure_voices if 'de_' in v['id']]
    spanish_voices = [v for v in azure_voices if 'es_' in v['id']]
    italian_voices = [v for v in azure_voices if 'it_' in v['id']]
    
    logger.info(f"   🇺🇸 English: {len(english_voices)} voices (Aria, Guy, Jenny, Ryan, etc.)")
    logger.info(f"   🇬🇧 British: 1 voice (Libby)")  
    logger.info(f"   🇫🇷 French: {len(french_voices)} voices")
    logger.info(f"   🇩🇪 German: {len(german_voices)} voices")
    logger.info(f"   🇪🇸 Spanish: {len(spanish_voices)} voices")
    logger.info(f"   🇮🇹 Italian: {len(italian_voices)} voices")
    
    logger.info(f"\n💰 Estimated Azure usage: ~{len(azure_voices) * 50} characters (~$0.001)")
    logger.info("   (Well within the 5-hour/month free tier limit)")

if __name__ == "__main__":
    print("🎤 Azure Speech Sample Generator")
    print("=" * 50)
    
    async def main():
        # Show what will be generated
        await show_sample_info()
        print()
        
        # Test Azure setup
        setup_ok = await test_azure_setup()
        print()
        
        if setup_ok:
            # Generate Azure samples
            success = await generate_azure_samples()
            
            if success:
                print("\n🎉 Azure Speech samples generated successfully!")
                print("🚀 Next steps:")
                print("1. Start backend: python main.py")
                print("2. Start frontend: npm run dev") 
                print("3. Go to Voice Clone Studio > Explore Voices")
                print("4. Look for Microsoft voices with '🎤 Real Sample' badges")
                print("5. Click 'Test Real Voice' to hear premium Neural voices!")
            else:
                print("\n❌ Azure sample generation failed")
                print("Check the logs above for troubleshooting steps")
        else:
            print("\n⚠️  Azure Speech Services setup incomplete")
            print("Please configure AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")
            print("See azure_speech_setup.md for detailed setup instructions")
    
    asyncio.run(main())