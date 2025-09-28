#!/usr/bin/env python3
"""
🛡️ Voice Clone Backup & Recovery System
Ironclad backup solution for voice clone data
"""

import os
import sys
import json
import shutil
import asyncio
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import tempfile

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

class VoiceCloneBackup:
    def __init__(self):
        # Multiple backup locations for redundancy
        self.backup_locations = [
            Path("C:/VoiceCloneBackups"),  # Primary backup
            Path(os.path.expanduser("~/Documents/VoiceCloneBackups")),  # User docs
            Path("./voice_clone_backups"),  # Local backend backup
        ]
        
        # Ensure all backup directories exist
        for location in self.backup_locations:
            location.mkdir(parents=True, exist_ok=True)
        
        print(f"🛡️ Backup system initialized with {len(self.backup_locations)} redundant locations:")
        for i, location in enumerate(self.backup_locations, 1):
            print(f"  {i}. {location.absolute()}")
    
    def create_backup(self, voice_clones_data: List[Dict[str, Any]], source: str = "manual") -> str:
        """Create a complete backup of voice clone data"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"voice_clones_backup_{timestamp}_{source}"
        
        print(f"📦 Creating backup: {backup_name}")
        
        # Create backup data structure
        backup_data = {
            "backup_info": {
                "timestamp": timestamp,
                "source": source,
                "version": "1.0.0",
                "total_clones": len(voice_clones_data)
            },
            "voice_clones": voice_clones_data
        }
        
        backup_files = []
        
        # Save to all backup locations
        for i, location in enumerate(self.backup_locations, 1):
            try:
                backup_dir = location / backup_name
                backup_dir.mkdir(parents=True, exist_ok=True)
                
                # Save JSON metadata
                json_file = backup_dir / "voice_clones.json"
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(backup_data, f, indent=2, ensure_ascii=False)
                
                # Create ZIP archive
                zip_file = location / f"{backup_name}.zip"
                with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                    zf.write(json_file, "voice_clones.json")
                    
                    # Add audio files if they exist as base64 in data
                    for clone in voice_clones_data:
                        if 'samples' in clone:
                            for j, sample in enumerate(clone['samples']):
                                if 'audioBlob' in sample and sample['audioBlob']:
                                    # Extract base64 audio data
                                    audio_data = sample['audioBlob']
                                    if audio_data.startswith('data:audio'):
                                        # Remove data:audio/wav;base64, prefix
                                        base64_data = audio_data.split(',', 1)[1]
                                        import base64
                                        audio_bytes = base64.b64decode(base64_data)
                                        
                                        # Save to zip
                                        audio_filename = f"{clone['name']}_sample_{j}_{sample.get('filename', 'audio.wav')}"
                                        zf.writestr(f"audio/{audio_filename}", audio_bytes)
                
                backup_files.append(str(zip_file))
                print(f"  ✅ Backup {i} saved: {zip_file}")
                
            except Exception as e:
                print(f"  ❌ Backup {i} failed: {e}")
        
        if backup_files:
            print(f"🎉 Backup created successfully! Files:")
            for file_path in backup_files:
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                print(f"  - {file_path} ({size_mb:.1f} MB)")
            return backup_files[0]  # Return primary backup
        else:
            raise Exception("All backup attempts failed!")
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups"""
        backups = []
        
        for location in self.backup_locations:
            if location.exists():
                for backup_file in location.glob("voice_clones_backup_*.zip"):
                    try:
                        stat = backup_file.stat()
                        backups.append({
                            "name": backup_file.stem,
                            "path": str(backup_file),
                            "size_mb": stat.st_size / (1024 * 1024),
                            "created": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                            "location": str(location)
                        })
                    except Exception as e:
                        print(f"⚠️ Error reading backup {backup_file}: {e}")
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x["created"], reverse=True)
        return backups
    
    def restore_backup(self, backup_path: str) -> List[Dict[str, Any]]:
        """Restore voice clones from backup"""
        print(f"🔄 Restoring backup from: {backup_path}")
        
        if not os.path.exists(backup_path):
            raise FileNotFoundError(f"Backup file not found: {backup_path}")
        
        # Extract backup
        with zipfile.ZipFile(backup_path, 'r') as zf:
            # Read voice clones metadata
            with zf.open('voice_clones.json') as f:
                backup_data = json.load(f)
            
            voice_clones = backup_data.get('voice_clones', [])
            
            # Restore audio files
            for clone in voice_clones:
                if 'samples' in clone:
                    for j, sample in enumerate(clone['samples']):
                        audio_filename = f"{clone['name']}_sample_{j}_{sample.get('filename', 'audio.wav')}"
                        audio_path = f"audio/{audio_filename}"
                        
                        if audio_path in zf.namelist():
                            # Read audio data and convert back to base64
                            with zf.open(audio_path) as audio_file:
                                audio_bytes = audio_file.read()
                                import base64
                                base64_data = base64.b64encode(audio_bytes).decode()
                                sample['audioBlob'] = f"data:audio/wav;base64,{base64_data}"
            
            print(f"✅ Restored {len(voice_clones)} voice clones from backup")
            print(f"📊 Backup info: {backup_data.get('backup_info', {})}")
            
            return voice_clones
    
    def export_to_vibevoice_format(self, voice_clones: List[Dict[str, Any]], export_dir: Optional[Path] = None) -> Path:
        """Export voice clones to VibeVoice-compatible format"""
        if not export_dir:
            export_dir = Path("./voice_clone_exports")
        
        export_dir.mkdir(parents=True, exist_ok=True)
        voices_dir = export_dir / "voices"
        voices_dir.mkdir(exist_ok=True)
        
        print(f"📤 Exporting {len(voice_clones)} voice clones to VibeVoice format...")
        
        for clone in voice_clones:
            clone_name = clone['name'].replace(' ', '_').replace('/', '_')
            
            if 'samples' in clone:
                for j, sample in enumerate(clone['samples']):
                    if 'audioBlob' in sample and sample['audioBlob']:
                        # Extract audio
                        audio_data = sample['audioBlob']
                        if audio_data.startswith('data:audio'):
                            base64_data = audio_data.split(',', 1)[1]
                            import base64
                            audio_bytes = base64.b64decode(base64_data)
                            
                            # Save as WAV file
                            audio_filename = f"{clone_name}_{j}.wav"
                            audio_path = voices_dir / audio_filename
                            
                            with open(audio_path, 'wb') as f:
                                f.write(audio_bytes)
                            
                            print(f"  ✅ {clone['name']}: {audio_filename} ({len(audio_bytes)} bytes)")
        
        # Create README
        readme_path = export_dir / "README.md"
        with open(readme_path, 'w') as f:
            f.write(f"""# Voice Clone Export
            
Exported {len(voice_clones)} voice clones for VibeVoice use.

## Usage
1. Copy the WAV files from the `voices/` directory to your VibeVoice demo/voices/ directory
2. The voice clones will be automatically detected by VibeVoice
3. Use the filename (without .wav) as the voice name in VibeVoice

## Voice Clones Exported
""")
            for clone in voice_clones:
                f.write(f"- **{clone['name']}**: {len(clone.get('samples', []))} samples\n")
        
        print(f"📁 Export complete: {export_dir}")
        return export_dir


