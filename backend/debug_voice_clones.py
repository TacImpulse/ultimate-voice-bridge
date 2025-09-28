#!/usr/bin/env python3
"""
Debug script to check VibeVoice voice clone status
"""

import sys
import os
import asyncio
from pathlib import Path
import tempfile
import json

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from services.vibevoice_service import VibeVoiceService

async def main():
    print("🔍 VibeVoice Voice Clone Debug Tool")
    print("=" * 50)
    
    try:
        # Initialize service
        print("📚 Initializing VibeVoice service...")
        service = VibeVoiceService()
        await service.initialize()
        
        # Check temp directory
        temp_dir = service.temp_dir
        print(f"📁 Temp directory: {temp_dir}")
        print(f"📁 Temp directory exists: {temp_dir.exists()}")
        
        if temp_dir.exists():
            # List all files in temp directory
            files = list(temp_dir.glob("*"))
            print(f"📂 Files in temp directory ({len(files)}):")
            for file in files:
                print(f"  - {file.name} ({file.stat().st_size} bytes)")
        
        # Check voice configs
        voice_configs = service.voice_configs
        print(f"\n🎤 Total voice configs: {len(voice_configs)}")
        print("🎤 All voice configs:")
        for voice_id, config in voice_configs.items():
            print(f"  - {voice_id}: {config.name} ({config.engine.value})")
        
        # Filter voice clones specifically
        voice_clones = {k: v for k, v in voice_configs.items() if k.startswith("voice_clone_")}
        print(f"\n🎭 Voice clones found: {len(voice_clones)}")
        for voice_id, config in voice_clones.items():
            print(f"  - {voice_id}: {config.name}")
            
            # Check metadata file
            metadata_path = temp_dir / f"{voice_id}_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                print(f"    ✅ Metadata: created_at={metadata.get('created_at')}, name={metadata.get('name')}")
            else:
                print(f"    ❌ No metadata file found")
            
            # Check voice sample file
            if hasattr(config, 'voice_sample') and config.voice_sample:
                sample_path = Path(config.voice_sample)
                if sample_path.exists():
                    print(f"    ✅ Voice sample: {sample_path} ({sample_path.stat().st_size} bytes)")
                else:
                    print(f"    ❌ Voice sample not found: {sample_path}")
        
        # Test get_voice_clones method
        print(f"\n🧪 Testing get_voice_clones() method...")
        try:
            voice_clone_list = await service.get_voice_clones()
            print(f"✅ get_voice_clones() returned {len(voice_clone_list)} clones:")
            for clone in voice_clone_list:
                print(f"  - {clone['voice_id']}: {clone['name']}")
        except Exception as e:
            print(f"❌ get_voice_clones() failed: {e}")
        
        # Test available voices
        print(f"\n🎵 Testing get_available_voices()...")
        try:
            available_voices = await service.get_available_voices()
            print(f"✅ get_available_voices() returned {len(available_voices)} voices")
            for voice_id, voice_info in available_voices.items():
                if voice_id.startswith("voice_clone_"):
                    print(f"  - CLONE: {voice_id}: {voice_info}")
                elif len(available_voices) <= 10:  # Only show a few standard voices
                    print(f"  - {voice_id}: {voice_info['name']}")
        except Exception as e:
            print(f"❌ get_available_voices() failed: {e}")
        
        print(f"\n✨ Debug complete!")
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())