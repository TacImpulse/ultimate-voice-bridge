"""
Debug script to check voice configurations and available voice clones
"""
import logging
import sys
import os
import asyncio

# Set up detailed logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('debug_test')

# Add backend to path
sys.path.append(os.path.dirname(__file__))

async def debug_voice_mapping():
    from services.vibevoice_service import VibeVoiceService
    
    try:
        # Initialize service
        logger.info("=== INITIALIZING VIBEVOICE SERVICE ===")
        vibevoice = VibeVoiceService()
        await vibevoice.initialize()
        
        # Check available voice configs
        logger.info('=== VOICE CONFIGS DEBUG ===')
        for voice_id, config in vibevoice.voice_configs.items():
            logger.info(f'Voice ID: "{voice_id}", Name: "{config.name}", Engine: {config.engine}')
        
        # Check voice clones specifically
        voice_clones = await vibevoice.get_voice_clones()
        logger.info(f'=== VOICE CLONES DEBUG ===')
        logger.info(f'Found {len(voice_clones)} voice clones:')
        for clone in voice_clones:
            logger.info(f'Clone: {clone}')
            
        # Test voice clone detection
        logger.info("=== VOICE CLONE AVAILABILITY TEST ===")
        test_voice_ids = ["Justin", "Maya", "voice_clone_Justin", "voice_clone_Maya"]
        for test_id in test_voice_ids:
            exists = test_id in vibevoice.voice_configs
            logger.info(f'Voice ID "{test_id}": {"EXISTS" if exists else "NOT FOUND"}')
    
    except Exception as e:
        logger.error(f"Debug failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_voice_mapping())