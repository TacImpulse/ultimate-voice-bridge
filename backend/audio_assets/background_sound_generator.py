"""
Background Sound Generator
Creates synthetic ambient sounds for different conversation styles
"""

import numpy as np
import logging
from pydub import AudioSegment
from pydub.generators import Sine, WhiteNoise
import io
import random
from pathlib import Path
from enum import Enum
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class BackgroundSoundType(Enum):
    """Types of background sounds for different conversation styles"""
    STUDIO_AMBIENCE = "studio_ambience"
    OFFICE_AMBIENCE = "office_ambience"
    CAFE_AMBIENCE = "cafe_ambience"
    CONFERENCE_ROOM = "conference_room"
    OUTDOOR_PARK = "outdoor_park"
    HOME_ROOM = "home_room"
    INTERVIEW_ROOM = "interview_room"

class BackgroundSoundGenerator:
    """Generates synthetic background ambient sounds for conversations"""
    
    def __init__(self, audio_assets_dir: str = "audio_assets/background_sounds"):
        self.audio_assets_dir = Path(audio_assets_dir)
        self.audio_assets_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache for generated sounds
        self._sound_cache: Dict[str, AudioSegment] = {}
        
        logger.info(f"🎵 BackgroundSoundGenerator initialized with assets dir: {self.audio_assets_dir}")
    
    def generate_studio_ambience(self, duration_ms: int = 30000) -> AudioSegment:
        """Generate professional studio ambience with subtle air conditioning and equipment hum"""
        
        # Base room tone - very quiet white noise
        room_tone = WhiteNoise().to_audio_segment(duration=duration_ms).apply_gain(-35)  # Very quiet
        
        # AC hum - low frequency sine wave
        ac_hum = Sine(60).to_audio_segment(duration=duration_ms).apply_gain(-40)  # 60Hz hum, very quiet
        
        # Subtle equipment hum - slightly higher frequency
        equipment_hum = Sine(120).to_audio_segment(duration=duration_ms).apply_gain(-42)
        
        # Combine all elements
        studio_ambience = room_tone.overlay(ac_hum).overlay(equipment_hum)
        
        # Apply gentle filtering to make it sound more natural
        studio_ambience = studio_ambience.low_pass_filter(8000)  # Remove harsh highs
        
        logger.info("🎙️ Generated studio ambience")
        return studio_ambience
    
    def generate_office_ambience(self, duration_ms: int = 30000) -> AudioSegment:
        """Generate office ambience with computer fans, occasional paper rustling"""
        
        # Base office room tone
        room_tone = WhiteNoise().to_audio_segment(duration=duration_ms).apply_gain(-32)
        
        # Computer fan hum - mix of frequencies
        fan_low = Sine(40).to_audio_segment(duration=duration_ms).apply_gain(-38)
        fan_mid = Sine(85).to_audio_segment(duration=duration_ms).apply_gain(-41)
        
        # Occasional paper rustling (very subtle high-frequency bursts)
        paper_rustle = WhiteNoise().to_audio_segment(duration=200).apply_gain(-25).high_pass_filter(2000)
        
        # Add paper rustling at random intervals
        office_base = room_tone.overlay(fan_low).overlay(fan_mid)
        
        # Add occasional paper sounds
        for _ in range(random.randint(2, 5)):  # 2-5 paper sounds
            position = random.randint(0, max(0, duration_ms - 200))
            office_base = office_base.overlay(paper_rustle, position=position)
        
        logger.info("🏢 Generated office ambience")
        return office_base
    
    def generate_cafe_ambience(self, duration_ms: int = 30000) -> AudioSegment:
        """Generate cafe ambience with distant chatter and occasional cup clinks"""
        
        # Base cafe room tone with some reverb-like quality
        room_tone = WhiteNoise().to_audio_segment(duration=duration_ms).apply_gain(-30)
        
        # Distant chatter simulation - filtered white noise with varying intensity
        chatter_base = WhiteNoise().to_audio_segment(duration=duration_ms).apply_gain(-36)
        chatter_filtered = chatter_base.band_pass_filter(300, 3000)  # Human voice range
        
        # Occasional cup clinks (short high-frequency bursts)
        clink_sound = WhiteNoise().to_audio_segment(duration=100).apply_gain(-20).high_pass_filter(4000)
        
        cafe_base = room_tone.overlay(chatter_filtered)
        
        # Add occasional clinks
        for _ in range(random.randint(3, 8)):  # 3-8 clink sounds
            position = random.randint(0, max(0, duration_ms - 100))
            cafe_base = cafe_base.overlay(clink_sound, position=position)
        
        logger.info("☕ Generated cafe ambience")
        return cafe_base
    
    def generate_conference_room_ambience(self, duration_ms: int = 30000) -> AudioSegment:
        """Generate conference room ambience with AC and subtle electronic hum"""
        
        # Professional room tone
        room_tone = WhiteNoise().to_audio_segment(duration=duration_ms).apply_gain(-36)
        
        # HVAC system - multiple frequency components
        hvac_low = Sine(50).to_audio_segment(duration=duration_ms).apply_gain(-40)
        hvac_mid = Sine(100).to_audio_segment(duration=duration_ms).apply_gain(-43)
        
        # Subtle electronic equipment hum
        electronics = Sine(150).to_audio_segment(duration=duration_ms).apply_gain(-45)
        
        conference_ambience = room_tone.overlay(hvac_low).overlay(hvac_mid).overlay(electronics)
        
        logger.info("🏛️ Generated conference room ambience")
        return conference_ambience
    
    def generate_home_room_ambience(self, duration_ms: int = 30000) -> AudioSegment:
        """Generate cozy home room ambience with subtle household sounds"""
        
        # Warmer, softer room tone
        room_tone = WhiteNoise().to_audio_segment(duration=duration_ms).apply_gain(-33)
        room_tone = room_tone.low_pass_filter(6000)  # Warmer sound
        
        # Occasional subtle sounds (very quiet)
        distant_sound = WhiteNoise().to_audio_segment(duration=150).apply_gain(-35).band_pass_filter(200, 1000)
        
        home_base = room_tone
        
        # Add very occasional distant sounds
        for _ in range(random.randint(1, 3)):
            position = random.randint(0, max(0, duration_ms - 150))
            home_base = home_base.overlay(distant_sound, position=position)
        
        logger.info("🏠 Generated home room ambience")
        return home_base
    
    def get_background_sound(self, sound_type: BackgroundSoundType, duration_ms: int = 30000) -> AudioSegment:
        """Get background sound for specified type and duration"""
        
        cache_key = f"{sound_type.value}_{duration_ms}"
        
        # Check cache first
        if cache_key in self._sound_cache:
            logger.info(f"📋 Using cached background sound: {sound_type.value}")
            return self._sound_cache[cache_key]
        
        # Generate new sound
        try:
            if sound_type == BackgroundSoundType.STUDIO_AMBIENCE:
                sound = self.generate_studio_ambience(duration_ms)
            elif sound_type == BackgroundSoundType.OFFICE_AMBIENCE:
                sound = self.generate_office_ambience(duration_ms)
            elif sound_type == BackgroundSoundType.CAFE_AMBIENCE:
                sound = self.generate_cafe_ambience(duration_ms)
            elif sound_type == BackgroundSoundType.CONFERENCE_ROOM:
                sound = self.generate_conference_room_ambience(duration_ms)
            elif sound_type == BackgroundSoundType.HOME_ROOM:
                sound = self.generate_home_room_ambience(duration_ms)
            else:
                # Default to studio ambience
                sound = self.generate_studio_ambience(duration_ms)
            
            # Cache the generated sound
            self._sound_cache[cache_key] = sound
            
            return sound
            
        except Exception as e:
            logger.error(f"❌ Failed to generate background sound {sound_type.value}: {e}")
            # Return silent audio as fallback
            return AudioSegment.silent(duration=duration_ms)
    
    def get_background_for_conversation_style(self, conversation_style: str, duration_ms: int = 30000) -> AudioSegment:
        """Get appropriate background sound for conversation style"""
        
        style_mapping = {
            "podcast": BackgroundSoundType.STUDIO_AMBIENCE,
            "interview": BackgroundSoundType.OFFICE_AMBIENCE,
            "debate": BackgroundSoundType.CONFERENCE_ROOM,
            "casual": BackgroundSoundType.CAFE_AMBIENCE,
            "formal": BackgroundSoundType.CONFERENCE_ROOM,
            "natural": BackgroundSoundType.HOME_ROOM,
            "dramatic": BackgroundSoundType.STUDIO_AMBIENCE
        }
        
        sound_type = style_mapping.get(conversation_style.lower(), BackgroundSoundType.STUDIO_AMBIENCE)
        return self.get_background_sound(sound_type, duration_ms)
    
    def save_background_sound(self, sound_type: BackgroundSoundType, duration_ms: int = 30000) -> Path:
        """Generate and save a background sound to file"""
        
        sound = self.get_background_sound(sound_type, duration_ms)
        filename = f"{sound_type.value}_{duration_ms}ms.wav"
        filepath = self.audio_assets_dir / filename
        
        # Export to file
        sound.export(str(filepath), format="wav")
        logger.info(f"💾 Saved background sound to: {filepath}")
        
        return filepath
    
    def clear_cache(self):
        """Clear the sound cache"""
        self._sound_cache.clear()
        logger.info("🗑️ Background sound cache cleared")


# Global instance
_background_sound_generator = None

def get_background_sound_generator() -> BackgroundSoundGenerator:
    """Get global background sound generator instance"""
    global _background_sound_generator
    if _background_sound_generator is None:
        _background_sound_generator = BackgroundSoundGenerator()
    return _background_sound_generator


if __name__ == "__main__":
    # Test the background sound generator
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate background sounds for testing")
    parser.add_argument("--style", default="podcast", help="Conversation style")
    parser.add_argument("--duration", type=int, default=10000, help="Duration in milliseconds")
    parser.add_argument("--output", help="Output filename")
    
    args = parser.parse_args()
    
    generator = get_background_sound_generator()
    sound = generator.get_background_for_conversation_style(args.style, args.duration)
    
    output_file = args.output or f"test_{args.style}_background.wav"
    sound.export(output_file, format="wav")
    
    print(f"✅ Generated {args.style} background sound: {output_file}")