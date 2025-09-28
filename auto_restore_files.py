#!/usr/bin/env python3
"""
Automatic Voice Clone File Restoration

This script automatically copies your original trimmed audio files
to the correct voice clone directories in the backend.
"""

import os
import shutil
import json
from pathlib import Path

# File mapping based on your localStorage data
FILE_MAPPINGS = {
    # JuicedIn (voice_clone_1758958045369)
    "voice_clone_1758958045369": [
        {
            "source": r"C:\Users\TacIm\Music\cus-Jusstin_JuicedIn.wav",
            "target": "sample_0.wav",
            "name": "cus-Jusstin_JuicedIn.wav",
            "transcript": "Greetings. It is I, Justin. They call me the Oracle of the South, and the architect of artificial creativity. Let me introduce you to a world where art meets algorithms, where human stories become digital dreams, and where every pixel tells a thousand words.",
            "duration": 26.43
        }
    ],
    
    # Maya (voice_clone_1758962323250)
    "voice_clone_1758962323250": [
        {
            "source": r"C:\Users\TacIm\Music\cus-Maya_Belamonte-Woman.wav",
            "target": "sample_0.wav", 
            "name": "cus-Maya_Belamonte-Woman.wav",
            "transcript": "There's something about a good story isn't there like the way it can transport you to another world or make you feel like you're living someone else's life for just a moment.",
            "duration": 11.26
        },
        {
            "source": r"C:\Users\TacIm\Music\Maya\Maya-YourMom.flac",
            "target": "sample_1.wav",
            "name": "Maya-YourMom.flac", 
            "transcript": "Pretty zen, all things considered, though hearing you talk about it, I feel like I could picture your mom pretty clearly. She sounds like she was really something special.",
            "duration": 23.97
        }
    ],
    
    # Laura (voice_clone_1758958471435)
    "voice_clone_1758958471435": [
        {
            "source": r"C:\Users\TacIm\Music\TTS Voices\Laura-Mk.II-Voice_Profile_Script-Enhanced-v2.wav",
            "target": "sample_0.wav",
            "name": "Laura-Mk.II-Voice_Profile_Script-Enhanced-v2.wav",
            "transcript": "Hello there, my name is Laura and this is my natural speaking voice. I'm excited to help create amazing content with you.",
            "duration": 26.83
        },
        {
            "source": r"C:\Users\TacIm\Music\cus-Laura_Burmood-Trait.wav", 
            "target": "sample_1.wav",
            "name": "cus-Laura_Burmood-Trait.wav",
            "transcript": "Well, I have to say I love everything about those particular traits that you mentioned. They really do make for quite an interesting character, don't they?",
            "duration": 20.01
        }
    ],
    
    # Dick Richard (voice_clone_1758962668516)
    "voice_clone_1758962668516": [
        {
            "source": r"C:\Users\TacIm\Music\cus-Dick_Richard-Sol_Script-MkIV.wav",
            "target": "sample_0.wav",
            "name": "cus-Dick_Richard-Sol_Script-MkIV.wav", 
            "transcript": "Hello there, my name is Richard, and this is my natural speaking voice.",
            "duration": 35.44
        },
        {
            "source": None,  # This was recorded in browser, not from file
            "target": "sample_1.wav",
            "name": "The quick brown fox",
            "transcript": "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet at least once.",
            "duration": 9.0
        }
    ],
    
    # Aria Lume (voice_clone_1758962438728)
    "voice_clone_1758962438728": [
        {
            "source": r"C:\Users\TacIm\Music\cus-Aria_Lume-Woman.wav",
            "target": "sample_0.wav",
            "name": "cus-Aria_Lume-Woman.wav",
            "transcript": "Oh, so you're going to drop your left knee down and then you're going to twist over to the right and breathe.",
            "duration": 14.40
        }
    ],
    
    # Yoga Girl (voice_clone_1758962745413)
    "voice_clone_1758962745413": [
        {
            "source": r"C:\Users\TacIm\Music\YogaGirl(15sec)-enhanced-v2.wav",
            "target": "sample_0.wav",
            "name": "YogaGirl(15sec)-enhanced-v2.wav",
            "transcript": "Oh, so you're going to drop your left knee down and then you're going to twist over to the right and breathe.",
            "duration": 14.43
        }
    ]
}

def restore_voice_clone_files():
    """Restore all voice clone audio files"""
    print("🔧 Automatic Voice Clone File Restoration")
    print("=" * 50)
    
    base_path = Path("backend/temp/voice_clones")
    if not base_path.exists():
        print(f"❌ Voice clone directory not found: {base_path}")
        print("   Run restore_voice_clones.py first!")
        return False
    
    total_copied = 0
    total_skipped = 0
    
    for clone_id, files in FILE_MAPPINGS.items():
        clone_dir = base_path / clone_id
        
        if not clone_dir.exists():
            print(f"❌ Clone directory not found: {clone_dir}")
            continue
            
        print(f"\n📂 Processing clone: {clone_id}")
        
        # Load existing config
        config_path = clone_dir / "config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
        else:
            print(f"❌ Config not found: {config_path}")
            continue
            
        # Copy audio files
        for i, file_info in enumerate(files):
            source_path = file_info["source"]
            target_path = clone_dir / file_info["target"]
            
            if source_path is None:
                print(f"   ⏭️  Skipping {file_info['name']} - was recorded in browser")
                total_skipped += 1
                continue
                
            if not os.path.exists(source_path):
                print(f"   ❌ Source file not found: {source_path}")
                total_skipped += 1
                continue
                
            try:
                # Copy the file
                shutil.copy2(source_path, target_path)
                print(f"   ✅ Copied: {file_info['name']} -> {target_path}")
                
                # Update config to mark as restored
                if i < len(config.get("samples", [])):
                    config["samples"][i]["restored"] = True
                    config["samples"][i]["audio_file"] = file_info["target"]
                
                total_copied += 1
                
            except Exception as e:
                print(f"   ❌ Error copying {source_path}: {e}")
                total_skipped += 1
        
        # Save updated config
        try:
            config["metadata"]["restoration_completed"] = total_copied > 0
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            print(f"   💾 Updated config: {config_path}")
        except Exception as e:
            print(f"   ❌ Error updating config: {e}")
    
    print(f"\n📊 RESTORATION SUMMARY:")
    print(f"   ✅ Files copied: {total_copied}")
    print(f"   ⏭️  Files skipped: {total_skipped}")
    
    if total_copied > 0:
        print(f"\n🎉 SUCCESS! Your voice clones are ready!")
        print(f"   Restart your backend server to load the restored clones.")
        print(f"   Then go to your frontend Voice Clone page to test them!")
    else:
        print(f"\n⚠️  No files were copied. Check the paths above.")
    
    return total_copied > 0

if __name__ == "__main__":
    restore_voice_clone_files()