#!/usr/bin/env python3
"""
Test script for background sound generation
Generates sample background sounds for each conversation style
"""

import sys
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from audio_assets.background_sound_generator import get_background_sound_generator, BackgroundSoundType


def test_background_generation():
    """Test background sound generation for all styles"""
    
    print("🎵 Testing Background Sound Generator")
    print("=" * 50)
    
    generator = get_background_sound_generator()
    
    # Test conversation styles
    conversation_styles = [
        "podcast", "interview", "debate", "casual", 
        "formal", "natural", "dramatic"
    ]
    
    # Test duration (5 seconds for quick testing)
    test_duration = 5000  # 5 seconds in milliseconds
    
    output_dir = Path("test_background_outputs")
    output_dir.mkdir(exist_ok=True)
    
    print(f"Generating {test_duration/1000}s samples for each style...")
    print()
    
    for style in conversation_styles:
        try:
            print(f"🎭 Generating {style} background...")
            
            # Generate background sound
            sound = generator.get_background_for_conversation_style(style, test_duration)
            
            # Save to file
            output_file = output_dir / f"test_{style}_background.wav"
            sound.export(str(output_file), format="wav")
            
            print(f"   ✅ Saved: {output_file}")
            print(f"   📊 Duration: {len(sound)/1000:.1f}s")
            print()
            
        except Exception as e:
            print(f"   ❌ Failed to generate {style}: {e}")
            print()
    
    print("🎉 Background sound generation test complete!")
    print(f"📁 Test files saved to: {output_dir.absolute()}")
    print()
    print("You can play these files to hear the different ambient sounds:")
    for style in conversation_styles:
        output_file = output_dir / f"test_{style}_background.wav"
        if output_file.exists():
            print(f"  • {style.title()}: {output_file}")


def test_individual_sound_types():
    """Test individual background sound types"""
    
    print("\n🔧 Testing Individual Sound Types")
    print("=" * 50)
    
    generator = get_background_sound_generator()
    output_dir = Path("test_background_outputs")
    
    sound_types = [
        BackgroundSoundType.STUDIO_AMBIENCE,
        BackgroundSoundType.OFFICE_AMBIENCE,
        BackgroundSoundType.CAFE_AMBIENCE,
        BackgroundSoundType.CONFERENCE_ROOM,
        BackgroundSoundType.HOME_ROOM
    ]
    
    test_duration = 3000  # 3 seconds
    
    for sound_type in sound_types:
        try:
            print(f"🎛️ Generating {sound_type.value}...")
            
            sound = generator.get_background_sound(sound_type, test_duration)
            
            output_file = output_dir / f"test_{sound_type.value}.wav"
            sound.export(str(output_file), format="wav")
            
            print(f"   ✅ Saved: {output_file}")
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
    
    print("\n✨ All tests complete!")


if __name__ == "__main__":
    try:
        test_background_generation()
        test_individual_sound_types()
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure pydub is installed: pip install pydub")
        print("You may also need ffmpeg for audio processing.")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()