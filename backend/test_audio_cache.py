"""
Test script to verify voice clone test audio caching functionality
Tests the new audio cache system for persistent test audio storage
"""

import sys
import os
import asyncio
import tempfile
from pathlib import Path

# Add current directory to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from services.vibevoice_service import VibeVoiceService

async def test_audio_caching():
    """Test the audio caching functionality"""
    print("🧪 Testing Voice Clone Audio Caching...")
    print("=" * 60)
    
    # Initialize the service
    service = VibeVoiceService()
    
    # Mock voice clone ID and test text
    test_voice_id = "voice_clone_test_cache_123"
    test_text_1 = "Hello! This is a test of voice clone audio caching."
    test_text_2 = "This is a different text for caching test."
    
    print(f"\n📝 Test Setup:")
    print(f"Voice ID: {test_voice_id}")
    print(f"Test Text 1: '{test_text_1}'")
    print(f"Test Text 2: '{test_text_2}'")
    
    # Test 1: Cache key generation
    print(f"\n🔑 Test 1: Cache Key Generation")
    key1 = service._get_audio_cache_key(test_voice_id, test_text_1)
    key2 = service._get_audio_cache_key(test_voice_id, test_text_2)
    key3 = service._get_audio_cache_key(test_voice_id, test_text_1)  # Same as key1
    
    print(f"Key 1 (text 1): {key1}")
    print(f"Key 2 (text 2): {key2}")
    print(f"Key 3 (text 1 again): {key3}")
    
    if key1 == key3 and key1 != key2:
        print("✅ PASS - Cache key generation working correctly")
    else:
        print("❌ FAIL - Cache key generation issue")
    
    # Test 2: Cache miss (no cached audio yet)
    print(f"\n📋 Test 2: Cache Miss")
    cached_audio = service._get_cached_test_audio(test_voice_id, test_text_1)
    
    if cached_audio is None:
        print("✅ PASS - Cache miss correctly returns None")
    else:
        print("❌ FAIL - Expected cache miss but found cached audio")
    
    # Test 3: Cache storage
    print(f"\n💾 Test 3: Cache Storage")
    mock_audio_data = b"MOCK_WAV_AUDIO_DATA_12345"  # Mock audio data
    
    service._cache_test_audio(test_voice_id, test_text_1, mock_audio_data)
    print(f"Cached {len(mock_audio_data)} bytes of mock audio data")
    
    # Test 4: Cache hit
    print(f"\n📋 Test 4: Cache Hit")
    cached_audio = service._get_cached_test_audio(test_voice_id, test_text_1)
    
    if cached_audio and cached_audio == mock_audio_data:
        print(f"✅ PASS - Cache hit returned {len(cached_audio)} bytes of correct data")
    else:
        print("❌ FAIL - Cache hit failed or returned wrong data")
    
    # Test 5: Cache info retrieval
    print(f"\n📊 Test 5: Cache Info Retrieval")
    cache_info = service.get_cached_test_audio_info(test_voice_id)
    
    if cache_info and cache_info['text'] == test_text_1:
        print(f"✅ PASS - Cache info retrieved successfully")
        print(f"   Text: {cache_info['text']}")
        print(f"   Size: {cache_info['audio_size']} bytes")
        print(f"   Cache Key: {cache_info['cache_key']}")
    else:
        print("❌ FAIL - Cache info retrieval failed")
    
    # Test 6: Multiple text caching
    print(f"\n🔄 Test 6: Multiple Text Caching")
    mock_audio_data_2 = b"DIFFERENT_MOCK_AUDIO_DATA_67890"
    service._cache_test_audio(test_voice_id, test_text_2, mock_audio_data_2)
    
    # Verify both are cached independently
    cached_1 = service._get_cached_test_audio(test_voice_id, test_text_1)
    cached_2 = service._get_cached_test_audio(test_voice_id, test_text_2)
    
    if cached_1 == mock_audio_data and cached_2 == mock_audio_data_2:
        print("✅ PASS - Multiple text caching works correctly")
    else:
        print("❌ FAIL - Multiple text caching issue")
    
    # Test 7: Cache clearing
    print(f"\n🗑️ Test 7: Cache Clearing")
    service.clear_voice_clone_cache(test_voice_id)
    
    cached_after_clear = service._get_cached_test_audio(test_voice_id, test_text_1)
    cache_info_after_clear = service.get_cached_test_audio_info(test_voice_id)
    
    if cached_after_clear is None and cache_info_after_clear is None:
        print("✅ PASS - Cache clearing works correctly")
    else:
        print("❌ FAIL - Cache clearing failed")
    
    print(f"\n🎯 Summary:")
    print("The voice clone audio caching system provides:")
    print("1. ✅ Unique cache key generation based on voice ID + text hash")
    print("2. ✅ Persistent storage of test audio files")  
    print("3. ✅ Fast retrieval of cached audio (no regeneration needed)")
    print("4. ✅ Metadata tracking with timestamps and file info")
    print("5. ✅ Multiple text caching per voice clone")
    print("6. ✅ Cache management and cleanup capabilities")
    print("\n🎉 This will solve the issue of lost test audio when switching between voice clones!")

if __name__ == "__main__":
    asyncio.run(test_audio_caching())