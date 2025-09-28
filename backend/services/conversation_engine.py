"""
Advanced Multi-Speaker Conversation Engine
Creates dynamic conversations with emotion detection, natural pauses, and realistic speech patterns
"""

import asyncio
import logging
import re
import time
import json
import random
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


class ConversationStyle(Enum):
    """Different conversation styles"""
    NATURAL = "natural"
    INTERVIEW = "interview"
    DEBATE = "debate"
    PODCAST = "podcast"
    CASUAL = "casual"
    FORMAL = "formal"
    DRAMATIC = "dramatic"


class EmotionType(Enum):
    """Supported emotions for voice generation"""
    NEUTRAL = "neutral"
    HAPPY = "happy"
    EXCITED = "excited"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISED = "surprised"
    CONFUSED = "confused"
    CONFIDENT = "confident"
    NERVOUS = "nervous"
    WHISPERING = "whispering"


@dataclass
class SpeakerProfile:
    """Profile for a conversation participant"""
    name: str
    voice_id: str
    personality: str  # "energetic", "calm", "authoritative", "friendly"
    speaking_rate: float = 1.0  # 0.5-2.0
    emotion_tendency: EmotionType = EmotionType.NEUTRAL
    interruption_likelihood: float = 0.1  # 0-1, how likely to interrupt
    pause_preference: float = 1.0  # Multiplier for pause lengths


@dataclass
class ConversationSegment:
    """Individual conversation segment"""
    speaker: str
    text: str
    emotion: EmotionType
    pause_before: float  # seconds
    pause_after: float   # seconds
    speech_rate: float
    emphasis_words: List[str] = None
    background_sound: Optional[str] = None


@dataclass
class ConversationMetadata:
    """Metadata for the entire conversation"""
    total_duration: float
    speaker_count: int
    word_count: int
    emotion_distribution: Dict[EmotionType, float]
    interaction_complexity: float  # 0-1 score


