#!/usr/bin/env python3
"""
Voice Clone Restoration Tool

This script helps restore voice clones by:
1. Reading voice clone metadata from the frontend localStorage backup
2. Creating the necessary backend directory structure 
3. Generating placeholder voice clone configurations
4. Providing instructions for re-uploading audio samples

Run this script after extracting localStorage data from your browser.
"""

import os
import json
import uuid
from datetime import datetime
from pathlib import Path

def create_backend_voice_clone_structure(base_path="backend/temp"):
    """Create the backend directory structure for voice clones"""
    voice_clones_dir = Path(base_path) / "voice_clones"
    voice_clones_dir.mkdir(parents=True, exist_ok=True)
    return voice_clones_dir

def generate_voice_clone_config(clone_data, voice_clones_dir):
    """Generate backend configuration for a voice clone"""
    clone_id = clone_data.get('id', str(uuid.uuid4()))
    clone_name = clone_data.get('name', 'Unknown Clone')
    
    # Create clone directory
    clone_dir = voice_clones_dir / clone_id
    clone_dir.mkdir(exist_ok=True)
    
    # Create config.json for the clone
    config = {
        "voice_id": clone_id,
        "name": clone_name,
        "description": f"Voice clone of {clone_name}",
        "created_at": clone_data.get('createdAt', datetime.now().isoformat()),
        "status": "ready",
        "engine": "VibeVoice",
        "samples": [],
        "model_path": str(clone_dir / "model"),
        "metadata": {
            "frontend_synced": True,
            "original_samples_count": len(clone_data.get('samples', [])),
            "restoration_needed": True
        }
    }
    
    # Add sample metadata if available
    if 'samples' in clone_data and clone_data['samples']:
        for i, sample in enumerate(clone_data['samples']):
            sample_config = {
                "id": sample.get('id', f"sample_{i}"),
                "name": sample.get('name', f'Sample {i+1}'),
                "duration": sample.get('duration', 0),
                "quality": sample.get('quality', 0.7),
                "transcript": sample.get('transcript', ''),
                "uploaded_at": sample.get('uploadedAt', datetime.now().isoformat()),
                "audio_file": f"sample_{i}.wav",  # Placeholder - user needs to upload
                "restored": False
            }
            config["samples"].append(sample_config)
    
    # Save config
    config_path = clone_dir / "config.json"
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Created config for '{clone_name}' at {config_path}")
    return clone_dir, config

def process_localstorage_backup(backup_file):
    """Process localStorage backup file containing voice clone data"""
    try:
        with open(backup_file, 'r') as f:
            content = f.read()
            
        # Try to parse as direct JSON array
        try:
            voice_clones = json.loads(content)
        except json.JSONDecodeError:
            # Maybe it's a localStorage export format
            if 'voice-clones' in content:
                data = json.loads(content)
                voice_clones = json.loads(data.get('voice-clones', '[]'))
            else:
                raise ValueError("Could not find voice-clones data in backup file")
        
        if not isinstance(voice_clones, list):
            raise ValueError("Voice clones data should be a list")
            
        return voice_clones
        
    except Exception as e:
        print(f"❌ Error reading backup file: {e}")
        return []

def create_restoration_instructions(voice_clones_dir, configs):
    """Create detailed restoration instructions"""
    instructions_file = voice_clones_dir / "RESTORATION_INSTRUCTIONS.md"
    
    instructions = f"""# Voice Clone Restoration Instructions

Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Overview
Your voice clones have been partially restored with their metadata, but the audio samples need to be re-uploaded.

## Restored Clones
"""
    
    for clone_dir, config in configs:
        instructions += f"""
### {config['name']} (ID: {config['voice_id']})
- **Location**: `{clone_dir}`
- **Samples needed**: {len(config['samples'])}
- **Status**: Configuration created, audio samples required

"""
        
        if config['samples']:
            instructions += "**Expected samples:**\n"
            for sample in config['samples']:
                instructions += f"- `{sample['name']}` ({sample['duration']}s): \"{sample['transcript'][:50]}...\"\n"
            instructions += "\n"

    instructions += f"""
## Next Steps

### Option 1: Use the Frontend to Re-record Samples
1. Start your frontend application
2. Go to the Voice Clone page
3. Your clones should appear with their names and metadata
4. For each clone, re-record or re-upload the audio samples
5. The frontend will automatically sync with the backend

### Option 2: Manual Audio File Placement
1. Place audio files in the respective clone directories
2. Name them as: `sample_0.wav`, `sample_1.wav`, etc.
3. Update the `config.json` files to mark `restored: true` for each sample
4. Restart your backend server

### Option 3: Use the Voice Clone API
```bash
# For each clone, upload samples via API
curl -X POST http://localhost:8001/api/v1/voice-clones/{{clone_id}}/samples \\
  -F "audio=@/path/to/your/audio.wav" \\
  -F "name=Sample Name" \\
  -F "transcript=Your transcript here"
```

## Testing
After restoration, test each voice clone:
1. Go to Voice Clone page in frontend
2. Select a clone and click "Test Voice"
3. If it works, your clone is fully restored!

## Troubleshooting
- If clones don't appear in frontend, check browser console for sync errors
- If backend doesn't recognize clones, restart the backend server
- If VibeVoice errors persist, consider switching to IndexTTS temporarily

## Files Created
"""
    
    for clone_dir, config in configs:
        instructions += f"- `{clone_dir / 'config.json'}` - Configuration for {config['name']}\n"
    
    instructions += f"""
- `{instructions_file}` - This instruction file

## Note
The original localStorage data contained metadata for your clones but not the actual audio files.
This is a limitation of browser localStorage - audio Blobs cannot persist across page refreshes.
"""
    
    with open(instructions_file, 'w') as f:
        f.write(instructions)
        
    print(f"📝 Created restoration instructions at {instructions_file}")

def main():
    """Main restoration process"""
    print("🔧 Voice Clone Restoration Tool")
    print("=" * 40)
    
    # Check if we have a localStorage backup
    backup_file = input("Enter path to localStorage backup file (or 'skip' to create structure only): ").strip()
    
    if backup_file.lower() == 'skip':
        voice_clones = []
        print("⏭️ Skipping localStorage backup, creating basic structure...")
    else:
        if not os.path.exists(backup_file):
            print(f"❌ Backup file not found: {backup_file}")
            return
        
        voice_clones = process_localstorage_backup(backup_file)
        if not voice_clones:
            print("❌ No voice clone data found in backup")
            return
            
        print(f"📋 Found {len(voice_clones)} voice clones in backup")
    
    # Create backend structure
    voice_clones_dir = create_backend_voice_clone_structure()
    print(f"📁 Created voice clones directory: {voice_clones_dir}")
    
    # Process each clone
    configs = []
    for clone in voice_clones:
        clone_dir, config = generate_voice_clone_config(clone, voice_clones_dir)
        configs.append((clone_dir, config))
    
    # Create instructions
    create_restoration_instructions(voice_clones_dir, configs)
    
    print("\n✅ Restoration preparation complete!")
    print(f"📂 Check the directory: {voice_clones_dir}")
    print("📖 Read RESTORATION_INSTRUCTIONS.md for next steps")
    
    if voice_clones:
        print(f"\n🎯 Ready to restore {len(voice_clones)} voice clones:")
        for clone in voice_clones:
            sample_count = len(clone.get('samples', []))
            print(f"   - {clone.get('name', 'Unknown')}: {sample_count} samples")

if __name__ == "__main__":
    main()