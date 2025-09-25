# 🎭 Voice Cloning Studio Guide

**Create Custom AI Voices with VibeVoice-Large Technology**

The Ultimate Voice Bridge now includes a professional Voice Cloning Studio that allows you to create custom AI voices using your own voice samples. This guide covers everything you need to know about creating, training, and testing voice clones.

## 🚀 Quick Start

### Access the Voice Clone Studio
1. **Open**: http://localhost:3000
2. **Navigate**: Click on "🎭 Voice Clone Studio" from the navigation
3. **Create**: Start with "Create New Clone" to begin your voice cloning journey

### Basic Workflow
```
Create Voice Clone → Record/Import Audio → Auto-transcribe → Train → Test
```

## 🎯 Features Overview

### ✨ **Professional Interface**
- **Drag & Drop Audio Import**: Support for WAV, FLAC, and MP3 files
- **Real-time Waveform Visualization**: See your audio in professional waveform editor
- **Advanced Trimming Tools**: Precise audio editing with visual feedback
- **Auto-transcription**: Whisper STT automatically transcribes your audio
- **Backend Synchronization**: Seamless integration with VibeVoice-Large model

### 🎤 **Audio Processing**
- **Multiple Input Methods**: 
  - Microphone recording with real-time visualization
  - File upload with drag & drop support
  - Audio trimming and editing tools
- **Supported Formats**: WAV, FLAC, MP3 (2 seconds to 5 minutes)
- **Quality Optimization**: Automatic audio enhancement for voice cloning
- **File Size Limits**: Up to 50MB per audio file

### 🧠 **VibeVoice-Large Integration**
- **State-of-the-art Voice Synthesis**: 7B parameter model for ultra-realistic voices
- **GPU Acceleration**: RTX 5090 optimization for fast training and inference
- **Real-time Testing**: Instant voice clone generation and playback
- **Quality Metrics**: Processing time and success feedback

## 📋 Step-by-Step Guide

### 1. Create a New Voice Clone

1. **Click "Create New Clone"** in the Voice Clone Studio
2. **Enter Details**:
   - **Name**: Give your voice clone a memorable name (e.g., "My Professional Voice")
   - **Description**: Brief description of the voice's purpose (optional)
3. **Click "Create Clone"** to initialize

### 2. Record or Import Audio

#### Option A: Record with Microphone
1. **Click the red record button** to start recording
2. **Speak clearly** into your microphone (at least 10 seconds recommended)
3. **Click stop** when finished
4. **Preview** your recording with the play button

#### Option B: Import Audio File
1. **Drag & drop** an audio file into the drop zone
2. **Or click "Select Audio File"** to browse files
3. **Supported formats**: WAV, FLAC, MP3
4. **File requirements**: 2 seconds to 5 minutes, max 50MB

### 3. Audio Editing (For Imported Files)

When you import a file, the **Advanced Audio Editor** appears:

#### Waveform Editor Features:
- **Visual Waveform**: See your audio represented as a waveform
- **Trim Controls**: Drag sliders or click on waveform to set start/end points
- **Quick Trim Buttons**:
  - "First 10s": Select first 10 seconds
  - "Last 10s": Select last 10 seconds  
  - "Middle 10s": Select middle 10 seconds
  - "Full Audio": Select entire audio
- **Precise Controls**: Enter exact timestamps for precise trimming
- **Preview Selection**: Play only your selected portion before finalizing

### 4. Auto-Transcription

The system automatically transcribes your audio using Whisper STT:

1. **Automatic Process**: Transcription starts immediately for imported files
2. **Manual Trigger**: Click "Transcribe Audio with Whisper" if needed
3. **Edit Transcript**: Review and edit the generated transcript
4. **Quality Impact**: Accurate transcripts improve voice clone quality significantly

#### Transcription Tips:
- **Speak Clearly**: Clear pronunciation improves transcription accuracy
- **Avoid Background Noise**: Quiet environment for best results
- **Review Text**: Always check and correct the generated transcript
- **Manual Entry**: You can type transcripts manually if auto-transcription fails

### 5. Train Your Voice Clone

1. **Add Sample Name**: Give your voice sample a descriptive name
2. **Verify Transcript**: Ensure the transcript matches your audio exactly
3. **Click "Add Sample"**: This submits your audio to VibeVoice-Large for training
4. **Wait for Processing**: The backend will train your voice clone
5. **Success Confirmation**: You'll see processing time and success message

### 6. Test Your Voice Clone

Once trained and synced with the backend:

1. **Click "Test Voice"** button
2. **Automatic Text Generation**: System generates test text using your voice clone
3. **Real-time Playback**: Generated audio plays automatically
4. **Quality Assessment**: Listen to how well your voice has been cloned

## 🎯 Best Practices

### 📢 **Recording Quality**
- **Quiet Environment**: Record in a quiet room without echo
- **Good Microphone**: Use a quality microphone for best results
- **Consistent Distance**: Maintain consistent distance from microphone
- **Natural Speech**: Speak naturally, not too fast or slow
- **Clear Pronunciation**: Articulate words clearly

### ⏱️ **Audio Duration**
- **Minimum**: At least 10 seconds for reasonable quality
- **Optimal**: 30-60 seconds for best results
- **Maximum**: Up to 5 minutes supported
- **Multiple Samples**: Consider creating multiple voice samples for better quality

### 📝 **Transcript Accuracy**
- **Exact Match**: Transcript should exactly match what's spoken
- **Punctuation**: Include proper punctuation for natural synthesis
- **Numbers/Dates**: Write out numbers as words ("twenty-five" not "25")
- **Contractions**: Use natural contractions ("I'm" not "I am")