class ConversationEngine:
    """Advanced multi-speaker conversation engine with emotion and natural speech patterns"""

    def __init__(self, vibevoice_service=None):
        self.vibevoice_service = vibevoice_service
        self.speaker_profiles: Dict[str, SpeakerProfile] = {}
        self.conversation_history: List[ConversationSegment] = []
        
        # Emotion detection patterns
        self.emotion_patterns = self._load_emotion_patterns()
        
        # Natural pause patterns based on conversation style
        self.pause_patterns = self._initialize_pause_patterns()
        
        # Background sound effects for different conversation types
        self.sound_effects = self._initialize_sound_effects()

    def _load_emotion_patterns(self) -> Dict[EmotionType, List[str]]:
        """Load emotion detection patterns"""
        return {
            EmotionType.EXCITED: [
                r"\b(wow|amazing|incredible|fantastic|awesome)\b",
                r"[!]{2,}", r"\b(really|so|very) [a-z]+\b"
            ],
            EmotionType.HAPPY: [
                r"\b(happy|glad|pleased|delighted|cheerful)\b",
                r"\b(haha|hehe|lol)\b", r"[😊😄😃😀🙂]"
            ],
            EmotionType.SAD: [
                r"\b(sad|disappointed|upset|sorry|unfortunately)\b",
                r"\b(oh no|that's terrible|how awful)\b"
            ],
            EmotionType.ANGRY: [
                r"\b(angry|furious|outraged|ridiculous|unacceptable)\b",
                r"\b(damn|hell|stupid|idiotic)\b"
            ],
            EmotionType.SURPRISED: [
                r"\b(what|really\?|no way|seriously\?|unbelievable)\b",
                r"[?!]{2,}"
            ],
            EmotionType.CONFUSED: [
                r"\b(confused|don't understand|what do you mean|huh)\b",
                r"\b(um|uh|er|well)\b.*[?]"
            ],
            EmotionType.CONFIDENT: [
                r"\b(absolutely|definitely|certainly|of course|exactly)\b",
                r"\b(I know|I'm sure|without doubt)\b"
            ],
            EmotionType.NERVOUS: [
                r"\b(um|uh|er|well|you know|I think maybe)\b",
                r"\b(not sure|might be|possibly|perhaps)\b"
            ]
        }

    def _initialize_pause_patterns(self) -> Dict[ConversationStyle, Dict[str, float]]:
        """Initialize natural pause patterns for different conversation styles"""
        return {
            ConversationStyle.NATURAL: {
                "sentence_end": 0.8,
                "comma": 0.3,
                "question": 1.2,
                "speaker_change": 1.0,
                "interruption": 0.1,
                "thinking": 0.5
            },
            ConversationStyle.INTERVIEW: {
                "sentence_end": 0.6,
                "comma": 0.2,
                "question": 2.0,
                "speaker_change": 1.5,
                "interruption": 0.05,
                "thinking": 0.8
            },
            ConversationStyle.DEBATE: {
                "sentence_end": 0.4,
                "comma": 0.15,
                "question": 1.0,
                "speaker_change": 0.3,
                "interruption": 0.0,
                "thinking": 0.2
            },
            ConversationStyle.PODCAST: {
                "sentence_end": 1.0,
                "comma": 0.4,
                "question": 1.5,
                "speaker_change": 1.8,
                "interruption": 0.02,
                "thinking": 1.0
            },
            ConversationStyle.CASUAL: {
                "sentence_end": 0.5,
                "comma": 0.2,
                "question": 0.8,
                "speaker_change": 0.6,
                "interruption": 0.2,
                "thinking": 0.4
            }
        }

    def _initialize_sound_effects(self) -> Dict[ConversationStyle, List[str]]:
        """Initialize background sound effects for different conversation types"""
        return {
            ConversationStyle.PODCAST: ["studio_ambience", "subtle_music"],
            ConversationStyle.INTERVIEW: ["office_ambience", "paper_rustling"],
            ConversationStyle.CASUAL: ["cafe_ambience", "soft_chatter"],
            ConversationStyle.DEBATE: ["audience_murmur"],
            ConversationStyle.NATURAL: [],
            ConversationStyle.FORMAL: ["conference_room"]
        }

    async def create_dynamic_conversation(
        self,
        script: str,
        speaker_mapping: Dict[str, str],  # speaker_name -> voice_id
        conversation_style: ConversationStyle = ConversationStyle.NATURAL,
        add_natural_interactions: bool = True,
        include_background_sound: bool = False,
        background_sound_volume: int = 50,  # 10-100 scale
        emotional_intelligence: bool = True
    ) -> Tuple[bytes, ConversationMetadata]:
        """
        Create an advanced dynamic conversation with natural speech patterns
        
        Args:
            script: Raw conversation script
            speaker_mapping: Maps speaker names to voice IDs
            conversation_style: Style of conversation (affects pacing, pauses)
            add_natural_interactions: Add interruptions, overlaps, natural reactions
            include_background_sound: Add ambient background sounds
            emotional_intelligence: Enable emotion detection and response
        
        Returns:
            Tuple of (audio_data, conversation_metadata)
        """
        try:
            start_time = time.time()
            logger.info(f"🎭 Creating dynamic conversation with style: {conversation_style.value}")
            
            # Initialize speaker profiles
            self._initialize_speaker_profiles(speaker_mapping, conversation_style)
            
            # Parse and enhance the script
            segments = await self._parse_and_enhance_script(
                script, 
                conversation_style, 
                add_natural_interactions,
                emotional_intelligence
            )
            
            # Generate audio for each segment with advanced processing
            audio_segments = []
            total_word_count = 0
            emotion_distribution = {emotion: 0 for emotion in EmotionType}
            
            for i, segment in enumerate(segments):
                logger.info(f"🎤 Processing segment {i+1}/{len(segments)}: {segment.speaker} ({segment.emotion.value})")
                
                # Generate speech with emotion and prosody
                audio_data = await self._generate_segment_audio(segment, conversation_style)
                
                if audio_data:
                    audio_segments.append(audio_data)
                    total_word_count += len(segment.text.split())
                    emotion_distribution[segment.emotion] += 1
                    
                    # Add natural pause after segment
                    pause_audio = await self._generate_natural_pause(
                        segment.pause_after, 
                        conversation_style,
                        include_background_sound,
                        background_sound_volume
                    )
                    if pause_audio:
                        audio_segments.append(pause_audio)

            # Mix all audio segments together
            if not audio_segments:
                raise Exception("No audio segments generated")
                
            final_audio = await self._mix_conversation_audio(
                audio_segments, 
                conversation_style,
                include_background_sound,
                background_sound_volume
            )
            
            # Create metadata
            processing_time = time.time() - start_time
            metadata = ConversationMetadata(
                total_duration=await self._calculate_audio_duration(final_audio),
                speaker_count=len(self.speaker_profiles),
                word_count=total_word_count,
                emotion_distribution={k: v/len(segments) for k, v in emotion_distribution.items()},
                interaction_complexity=self._calculate_interaction_complexity(segments)
            )
            
            logger.info(f"✅ Dynamic conversation created in {processing_time:.2f}s")
            logger.info(f"📊 Stats: {metadata.speaker_count} speakers, {metadata.word_count} words, {metadata.total_duration:.1f}s duration")
            
            return final_audio, metadata
            
        except Exception as e:
            logger.error(f"❌ Dynamic conversation creation failed: {e}")
            raise

    def _initialize_speaker_profiles(
        self, 
        speaker_mapping: Dict[str, str], 
        conversation_style: ConversationStyle
    ):
        """Initialize detailed profiles for each speaker based on conversation style"""
        
        personalities = ["energetic", "calm", "authoritative", "friendly", "analytical", "creative"]
        
        # Get available voices from VibeVoice service for validation
        available_voices = self._get_available_voices()
        logger.info(f"🎤 Available voices for mapping: {list(available_voices.keys())}")
        
        # Fallback voices if requested voices don't exist
        fallback_voices = ["vibevoice-alice", "vibevoice-andrew", "vibevoice-large-alice"]
        fallback_index = 0
        
        for i, (speaker_name, requested_voice_id) in enumerate(speaker_mapping.items()):
            # Validate and resolve voice ID
            if requested_voice_id in available_voices:
                voice_id = requested_voice_id
                logger.info(f"✅ Using requested voice '{voice_id}' for speaker '{speaker_name}'")
            else:
                # Use fallback voice
                voice_id = fallback_voices[fallback_index % len(fallback_voices)]
                fallback_index += 1
                logger.warning(f"⚠️ Voice '{requested_voice_id}' not found for speaker '{speaker_name}'. Using fallback: '{voice_id}'")
            
            # Assign personality based on speaker name and style
            personality = personalities[i % len(personalities)]
            
            # Adjust speaking characteristics based on conversation style
            if conversation_style == ConversationStyle.DEBATE:
                speaking_rate = random.uniform(1.1, 1.3)
                interruption_likelihood = random.uniform(0.2, 0.4)
                pause_preference = random.uniform(0.5, 0.8)
            elif conversation_style == ConversationStyle.PODCAST:
                speaking_rate = random.uniform(0.9, 1.1)
                interruption_likelihood = random.uniform(0.01, 0.05)
                pause_preference = random.uniform(1.2, 1.5)
            elif conversation_style == ConversationStyle.CASUAL:
                speaking_rate = random.uniform(0.8, 1.2)
                interruption_likelihood = random.uniform(0.1, 0.3)
                pause_preference = random.uniform(0.8, 1.2)
            else:  # Natural, Interview, Formal
                speaking_rate = random.uniform(0.9, 1.1)
                interruption_likelihood = random.uniform(0.05, 0.15)
                pause_preference = random.uniform(0.9, 1.1)
            
            profile = SpeakerProfile(
                name=speaker_name,
                voice_id=voice_id,
                personality=personality,
                speaking_rate=speaking_rate,
                emotion_tendency=EmotionType.NEUTRAL,
                interruption_likelihood=interruption_likelihood,
                pause_preference=pause_preference
            )
            
            self.speaker_profiles[speaker_name] = profile
            logger.info(f"👤 Initialized speaker profile: {speaker_name} -> voice_id='{voice_id}' ({personality}, rate={speaking_rate:.2f})")
        
        # COMPREHENSIVE DEBUG OUTPUT
        logger.info(f"🔍 SPEAKER MAPPING DEBUG:")
        logger.info(f"   • Input speaker_mapping: {speaker_mapping}")
        logger.info(f"   • Final speaker profiles:")
        for speaker_name, profile in self.speaker_profiles.items():
            logger.info(f"     - '{speaker_name}' -> '{profile.voice_id}'")
        logger.info(f"   • Total Profiles Created: {len(self.speaker_profiles)}")
    
    def _get_available_voices(self) -> Dict[str, str]:
        """Get available voices from VibeVoice service"""
        try:
            if self.vibevoice_service and hasattr(self.vibevoice_service, 'voice_configs'):
                return self.vibevoice_service.voice_configs
            else:
                logger.warning("VibeVoice service not available, using empty voice list")
                return {}
        except Exception as e:
            logger.error(f"Failed to get available voices: {e}")
            return {}

    async def _parse_and_enhance_script(
        self,
        script: str,
        conversation_style: ConversationStyle,
        add_natural_interactions: bool,
        emotional_intelligence: bool
    ) -> List[ConversationSegment]:
        """Parse script and enhance with natural speech patterns and emotions"""
        
        # Basic script parsing
        raw_segments = self._parse_conversation_script(script)
        
        enhanced_segments = []
        previous_emotion = EmotionType.NEUTRAL
        previous_speaker = None
        
        for i, (speaker, text) in enumerate(raw_segments):
            # Detect emotion in the text
            if emotional_intelligence:
                emotion = self._detect_emotion(text, previous_emotion)
            else:
                emotion = EmotionType.NEUTRAL
                
            # Calculate natural pauses
            pause_before, pause_after = self._calculate_natural_pauses(
                text, speaker, previous_speaker, conversation_style, i
            )
            
            # Get speaker-specific speech rate
            speaker_profile = self.speaker_profiles.get(speaker)
            speech_rate = speaker_profile.speaking_rate if speaker_profile else 1.0
            
            # Identify emphasis words
            emphasis_words = self._identify_emphasis_words(text, emotion)
            
            # Create enhanced segment
            segment = ConversationSegment(
                speaker=speaker,
                text=text,
                emotion=emotion,
                pause_before=pause_before,
                pause_after=pause_after,
                speech_rate=speech_rate,
                emphasis_words=emphasis_words
            )
            
            enhanced_segments.append(segment)
            previous_emotion = emotion
            previous_speaker = speaker
            
        # Add natural interactions if requested
        if add_natural_interactions:
            enhanced_segments = await self._add_natural_interactions(
                enhanced_segments, conversation_style
            )
            
        return enhanced_segments

    def _parse_conversation_script(self, script: str) -> List[Tuple[str, str]]:
        """Enhanced script parsing with better speaker detection"""
        segments = []
        lines = script.strip().split('\n')
        
        current_speaker = None
        current_text = ""
        
        # Enhanced speaker detection patterns
        speaker_patterns = [
            r'^(Speaker \d+|Host|Guest|Interviewer|Interviewee|\[S\d+\]|[A-Z][a-zA-Z\s]*)\s*:\s*(.*)$',
            r'^([A-Z][A-Z\s]+):\s*(.*)$',  # ALL CAPS names
            r'^([A-Za-z]+):\s*(.*)$'       # Simple names
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            speaker_matched = False
            
            for pattern in speaker_patterns:
                match = re.match(pattern, line, re.IGNORECASE)
                if match:
                    # Save previous segment
                    if current_speaker and current_text:
                        segments.append((current_speaker, current_text.strip()))
                    
                    # Start new segment
                    current_speaker = match.group(1).strip()
                    current_text = match.group(2).strip() if match.group(2) else ""
                    speaker_matched = True
                    break
            
            if not speaker_matched:
                # Continue current speaker's text
                if current_text:
                    current_text += " " + line
                else:
                    current_text = line
        
        # Don't forget the last segment
        if current_speaker and current_text:
            segments.append((current_speaker, current_text.strip()))
        
        logger.info(f"📝 Parsed {len(segments)} conversation segments")
        for i, (speaker, text) in enumerate(segments):
            logger.info(f"  Segment {i+1}: Speaker='{speaker}' Text='{text[:50]}...'")
        return segments

    def _detect_emotion(self, text: str, previous_emotion: EmotionType) -> EmotionType:
        """Advanced emotion detection based on text patterns and context"""
        
        text_lower = text.lower()
        emotion_scores = {emotion: 0 for emotion in EmotionType}
        
        # Check each emotion pattern
        for emotion, patterns in self.emotion_patterns.items():
            for pattern in patterns:
                matches = len(re.findall(pattern, text_lower, re.IGNORECASE))
                emotion_scores[emotion] += matches
        
        # Consider previous emotion for continuity
        if previous_emotion != EmotionType.NEUTRAL:
            emotion_scores[previous_emotion] += 0.3
        
        # Find the highest scoring emotion
        max_emotion = max(emotion_scores, key=emotion_scores.get)
        
        # Only return non-neutral if there's strong evidence
        if emotion_scores[max_emotion] > 0.5:
            return max_emotion
        else:
            return EmotionType.NEUTRAL

    def _calculate_natural_pauses(
        self,
        text: str,
        speaker: str,
        previous_speaker: Optional[str],
        conversation_style: ConversationStyle,
        segment_index: int
    ) -> Tuple[float, float]:
        """Calculate natural pause durations before and after speech"""
        
        pause_config = self.pause_patterns.get(conversation_style, 
                                               self.pause_patterns[ConversationStyle.NATURAL])
        
        # Base pause after previous segment
        pause_before = pause_config["speaker_change"] if previous_speaker and previous_speaker != speaker else 0.2
        
        # Pause after this segment based on punctuation
        pause_after = pause_config["sentence_end"]
        
        if text.endswith('?'):
            pause_after = pause_config["question"]
        elif text.endswith('!'):
            pause_after = pause_after * 1.2
        elif ',' in text:
            pause_after = max(pause_after, pause_config["comma"])
            
        # Add thinking pauses for complex thoughts
        if any(word in text.lower() for word in ['however', 'therefore', 'furthermore', 'meanwhile']):
            pause_after += pause_config["thinking"]
            
        # Speaker-specific pause preferences
        speaker_profile = self.speaker_profiles.get(speaker)
        if speaker_profile:
            pause_after *= speaker_profile.pause_preference
            
        # Add some natural variation
        pause_before += random.uniform(-0.1, 0.1)
        pause_after += random.uniform(-0.2, 0.2)
        
        # Ensure minimum pauses
        pause_before = max(0.1, pause_before)
        pause_after = max(0.2, pause_after)
        
        return pause_before, pause_after

    def _identify_emphasis_words(self, text: str, emotion: EmotionType) -> List[str]:
        """Identify words that should be emphasized based on context and emotion"""
        
        # Words that commonly get emphasis
        emphasis_candidates = []
        
        # Emotional emphasis
        if emotion == EmotionType.EXCITED:
            emphasis_candidates.extend(re.findall(r'\b(amazing|incredible|fantastic|awesome|wow)\b', text, re.IGNORECASE))
        elif emotion == EmotionType.ANGRY:
            emphasis_candidates.extend(re.findall(r'\b(never|always|completely|absolutely|ridiculous)\b', text, re.IGNORECASE))
        elif emotion == EmotionType.SURPRISED:
            emphasis_candidates.extend(re.findall(r'\b(really|seriously|what|unbelievable)\b', text, re.IGNORECASE))
        
        # Structural emphasis (ALL CAPS, quotes, etc.)
        emphasis_candidates.extend(re.findall(r'\b[A-Z]{2,}\b', text))  # ALL CAPS words
        emphasis_candidates.extend(re.findall(r'"([^"]*)"', text))       # Quoted text
        emphasis_candidates.extend(re.findall(r'\*([^*]*)\*', text))     # *emphasized*
        
        return list(set(emphasis_candidates))

    async def _add_natural_interactions(
        self,
        segments: List[ConversationSegment],
        conversation_style: ConversationStyle
    ) -> List[ConversationSegment]:
        """Add natural interruptions, reactions, and overlapping speech"""
        
        if conversation_style == ConversationStyle.FORMAL:
            return segments  # Formal conversations don't have interruptions
            
        enhanced_segments = []
        
        for i, segment in enumerate(segments):
            enhanced_segments.append(segment)
            
            # Randomly add natural reactions
            if i < len(segments) - 1:  # Not the last segment
                next_segment = segments[i + 1]
                speaker_profile = self.speaker_profiles.get(next_segment.speaker)
                
                if speaker_profile and random.random() < speaker_profile.interruption_likelihood:
                    # Add a natural reaction or interjection
                    reactions = ["Mm-hmm", "Right", "Exactly", "Oh", "Wow", "Really?", "I see"]
                    reaction_text = random.choice(reactions)
                    
                    reaction_segment = ConversationSegment(
                        speaker=next_segment.speaker,
                        text=reaction_text,
                        emotion=EmotionType.NEUTRAL,
                        pause_before=0.1,
                        pause_after=0.3,
                        speech_rate=speaker_profile.speaking_rate * 1.2,  # Slightly faster
                        emphasis_words=[]
                    )
                    
                    enhanced_segments.append(reaction_segment)
                    
        return enhanced_segments

    async def _generate_segment_audio(
        self,
        segment: ConversationSegment,
        conversation_style: ConversationStyle
    ) -> Optional[bytes]:
        """Generate audio for a single conversation segment with advanced processing"""
        
        if not self.vibevoice_service:
            logger.warning("VibeVoice service not available")
            return None
            
        try:
            # Format text and extract emotion for TTS
            formatted_text, detected_emotion = self._format_text_with_emotion(segment)
            
            # Get the actual voice_id for this speaker
            speaker_profile = self.speaker_profiles.get(segment.speaker)
            voice_id = speaker_profile.voice_id if speaker_profile else segment.speaker
            
            # COMPREHENSIVE VOICE MAPPING DEBUG
            logger.info(f"🔍 VOICE LOOKUP DEBUG:")
            logger.info(f"   • Looking for speaker: '{segment.speaker}'")
            logger.info(f"   • Available profiles: {list(self.speaker_profiles.keys())}")
            logger.info(f"   • Profile found: {speaker_profile is not None}")
            if speaker_profile:
                logger.info(f"   • Profile voice_id: '{speaker_profile.voice_id}'")
            logger.info(f"   • Final voice_id: '{voice_id}'")
            
            logger.info(f"🎤 Using voice '{voice_id}' for speaker '{segment.speaker}'")
            logger.info(f"📝 Formatted text being sent to TTS: '{formatted_text}'")
            logger.info(f"🎭 Emotion being sent to TTS: '{detected_emotion}'")
            
            # Create speaker mapping for VibeVoice multi-speaker generation
            speaker_mapping = {segment.speaker: voice_id}
            
            # For multi-speaker conversations, format text with proper speaker annotation
            # VibeVoice expects format like "Speaker 1: Hello there!" 
            if len(self.speaker_profiles) > 1:
                # Find speaker index for consistent mapping across segments
                speaker_names = sorted(self.speaker_profiles.keys())
                speaker_index = speaker_names.index(segment.speaker) if segment.speaker in speaker_names else 0
                multi_speaker_text = f"Speaker {speaker_index}: {formatted_text}"
                
                # Create complete speaker mapping for all speakers
                complete_speaker_mapping = {}
                for i, speaker_name in enumerate(speaker_names):
                    speaker_profile = self.speaker_profiles[speaker_name]
                    complete_speaker_mapping[f"Speaker {i}"] = speaker_profile.voice_id
                    
                logger.info(f"🎤 Multi-speaker mode: Using '{multi_speaker_text}' with mapping {complete_speaker_mapping}")
                
                # Generate speech with multi-speaker support
                audio_data = await self.vibevoice_service.generate_speech(
                    text=multi_speaker_text,
                    voice=voice_id,  # Primary voice (will be overridden by speaker mapping)
                    emotion=detected_emotion,
                    output_format="wav",
                    multi_speaker=True,
                    speaker_mapping=complete_speaker_mapping
                )
            else:
                # Single speaker mode - use standard generation
                logger.info(f"🎤 Single-speaker mode: Using voice '{voice_id}'")
                audio_data = await self.vibevoice_service.generate_speech(
                    text=formatted_text,
                    voice=voice_id,
                    emotion=detected_emotion,
                    output_format="wav"
                )
            
            # Apply post-processing effects based on emotion and style
            processed_audio = await self._apply_audio_effects(
                audio_data, segment, conversation_style
            )
            
            return processed_audio
            
        except Exception as e:
            logger.error(f"Failed to generate audio for segment: {e}")
            return None

    def _format_text_with_emotion(self, segment: ConversationSegment) -> tuple[str, str]:
        """Format text and extract emotion for TTS
        
        Returns:
            tuple: (formatted_text, emotion_string)
        """
        
        text = segment.text
        
        # CRITICAL: Clean markdown formatting that gets read aloud as text
        text = self._clean_markdown_for_tts(text)
        
        # Store emotion for TTS processing (don't add as text markers)
        detected_emotion = segment.emotion.value
        logger.info(f"🎭 Detected emotion: {detected_emotion}")
        
        # NOTE: We pass the emotion to TTS via the emotion parameter, not as text markers
        # Text markers like [excited] get spoken aloud instead of controlling voice emotion
            
        # TEMPORARILY DISABLE emphasis markup - SSML tags are being spoken aloud
        # if segment.emphasis_words:
        #     for word in segment.emphasis_words:
        #         # Use SSML-style emphasis
        #         text = text.replace(word, f"<emphasis level='strong'>{word}</emphasis>")
        
        if segment.emphasis_words:
            logger.info(f"📝 Emphasis words detected: {segment.emphasis_words}, but SSML disabled to prevent tags being spoken")
                
        # TEMPORARILY DISABLE prosody control - SSML tags are being spoken aloud
        # rate_percent = int((segment.speech_rate - 1.0) * 100)
        # if abs(rate_percent) > 5:  # Only add if significantly different
        #     text = f"<prosody rate='{rate_percent:+d}%'>{text}</prosody>"
        
        rate_percent = int((segment.speech_rate - 1.0) * 100)
        if abs(rate_percent) > 5:
            logger.info(f"🎼 Speech rate adjustment: {rate_percent:+d}%, but prosody tags disabled to prevent XML speech")
            
        # Return the formatted text without speaker annotations
        # (Speaker identity is handled by the voice_id parameter in TTS)
        # Also return the emotion separately so TTS can use it
        return text, detected_emotion
    
    def _clean_markdown_for_tts(self, text: str) -> str:
        """Clean markdown formatting and other artifacts that get read aloud by TTS engines"""
        import re
        
        # Clean text step by step
        cleaned_text = text
        
        # Remove markdown emphasis (bold, italic)
        cleaned_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', cleaned_text)  # **bold** -> bold
        cleaned_text = re.sub(r'\*([^*]+)\*', r'\1', cleaned_text)      # *italic* -> italic
        cleaned_text = re.sub(r'__([^_]+)__', r'\1', cleaned_text)      # __bold__ -> bold
        cleaned_text = re.sub(r'_([^_]+)_', r'\1', cleaned_text)        # _italic_ -> italic
        
        # Remove markdown headers
        cleaned_text = re.sub(r'^#{1,6}\s+', '', cleaned_text, flags=re.MULTILINE)  # ### Header -> Header
        
        # Remove markdown links but keep the text
        cleaned_text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', cleaned_text)  # [text](url) -> text
        
        # Remove markdown code blocks and inline code
        cleaned_text = re.sub(r'```[^`]*```', '', cleaned_text, flags=re.DOTALL)  # ```code``` -> 
        cleaned_text = re.sub(r'`([^`]+)`', r'\1', cleaned_text)        # `code` -> code
        
        # Remove list markers
        cleaned_text = re.sub(r'^\s*[-*+]\s+', '', cleaned_text, flags=re.MULTILINE)  # - item -> item
        cleaned_text = re.sub(r'^\s*\d+\.\s+', '', cleaned_text, flags=re.MULTILINE) # 1. item -> item
        
        # Remove blockquotes
        cleaned_text = re.sub(r'^>\s+', '', cleaned_text, flags=re.MULTILINE)  # > quote -> quote
        
        # Remove horizontal rules
        cleaned_text = re.sub(r'^[-*_]{3,}$', '', cleaned_text, flags=re.MULTILINE)
        
        # Remove HTML tags if any
        cleaned_text = re.sub(r'<[^>]+>', '', cleaned_text)
        
        # Clean up extra whitespace
        cleaned_text = re.sub(r'\n\s*\n', ' ', cleaned_text)  # Multiple newlines -> space
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)       # Multiple spaces -> single space
        cleaned_text = cleaned_text.strip()
        
        # Log if significant cleaning occurred
        if len(text) != len(cleaned_text) or text != cleaned_text:
            logger.info(f"🧼 Cleaned markdown: '{text[:40]}...' -> '{cleaned_text[:40]}...'")
        
        return cleaned_text

    async def _apply_audio_effects(
        self,
        audio_data: bytes,
        segment: ConversationSegment,
        conversation_style: ConversationStyle
    ) -> bytes:
        """Apply post-processing audio effects based on emotion and conversation style"""
        
        # This would integrate with audio processing libraries like pydub
        # For now, return the original audio
        # In a full implementation, you would:
        # 1. Apply EQ based on emotion (boost highs for excitement, etc.)
        # 2. Add reverb for dramatic effect
        # 3. Apply compression for podcast style
        # 4. Add subtle background noise for realism
        
        return audio_data

    async def _generate_natural_pause(
        self,
        duration: float,
        conversation_style: ConversationStyle,
        include_background_sound: bool = False,
        background_sound_volume: int = 50
    ) -> Optional[bytes]:
        """Generate natural pause audio with optional background ambience"""
        
        if duration < 0.1:
            return None
            
        try:
            from pydub import AudioSegment
            import io
            
            duration_ms = int(duration * 1000)  # Convert to ms
            
            if include_background_sound:
                # Import the background sound generator
                import sys
                from pathlib import Path
                sys.path.append(str(Path(__file__).parent.parent / "audio_assets"))
                
                try:
                    from background_sound_generator import get_background_sound_generator
                    
                    # Generate background ambience for this pause
                    bg_generator = get_background_sound_generator()
                    background = bg_generator.get_background_for_conversation_style(
                        conversation_style.value, duration_ms
                    )
                    
                    # Apply user-controlled volume for pauses (convert 10-100 scale to dB)
                    # Base volume for pauses (quieter than main conversation)
                    base_pause_gain = -30  # Very quiet base for pauses
                    volume_adjustment = (background_sound_volume - 50) * 0.3  # ±15dB range
                    final_gain = base_pause_gain + volume_adjustment
                    background = background.apply_gain(final_gain)
                    
                    logger.info(f"🎵 Added {conversation_style.value} background to {duration:.1f}s pause (vol: {background_sound_volume}%, gain: {final_gain:.1f}dB)")
                    
                    # Export as bytes
                    buffer = io.BytesIO()
                    background.export(buffer, format="wav")
                    return buffer.getvalue()
                    
                except ImportError as ie:
                    logger.warning(f"Background sound generator not available: {ie}")
                    # Fall back to silence
                    pass
                except Exception as bg_error:
                    logger.warning(f"Failed to generate background sound: {bg_error}")
                    # Fall back to silence
                    pass
            
            # Generate simple silence (fallback or when background disabled)
            silence = AudioSegment.silent(duration=duration_ms)
            
            # Export as bytes
            buffer = io.BytesIO()
            silence.export(buffer, format="wav")
            return buffer.getvalue()
            
        except Exception as e:
            logger.warning(f"Failed to generate pause audio: {e}")
            return None

    async def _mix_conversation_audio(
        self,
        audio_segments: List[bytes],
        conversation_style: ConversationStyle,
        include_background_sound: bool = False,
        background_sound_volume: int = 50
    ) -> bytes:
        """Mix all audio segments into final conversation with advanced processing"""
        
        try:
            from pydub import AudioSegment
            import io
            
            if not audio_segments:
                raise ValueError("No audio segments to mix")
                
            # Load all segments
            segments = []
            for audio_data in audio_segments:
                if audio_data:
                    segment = AudioSegment.from_file(io.BytesIO(audio_data))
                    segments.append(segment)
            
            if not segments:
                raise ValueError("No valid audio segments")
                
            # Concatenate all segments
            final_audio = sum(segments)
            
            # Apply conversation-style processing
            if conversation_style == ConversationStyle.PODCAST:
                # Apply podcast-style compression and EQ
                final_audio = final_audio.normalize()
                
            elif conversation_style == ConversationStyle.DEBATE:
                # Boost mid-frequencies for clarity - debate style should be punchy
                # Note: pydub's basic filtering - more advanced EQ would need additional libraries
                try:
                    final_audio = final_audio.high_pass_filter(100).low_pass_filter(8000)
                except:
                    pass  # Fallback if filtering fails
                
            # Add continuous background ambience if requested
            if include_background_sound:
                try:
                    # Import the background sound generator
                    import sys
                    from pathlib import Path
                    sys.path.append(str(Path(__file__).parent.parent / "audio_assets"))
                    
                    from background_sound_generator import get_background_sound_generator
                    
                    # Generate background for the entire conversation duration
                    conversation_duration_ms = len(final_audio)
                    bg_generator = get_background_sound_generator()
                    
                    background = bg_generator.get_background_for_conversation_style(
                        conversation_style.value, conversation_duration_ms
                    )
                    
                    # Apply user-controlled volume based on conversation style and user preference
                    # Base volumes for different styles (will be adjusted by user volume)
                    style_base_gains = {
                        ConversationStyle.PODCAST: -25,      # Professional - subtle
                        ConversationStyle.CASUAL: -20,       # Cafe - slightly more present  
                        ConversationStyle.DEBATE: -28,       # Conference - minimal
                        ConversationStyle.INTERVIEW: -23,    # Office - subtle
                        ConversationStyle.NATURAL: -22,      # Home - cozy
                        ConversationStyle.FORMAL: -27,       # Professional - minimal
                        ConversationStyle.DRAMATIC: -18      # Dramatic - more present
                    }
                    
                    base_gain = style_base_gains.get(conversation_style, -25)
                    
                    # Apply user volume adjustment (10-100 scale -> ±15dB adjustment)
                    volume_adjustment = (background_sound_volume - 50) * 0.3  # ±15dB range
                    final_gain = base_gain + volume_adjustment
                    
                    # Ensure we don't go too loud (max -5dB) or too quiet (min -50dB)
                    final_gain = max(-50, min(-5, final_gain))
                    
                    background = background.apply_gain(final_gain)
                    
                    # Ensure background is exactly the same length as conversation
                    if len(background) > conversation_duration_ms:
                        background = background[:conversation_duration_ms]
                    elif len(background) < conversation_duration_ms:
                        # Loop background if needed
                        repetitions_needed = (conversation_duration_ms // len(background)) + 1
                        extended_background = background * repetitions_needed
                        background = extended_background[:conversation_duration_ms]
                    
                    # Mix the background with the conversation
                    final_audio = final_audio.overlay(background)
                    
                    logger.info(f"🎵 Added continuous {conversation_style.value} background ambience ({conversation_duration_ms/1000:.1f}s, vol: {background_sound_volume}%, gain: {final_gain:.1f}dB)")
                    
                except ImportError:
                    logger.warning("Background sound generator not available for final mixing")
                except Exception as bg_error:
                    logger.warning(f"Failed to add background to final conversation: {bg_error}")
                
            # Export final audio
            buffer = io.BytesIO()
            final_audio.export(buffer, format="wav")
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to mix conversation audio: {e}")
            raise

    async def _calculate_audio_duration(self, audio_data: bytes) -> float:
        """Calculate the duration of audio data"""
        try:
            from pydub import AudioSegment
            import io
            
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            return len(audio) / 1000.0  # Convert ms to seconds
            
        except Exception as e:
            logger.warning(f"Failed to calculate audio duration: {e}")
            return 0.0

    def _calculate_interaction_complexity(self, segments: List[ConversationSegment]) -> float:
        """Calculate how complex/interactive the conversation is (0-1 score)"""
        
        if len(segments) < 2:
            return 0.0
            
        # Factors that increase complexity:
        # - Speaker changes
        # - Emotional variety
        # - Question/answer patterns
        # - Interruptions and reactions
        
        speaker_changes = 0
        emotions_used = set()
        questions = 0
        short_responses = 0  # Likely interruptions/reactions
        
        previous_speaker = None
        
        for segment in segments:
            if previous_speaker and segment.speaker != previous_speaker:
                speaker_changes += 1
            
            emotions_used.add(segment.emotion)
            
            if '?' in segment.text:
                questions += 1
                
            if len(segment.text.split()) < 5:  # Short responses
                short_responses += 1
                
            previous_speaker = segment.speaker
        
        # Calculate complexity score
        speaker_variety = speaker_changes / len(segments)
        emotion_variety = len(emotions_used) / len(EmotionType)
        interaction_density = (questions + short_responses) / len(segments)
        
        complexity = (speaker_variety + emotion_variety + interaction_density) / 3
        return min(1.0, complexity)  # Cap at 1.0

    async def get_conversation_analytics(self) -> Dict[str, Any]:
        """Get analytics about generated conversations"""
        
        return {
            "total_conversations": len(self.conversation_history),
            "average_duration": np.mean([s.pause_after + s.pause_before for s in self.conversation_history]) if self.conversation_history else 0,
            "emotion_distribution": self._calculate_emotion_stats(),
            "speaker_statistics": self._calculate_speaker_stats(),
            "conversation_styles_used": self._get_style_usage_stats()
        }

    def _calculate_emotion_stats(self) -> Dict[str, float]:
        """Calculate emotion usage statistics"""
        if not self.conversation_history:
            return {}
            
        emotion_counts = {}
        for segment in self.conversation_history:
            emotion = segment.emotion.value
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
        total = len(self.conversation_history)
        return {emotion: count/total for emotion, count in emotion_counts.items()}

    def _calculate_speaker_stats(self) -> Dict[str, Any]:
        """Calculate speaker usage statistics"""
        speaker_stats = {}
        
        for speaker_name, profile in self.speaker_profiles.items():
            speaker_segments = [s for s in self.conversation_history if s.speaker == speaker_name]
            
            speaker_stats[speaker_name] = {
                "segments": len(speaker_segments),
                "average_speech_rate": profile.speaking_rate,
                "dominant_emotion": self._get_dominant_emotion_for_speaker(speaker_segments),
                "interruption_tendency": profile.interruption_likelihood
            }
            
        return speaker_stats

    def _get_dominant_emotion_for_speaker(self, segments: List[ConversationSegment]) -> str:
        """Get the most common emotion for a speaker"""
        if not segments:
            return "neutral"
            
        emotion_counts = {}
        for segment in segments:
            emotion = segment.emotion.value
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
        return max(emotion_counts, key=emotion_counts.get)

    def _get_style_usage_stats(self) -> Dict[str, int]:
        """Get conversation style usage statistics"""
        # This would be tracked in a real implementation
        return {
            "natural": 0,
            "interview": 0, 
            "debate": 0,
            "podcast": 0,
            "casual": 0,
            "formal": 0,
            "dramatic": 0
        }

    def clear_conversation_history(self):
        """Clear conversation history and reset analytics"""
        self.conversation_history.clear()
        self.speaker_profiles.clear()
        logger.info("🧹 Conversation history cleared")