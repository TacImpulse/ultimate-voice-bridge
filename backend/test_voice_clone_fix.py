"""
Test script to verify the voice clone text formatting fix
This script tests the new _format_text_for_vibevoice method
"""

import sys
import os

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from services.vibevoice_service import VibeVoiceService

def test_text_formatting():
    """Test the text formatting function"""
    service = VibeVoiceService()
    
    # Test cases
    test_cases = [
        {
            "input": "Hello! This is JuicedIn, testing my cloned voice. I have 1 voice samples for training.",
            "voice_id": "voice_clone_1758839952009",
            "expected_prefix": "Speaker 0:"
        },
        {
            "input": "This is a simple test message.",
            "voice_id": "voice_clone_test",
            "expected_prefix": "Speaker 0:"
        },
        {
            "input": "Speaker 1: Hello there! How are you?",
            "voice_id": "voice_clone_test",
            "expected_prefix": "Speaker 1:"  # Should keep existing format
        }
    ]
    
    print("🧪 Testing VibeVoice text formatting...")
    print("=" * 60)
    
    for i, case in enumerate(test_cases):
        print(f"\n📝 Test {i+1}:")
        print(f"Input: '{case['input']}'")
        
        formatted = service._format_text_for_vibevoice(case['input'], case['voice_id'])
        print(f"Output: '{formatted}'")
        
        if formatted.startswith(case['expected_prefix']):
            print("✅ PASS - Correct speaker formatting")
        else:
            print("❌ FAIL - Incorrect speaker formatting")
            
        print("-" * 40)
    
    print("\n🎯 Summary:")
    print("The _format_text_for_vibevoice method should:")
    print("1. Add 'Speaker 0:' prefix to plain text")
    print("2. Preserve existing speaker annotations")
    print("3. Clean and format text properly for VibeVoice")
    print("\nThis fix should resolve the 'No valid speaker lines found in script' error!")

if __name__ == "__main__":
    test_text_formatting()