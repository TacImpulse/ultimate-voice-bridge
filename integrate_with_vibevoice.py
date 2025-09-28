#!/usr/bin/env python3
"""
VibeVoice Integration Script

This script properly integrates the restored voice clone files 
with the VibeVoice service by moving them to the correct locations
and creating the expected metadata format.
"""

import os
import json
import shutil
import tempfile
from pathlib import Path
from datetime import datetime

def integrate_voice_clones():
    """Integrate restored voice clones with VibeVoice service"""
    print("🔧 VibeVoice Voice Clone Integration")
    print("=" * 50)
    
    # Paths
    restored_clones_dir = Path("backend/temp/voice_clones")
    vibevoice_temp_dir = Path(tempfile.gettempdir()) / "vibevoice_tts"
    
    # Create VibeVoice temp directory
    vibevoice_temp_dir.mkdir(exist_ok=True)
    print(f"📁 VibeVoice temp directory: {vibevoice_temp_dir}")
    
    if not restored_clones_dir.exists():
        print(f"❌ Restored clones directory not found: {restored_clones_dir}")
        print("   Run restore_voice_clones.py first!")
        return False
    
    # Get all restored clone directories
    clone_dirs = [d for d in restored_clones_dir.iterdir() if d.is_dir()]
    print(f"📋 Found {len(clone_dirs)} restored voice clone directories")
    
    integrated_count = 0
    
    for clone_dir in clone_dirs:
        voice_id = clone_dir.name
        config_path = clone_dir / "config.json"
        
        if not config_path.exists():
            print(f"⏭️  Skipping {voice_id} - no config.json found")
            continue
            
        try:
            # Load clone configuration
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            clone_name = config.get("name", "Unknown Clone")
            print(f"\n📂 Processing: {clone_name} ({voice_id})")
            
            # Find the first available audio sample
            audio_file = None
            sample_info = None
            
            for sample_file in ["sample_0.wav", "sample_1.wav", "sample_2.wav"]:
                sample_path = clone_dir / sample_file
                if sample_path.exists():
                    audio_file = sample_path
                    # Find matching sample info
                    sample_index = int(sample_file.split('_')[1].split('.')[0])
                    if sample_index < len(config.get("samples", [])):
                        sample_info = config["samples"][sample_index]
                    break
            
            if not audio_file:
                print(f"   ⚠️  No audio samples found for {clone_name}")
                continue
            
            if not sample_info:
                print(f"   ⚠️  No sample info found for {clone_name}")
                continue
                
            # Copy audio file to VibeVoice location
            vibevoice_audio_path = vibevoice_temp_dir / f"{voice_id}.wav"
            shutil.copy2(audio_file, vibevoice_audio_path)
            print(f"   ✅ Copied audio: {audio_file} -> {vibevoice_audio_path}")
            
            # Create VibeVoice metadata format
            vibevoice_metadata = {
                "voice_id": voice_id,
                "name": clone_name,
                "transcript": sample_info.get("transcript", ""),
                "description": config.get("description", f"Custom voice clone: {clone_name}"),
                "voice_sample_path": str(vibevoice_audio_path),
                "created_at": datetime.fromisoformat(config.get("created_at", datetime.now().isoformat())).timestamp(),
                "audio_duration": sample_info.get("duration", 0)
            }
            
            # Save metadata in VibeVoice format
            metadata_path = vibevoice_temp_dir / f"{voice_id}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(vibevoice_metadata, f, indent=2)
            print(f"   ✅ Created metadata: {metadata_path}")
            
            integrated_count += 1
            
        except Exception as e:
            print(f"   ❌ Failed to integrate {voice_id}: {e}")
            continue
    
    print(f"\n📊 INTEGRATION SUMMARY:")
    print(f"   ✅ Voice clones integrated: {integrated_count}")
    print(f"   📁 VibeVoice directory: {vibevoice_temp_dir}")
    
    if integrated_count > 0:
        print(f"\n🎉 SUCCESS! Voice clones integrated with VibeVoice!")
        print(f"   📍 Audio files: {vibevoice_temp_dir}/*.wav")
        print(f"   📍 Metadata files: {vibevoice_temp_dir}/*_metadata.json")
        print(f"   🔄 Restart your backend to load the integrated clones")
        print(f"   🧪 Test them in the Voice Clone page!")
        
        # List integrated files
        print(f"\n📋 Integrated files:")
        for file_path in vibevoice_temp_dir.glob("voice_clone_*"):
            print(f"   - {file_path.name}")
    else:
        print(f"\n⚠️  No voice clones were integrated. Check the errors above.")
    
    return integrated_count > 0

if __name__ == "__main__":
    integrate_voice_clones()