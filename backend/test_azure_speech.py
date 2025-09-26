#!/usr/bin/env python3
"""
Test Azure Speech Services
Tests Microsoft Neural voices and generates sample audio files
"""

import os
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_azure_speech():
    """Test Azure Speech Services setup"""
    logger.info("🎤 Testing Azure Speech Services...")
    
    try:
        import azure.cognitiveservices.speech as speechsdk
        
        # Check for API keys
        speech_key = os.getenv("AZURE_SPEECH_KEY")
        service_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
        
        if not speech_key:
            logger.error("❌ AZURE_SPEECH_KEY not found in environment variables")
            logger.info("💡 Setup instructions:")
            logger.info("   1. Set environment variable: $env:AZURE_SPEECH_KEY=\"your_key_here\"")
            logger.info("   2. Set environment variable: $env:AZURE_SPEECH_REGION=\"your_region_here\"")
            logger.info("   3. Or create .env file with these variables")
            logger.info("   📖 See azure_speech_setup.md for detailed instructions")
            return False
        
        logger.info(f"✅ Found Azure Speech Key: {speech_key[:8]}...")
        logger.info(f"✅ Using region: {service_region}")
        
        # Test voices to try
        test_voices = [
            {
                'name': 'en-US-AriaNeural',
                'display_name': 'Aria (Conversational Female)',
                'text': 'Hello! This is Aria, a conversational voice with natural intonation and friendly tone.'
            },
            {
                'name': 'en-US-GuyNeural', 
                'display_name': 'Guy (Casual Male)',
                'text': 'Hello! This is Guy, a casual male voice with natural speech patterns and modern appeal.'
            },
            {
                'name': 'en-US-JennyNeural',
                'display_name': 'Jenny (Professional Female)', 
                'text': 'Hello! This is Jenny, a professional and reliable voice perfect for business applications.'
            },
            {
                'name': 'en-US-RyanNeural',
                'display_name': 'Ryan (Authoritative Male)',
                'text': 'Hello! This is Ryan, an authoritative news-style voice with commanding presence.'
            }
        ]
        
        # Create test samples directory
        samples_dir = Path("azure_test_samples")
        samples_dir.mkdir(exist_ok=True)
        
        successful_tests = 0
        
        for voice in test_voices:
            try:
                logger.info(f"🎵 Testing {voice['display_name']}...")
                
                # Configure speech config
                speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
                speech_config.speech_synthesis_voice_name = voice['name']
                speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm)
                
                # Create synthesizer
                synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
                
                # Generate speech
                result = synthesizer.speak_text_async(voice['text']).get()
                
                if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                    # Save to file
                    filename = f"{voice['name'].lower().replace('-', '_')}_test.wav"
                    file_path = samples_dir / filename
                    
                    with open(file_path, 'wb') as f:
                        f.write(result.audio_data)
                    
                    file_size_kb = len(result.audio_data) / 1024
                    logger.info(f"   ✅ Generated: {filename} ({file_size_kb:.1f}KB)")
                    successful_tests += 1
                    
                elif result.reason == speechsdk.ResultReason.Canceled:
                    cancellation_details = result.cancellation_details
                    logger.error(f"   ❌ Speech synthesis canceled: {cancellation_details.reason}")
                    if cancellation_details.reason == speechsdk.CancellationReason.Error:
                        logger.error(f"   Error details: {cancellation_details.error_details}")
                else:
                    logger.error(f"   ❌ Unexpected result: {result.reason}")
                    
            except Exception as e:
                logger.error(f"   ❌ Error testing {voice['display_name']}: {e}")
        
        # Report results
        logger.info(f"\n🎯 Test Results: {successful_tests}/{len(test_voices)} voices successful")
        
        if successful_tests > 0:
            logger.info(f"✅ Azure Speech Services is working!")
            logger.info(f"📁 Test samples saved to: {samples_dir.absolute()}")
            logger.info("🚀 Ready to generate premium voice samples!")
            
            # Show next steps
            logger.info("\n🎯 Next Steps:")
            logger.info("1. Run: python generate_azure_samples.py")
            logger.info("2. Start backend: python main.py") 
            logger.info("3. Test voices in the frontend!")
            
            return True
        else:
            logger.error("❌ No voices were successfully generated")
            logger.info("💡 Check your Azure Speech API key and region")
            return False
            
    except ImportError:
        logger.error("❌ Azure Speech SDK not installed")
        logger.info("💡 Install with: pip install azure-cognitiveservices-speech")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False

async def test_environment_setup():
    """Test environment setup"""
    logger.info("🔧 Testing environment setup...")
    
    # Check environment variables
    speech_key = os.getenv("AZURE_SPEECH_KEY")
    speech_region = os.getenv("AZURE_SPEECH_REGION")
    
    if speech_key:
        logger.info(f"   ✅ AZURE_SPEECH_KEY found: {speech_key[:8]}...")
    else:
        logger.warning("   ⚠️  AZURE_SPEECH_KEY not found")
    
    if speech_region:
        logger.info(f"   ✅ AZURE_SPEECH_REGION found: {speech_region}")
    else:
        logger.warning("   ⚠️  AZURE_SPEECH_REGION not found (will use default: eastus)")
    
    # Check .env file
    env_file = Path(".env")
    if env_file.exists():
        logger.info("   ✅ .env file found")
    else:
        logger.info("   ℹ️  No .env file (using system environment variables)")
    
    return bool(speech_key)

if __name__ == "__main__":
    print("🎤 Azure Speech Services Test")
    print("=" * 40)
    
    async def main():
        # Test environment setup
        env_ok = await test_environment_setup()
        print()
        
        if env_ok:
            # Test Azure Speech Services  
            success = await test_azure_speech()
            
            if success:
                print("\n🎉 Azure Speech Services is ready!")
                print("You can now generate premium Microsoft Neural voice samples!")
            else:
                print("\n❌ Azure Speech Services test failed")
                print("Check the logs above for troubleshooting steps")
        else:
            print("\n⚠️  Environment setup incomplete")
            print("Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION")
            print("See azure_speech_setup.md for detailed instructions")
    
    asyncio.run(main())