async def main():
    print("🛡️ Voice Clone Backup & Recovery System")
    print("=" * 50)
    
    backup_system = VoiceCloneBackup()
    
    print("\n📋 Available commands:")
    print("1. List backups")
    print("2. Create test backup")
    print("3. Restore from backup")
    print("4. Export to VibeVoice format")
    print("5. Exit")
    
    while True:
        try:
            choice = input("\n🎯 Enter choice (1-5): ").strip()
            
            if choice == "1":
                backups = backup_system.list_backups()
                if backups:
                    print(f"\n📦 Found {len(backups)} backups:")
                    for i, backup in enumerate(backups, 1):
                        print(f"  {i}. {backup['name']}")
                        print(f"     Created: {backup['created']} | Size: {backup['size_mb']:.1f} MB")
                        print(f"     Location: {backup['location']}")
                else:
                    print("\n📭 No backups found")
            
            elif choice == "2":
                # Create test backup with dummy data
                test_data = [{
                    "name": "Test Voice Clone",
                    "id": "test_123",
                    "samples": [{
                        "filename": "test.wav",
                        "transcript": "This is a test voice clone",
                        "duration": 5.0
                    }]
                }]
                backup_file = backup_system.create_backup(test_data, "test")
                print(f"✅ Test backup created: {backup_file}")
            
            elif choice == "3":
                backups = backup_system.list_backups()
                if backups:
                    print("\n📦 Available backups:")
                    for i, backup in enumerate(backups, 1):
                        print(f"  {i}. {backup['name']} ({backup['created']})")
                    
                    backup_choice = input("Enter backup number to restore: ").strip()
                    try:
                        backup_index = int(backup_choice) - 1
                        if 0 <= backup_index < len(backups):
                            restored_data = backup_system.restore_backup(backups[backup_index]['path'])
                            print(f"✅ Restored {len(restored_data)} voice clones!")
                        else:
                            print("❌ Invalid backup number")
                    except ValueError:
                        print("❌ Please enter a valid number")
                else:
                    print("📭 No backups available to restore")
            
            elif choice == "4":
                backups = backup_system.list_backups()
                if backups:
                    print("\n📦 Available backups to export:")
                    for i, backup in enumerate(backups, 1):
                        print(f"  {i}. {backup['name']} ({backup['created']})")
                    
                    backup_choice = input("Enter backup number to export: ").strip()
                    try:
                        backup_index = int(backup_choice) - 1
                        if 0 <= backup_index < len(backups):
                            restored_data = backup_system.restore_backup(backups[backup_index]['path'])
                            export_dir = backup_system.export_to_vibevoice_format(restored_data)
                            print(f"✅ Exported to: {export_dir}")
                        else:
                            print("❌ Invalid backup number")
                    except ValueError:
                        print("❌ Please enter a valid number")
                else:
                    print("📭 No backups available to export")
            
            elif choice == "5":
                print("👋 Goodbye!")
                break
            
            else:
                print("❌ Invalid choice. Please enter 1-5.")
        
        except KeyboardInterrupt:
            print("\n\n👋 Exiting...")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())