### 🎤 **Voice Content**
- **Varied Speech**: Include different emotions and speaking styles
- **Complete Sentences**: Use full sentences rather than fragments
- **Natural Flow**: Speak conversationally, not like reading a script
- **Personality**: Let your natural speaking personality come through

## 🔧 Technical Details

### System Requirements
- **GPU**: RTX 5090 with 32GB VRAM (recommended for VibeVoice-Large)
- **RAM**: At least 16GB system RAM
- **Storage**: SSD recommended for audio processing
- **Network**: Stable connection for backend communication

### Audio Specifications
- **Input Formats**: WAV, FLAC, MP3
- **Sample Rate**: 16kHz to 48kHz (automatically optimized)
- **Bit Depth**: 16-bit or 24-bit
- **Channels**: Mono or Stereo (converted to mono for processing)
- **Duration**: 2 seconds to 5 minutes per sample

### Backend Integration
- **API Endpoint**: `/api/v1/voice-clone` for training
- **Test Endpoint**: `/api/v1/voice-clone/test` for testing
- **List Endpoint**: `/api/v1/voice-clones` for management
- **Synchronization**: Automatic frontend-backend sync for voice clone IDs

## 🚨 Troubleshooting

### Common Issues

#### "Voice clone is not synced with backend"
- **Cause**: Voice clone wasn't successfully created on backend
- **Solution**: Try re-creating the voice sample or check backend connection

#### "Auto-transcription failed"
- **Cause**: Audio quality too poor or backend STT service unavailable
- **Solution**: Manually enter transcript or improve audio quality

#### "Invalid audio file format"
- **Cause**: Unsupported file format or corrupted file
- **Solution**: Convert to WAV, FLAC, or MP3 format

#### "File too large"
- **Cause**: Audio file exceeds 50MB limit
- **Solution**: Compress audio or reduce duration

### Performance Issues

#### Slow Processing
- **Check GPU**: Ensure RTX 5090 is properly configured
- **Memory**: Monitor VRAM usage during processing
- **Network**: Check connection to backend server

#### Poor Voice Quality
- **Improve Audio**: Use higher quality recording equipment
- **Better Transcript**: Ensure transcript exactly matches speech
- **Longer Samples**: Use 30+ second audio samples
- **Multiple Samples**: Create several voice samples for better training

## 🔮 Advanced Features

### Voice Clone Management
- **Edit Voice Clones**: Modify existing voice clone details
- **Delete Voice Clones**: Remove unwanted voice clones
- **Quality Metrics**: View average quality scores
- **Backend Status**: Monitor sync status with backend

### Audio Editor Advanced
- **Precise Trimming**: Enter exact timestamps for cuts
- **Waveform Navigation**: Click anywhere on waveform to set points
- **Quality Indicators**: Visual feedback on selection quality
- **Preview Controls**: Test your selection before finalizing

### Integration Features
- **API Access**: Programmatic voice clone creation and testing
- **Batch Processing**: Multiple audio files (planned feature)
- **Export Options**: Voice clone model export (planned feature)

## 📊 Quality Guidelines

### Excellent Quality (90%+)
- ✅ 30+ seconds of clear audio
- ✅ Perfect transcript match
- ✅ Quiet recording environment
- ✅ Natural, expressive speech
- ✅ Good microphone quality

### Good Quality (70-89%)
- ✅ 15+ seconds of audio
- ✅ Mostly accurate transcript
- ✅ Some background noise acceptable
- ✅ Clear pronunciation

### Fair Quality (50-69%)
- ⚠️ 10+ seconds of audio
- ⚠️ Basic transcript accuracy
- ⚠️ Moderate background noise
- ⚠️ Understandable speech

### Poor Quality (<50%)
- ❌ Less than 10 seconds
- ❌ Inaccurate or missing transcript
- ❌ High background noise
- ❌ Unclear pronunciation

## 🎯 Use Cases

### Personal Voice Clones
- **Accessibility**: Create your voice for assistive technology
- **Content Creation**: Generate narration in your own voice
- **Language Learning**: Practice pronunciation with familiar voice
- **Digital Legacy**: Preserve your voice for future generations

### Professional Applications
- **Corporate Training**: Consistent voice for training materials
- **Brand Voice**: Create consistent brand voice across content
- **Podcast Production**: Generate consistent intro/outro segments
- **Audio Books**: Narrate books in consistent voice style

### Creative Projects
- **Character Voices**: Create unique character voices for stories
- **Voice Acting**: Develop different voice personas
- **Music Production**: Create vocal elements for music
- **Game Development**: Generate NPC voices and dialogue

## 🔗 API Reference

### Voice Clone Creation
```http
POST /api/v1/voice-clone
Content-Type: multipart/form-data

name: string (required)
transcript: string (required) 
audio: file (required)
description: string (optional)
```

### Voice Clone Testing
```http
POST /api/v1/voice-clone/test
Content-Type: multipart/form-data

voice_id: string (required)
text: string (required)
```

### List Voice Clones
```http
GET /api/v1/voice-clones
```

## 📞 Support

### Getting Help
- **Documentation**: Check this guide and README.md
- **GitHub Issues**: Report bugs and request features
- **Community**: Join discussions about voice cloning

### Common Resources
- **VibeVoice Documentation**: Model-specific information
- **Whisper STT**: Auto-transcription details
- **Audio Processing**: Technical audio guidelines

---

**Happy Voice Cloning! 🎭✨**

Transform your voice into AI-powered speech synthesis with the Ultimate Voice Bridge Voice Cloning Studio.