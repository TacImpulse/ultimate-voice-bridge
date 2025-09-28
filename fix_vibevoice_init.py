#!/usr/bin/env python3
"""
VibeVoice Initialization Fix

This script adds the missing voice clone loading functionality
to the VibeVoice service initialization.
"""

import os
import re
from pathlib import Path

def patch_vibevoice_service():
    """Patch the VibeVoice service to load existing voice clones at startup"""
    print("🔧 Patching VibeVoice Service Initialization")
    print("=" * 50)
    
    service_path = Path("backend/services/vibevoice_service.py")
    
    if not service_path.exists():
        print(f"❌ VibeVoice service file not found: {service_path}")
        return False
    
    # Read the current file
    with open(service_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already patched
    if "_load_existing_voice_clones" in content:
        print("✅ VibeVoice service already patched!")
        return True
    
    # Find the _initialize_voice_configs method and add voice clone loading
    pattern = r'(    def _initialize_voice_configs\(self\):.*?        \}\))'
    
    replacement = r'''\1
        
        # Load existing voice clones from temp directory
        self._load_existing_voice_clones()'''
    
    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    # Add the new method after the existing _initialize_voice_configs method
    method_pattern = r'(        \}\)\n\n    async def initialize\(self\))'
    
    new_method = '''        })

    def _load_existing_voice_clones(self):
        """Load existing voice clones from temp directory at startup"""
        try:
            if not self.temp_dir.exists():
                logger.info("📂 Voice clone temp directory doesn't exist yet")
                return
            
            # Find all metadata files
            metadata_files = list(self.temp_dir.glob("voice_clone_*_metadata.json"))
            
            if not metadata_files:
                logger.info("📋 No existing voice clones found")
                return
            
            loaded_count = 0
            
            for metadata_file in metadata_files:
                try:
                    # Extract voice_id from filename
                    voice_id = metadata_file.stem.replace('_metadata', '')
                    
                    # Load metadata
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    # Check if audio file exists
                    audio_file = self.temp_dir / f"{voice_id}.wav"
                    if not audio_file.exists():
                        logger.warning(f"⚠️ Audio file missing for {voice_id}: {audio_file}")
                        continue
                    
                    # Choose engine/model path based on availability
                    if self._large_model_available():
                        chosen_engine = TTSEngine.VIBEVOICE_7B
                        chosen_model_path = self._get_large_model_path()
                        chosen_quality = "ultra"
                    else:
                        chosen_engine = TTSEngine.VIBEVOICE_1_5B
                        chosen_model_path = "vibevoice/VibeVoice-1.5B"
                        chosen_quality = "high"
                    
                    # Create voice configuration
                    voice_config = VoiceConfig(
                        name=metadata.get("name", "Unknown Clone"),
                        engine=chosen_engine,
                        model_path=chosen_model_path,
                        voice_sample=str(audio_file),
                        description=metadata.get("description", f"Custom voice clone"),
                        quality=chosen_quality
                    )
                    
                    # Add to voice configurations
                    self.voice_configs[voice_id] = voice_config
                    loaded_count += 1
                    
                    logger.info(f"✅ Loaded voice clone: {voice_config.name} ({voice_id})")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load voice clone {metadata_file}: {e}")
                    continue
            
            logger.info(f"📋 Loaded {loaded_count} existing voice clones at startup")
            
        except Exception as e:
            logger.error(f"❌ Failed to load existing voice clones: {e}")

    async def initialize(self)'''
    
    new_content = re.sub(method_pattern, new_method, new_content, flags=re.DOTALL)
    
    # Write the patched content back
    try:
        with open(service_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("✅ VibeVoice service patched successfully!")
        print("   Added _load_existing_voice_clones() method")
        print("   Modified _initialize_voice_configs() to call voice clone loading")
        print("🔄 Restart your backend to apply the patch")
        return True
        
    except Exception as e:
        print(f"❌ Failed to write patched file: {e}")
        return False

if __name__ == "__main__":
    patch_vibevoice_service()