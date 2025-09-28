"""
Test script to validate the enhanced ConversationEngine voice selection features
"""

import asyncio
import logging
import sys
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('voice_selection_test')

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_voice_selection_features():
    """Test the enhanced voice selection features"""
    
    try:
        from backend.services.vibevoice_service import VibeVoiceService
        from backend.services.conversation_engine import ConversationEngine, ConversationStyle
        
        logger.info("=== TESTING ENHANCED VOICE SELECTION FEATURES ===")
        
        # 1. Test VibeVoice service initialization
        logger.info("1. Initializing VibeVoice service...")
        vibevoice = VibeVoiceService()
        await vibevoice.initialize()
        
        # 2. Test available voices
        logger.info("2. Checking available default voices...")
        available_voices = vibevoice.voice_configs
        expected_voices = ['vibevoice-alice', 'vibevoice-andrew']
        
        for voice_id in expected_voices:
            if voice_id in available_voices:
                logger.info(f"✅ Default voice available: {voice_id}")
            else:
                logger.warning(f"⚠️ Default voice missing: {voice_id}")
        
        # 3. Test voice clones (if any)
        logger.info("3. Checking for custom voice clones...")
        voice_clones = await vibevoice.get_voice_clones()
        logger.info(f"Found {len(voice_clones)} custom voice clones")
        
        for clone in voice_clones:
            logger.info(f"  - {clone.get('name', 'Unknown')}")
        
        # 4. Test conversation engine with enhanced mapping
        logger.info("4. Testing conversation engine with voice mapping...")
        conversation_engine = ConversationEngine(vibevoice_service=vibevoice)
        
        # Test with default voices and fallback
        test_speaker_mapping = {
            "Speaker A": "vibevoice-alice",
            "Speaker B": "vibevoice-andrew",
            "Speaker C": "nonexistent-voice-id"  # Should fall back to default
        }
        
        test_script = """Speaker A: Hello! This is a test of our enhanced voice selection system.

Speaker B: Great! I can hear that we have different voices now, including proper fallbacks.

Speaker C: And I should have a fallback voice even though my original voice ID doesn't exist.

Speaker A: Perfect! The markdown cleaning is working too - no more *asterisks* or **bold** text being read aloud!

Speaker B: Excellent! The system now provides much better voice management and user experience."""
        
        logger.info("5. Generating test conversation...")
        audio_data, metadata = await conversation_engine.create_dynamic_conversation(
            script=test_script,
            speaker_mapping=test_speaker_mapping,
            conversation_style=ConversationStyle.CASUAL,
            add_natural_interactions=False,  # Keep it simple for testing
            include_background_sound=False,
            emotional_intelligence=True
        )
        
        logger.info("6. Test Results:")
        logger.info(f"   ✅ Audio generated: {len(audio_data)} bytes")
        logger.info(f"   ✅ Duration: {metadata.total_duration:.1f}s")
        logger.info(f"   ✅ Speakers: {metadata.speaker_count}")
        logger.info(f"   ✅ Words: {metadata.word_count}")
        
        # Save test output
        output_file = os.path.join(os.path.dirname(__file__), "test_voice_selection_output.wav")
        with open(output_file, 'wb') as f:
            f.write(audio_data)
        logger.info(f"   💾 Test audio saved: {output_file}")
        
        logger.info("=== ALL VOICE SELECTION TESTS PASSED! ===")
        return True
        
    except Exception as e:
        logger.error(f"❌ Voice selection test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_voice_selection_features())
    sys.exit(0 if success else 1)