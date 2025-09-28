"""
Test script to verify multi-speaker conversation generation with markdown cleaning
"""
import logging
import sys
import os
import asyncio

# Set up detailed logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('test_multi_speaker')

# Add backend to path
sys.path.append(os.path.dirname(__file__))

async def test_conversation_engine():
    """Test the conversation engine with multi-speaker content and markdown cleaning"""
    
    try:
        from services.conversation_engine import ConversationEngine, ConversationStyle
        from services.vibevoice_service import VibeVoiceService
        
        # Initialize VibeVoice service
        logger.info("=== INITIALIZING VIBEVOICE SERVICE ===")
        vibevoice = VibeVoiceService()
        await vibevoice.initialize()
        
        # Initialize conversation engine
        logger.info("=== INITIALIZING CONVERSATION ENGINE ===")
        conversation_engine = ConversationEngine(vibevoice_service=vibevoice)
        
        # Test script with markdown formatting (like what's causing the asterisk issue)
        test_script = """Speaker A: **Hello there!** *How are you doing today?* This is a test with **bold** text and *italic* text.

Speaker B: I'm doing **fantastic**, thanks for asking! ### This is a header that shouldn't be read aloud. Also, here's some `code` that should be cleaned.

Speaker A: That's great to hear! - This is a bullet point
- Another bullet point that should be clean

Speaker B: > This is a blockquote that should be cleaned
Absolutely! Let's continue our **amazing** conversation."""

        # Test speaker mapping with fallback voices (since no actual voice clones exist)
        speaker_mapping = {
            "Speaker A": "vibevoice-alice",    # Use available default voice
            "Speaker B": "vibevoice-andrew"    # Use available default voice
        }
        
        logger.info("=== TESTING CONVERSATION GENERATION ===")
        logger.info(f"Test script:\n{test_script}\n")
        logger.info(f"Speaker mapping: {speaker_mapping}\n")
        
        # Generate conversation
        audio_data, metadata = await conversation_engine.create_dynamic_conversation(
            script=test_script,
            speaker_mapping=speaker_mapping,
            conversation_style=ConversationStyle.DEBATE,
            add_natural_interactions=True,
            include_background_sound=False,
            emotional_intelligence=True
        )
        
        logger.info("=== RESULTS ===")
        logger.info(f"✅ Conversation generated successfully!")
        logger.info(f"Audio data size: {len(audio_data)} bytes")
        logger.info(f"Metadata: {metadata}")
        
        # Save test audio
        output_file = os.path.join(os.path.dirname(__file__), "test_multi_speaker_output.wav")
        with open(output_file, 'wb') as f:
            f.write(audio_data)
        logger.info(f"💾 Test audio saved to: {output_file}")
        
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_conversation_engine())