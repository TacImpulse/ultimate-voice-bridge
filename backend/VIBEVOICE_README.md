# VibeVoice Integration for Ultimate Voice Bridge

This integration adds powerful long-form, multi-speaker conversational TTS capabilities to your voice bridge using the community-maintained VibeVoice implementation.

## 🎙️ Features

### Core VibeVoice Capabilities
- **Ultra-realistic speech synthesis** with natural intonation and emotion
- **Multi-speaker conversations** with up to 4 distinct voices
- **Long-form audio generation** up to 90 minutes
- **Voice cloning** through voice sample prompts
- **Natural turn-taking** in conversations
- **Spontaneous background music and sounds** (emergent behavior)
- **Cross-lingual support** (English and Chinese)

### Integration Features
- **Seamless API integration** alongside existing Edge-TTS
- **Multiple TTS engine support** (VibeVoice, Dia TTS, Orpheus TTS, llm-tts)
- **Auto-detection** of multi-speaker scripts
- **Voice profile management** with quality levels
- **Conversation parsing** and audio concatenation
- **Flexible output formats** (WAV, MP3)

## 📦 Installation

### 1. Install VibeVoice Community Package

The community version of VibeVoice is already cloned and installed in your backend:

```bash
cd vibevoice-community
pip install -e .
```

### 2. Download Pre-trained Models

The service will automatically download models from Hugging Face:

- **VibeVoice-1.5B**: `vibevoice/VibeVoice-1.5B` (recommended for most use cases)
- **VibeVoice-7B**: `vibevoice/VibeVoice-7B` (higher quality, requires more GPU memory)

### 3. Optional: Add Voice Samples

Place custom voice samples in `vibevoice-community/demo/voices/` for voice cloning:

```
vibevoice-community/demo/voices/
├── alice.wav
├── andrew.wav
├── frank.wav
└── your_custom_voice.wav
```

## 🚀 Usage

### Basic TTS with VibeVoice

```python
import requests

# Use VibeVoice for high-quality TTS
response = requests.post("http://localhost:8000/api/v1/tts", json={
    "text": "Hello! This is VibeVoice speaking with natural intonation and emotion.",
    "voice": "vibevoice_vibevoice-alice",
    "speed": 1.0,
    "emotion": "friendly"
})

with open("output.wav", "wb") as f:
    f.write(response.content)
```

### Multi-Speaker Conversations

```python
# Create a podcast-style conversation
conversation_script = """
Speaker 1: Welcome to our AI podcast! Today we're discussing the future of voice synthesis.
Speaker 2: Thanks for having me! VibeVoice represents a major breakthrough in conversational AI.
Speaker 1: What makes it so special compared to traditional TTS systems?
Speaker 2: The key is its ability to maintain natural flow and emotion across long conversations.
"""

response = requests.post("http://localhost:8000/api/v1/vibevoice-conversation", json={
    "script": conversation_script,
    "speaker_voices": {
        "Speaker 1": "vibevoice_vibevoice-alice",
        "Speaker 2": "vibevoice_vibevoice-andrew"
    },
    "output_format": "wav"
})
```

### Available Voice Options

Get the full list of available voices:

```python
response = requests.get("http://localhost:8000/api/v1/vibevoice-voices")
voices = response.json()
```

**Built-in VibeVoice Voices:**
- `vibevoice_vibevoice-alice`: Expressive female voice, great for conversations
- `vibevoice_vibevoice-andrew`: Confident male voice, ideal for narration  
- `vibevoice_vibevoice-large-alice`: Ultra-high quality Alice (7B model)

### Voice-to-LLM with VibeVoice Response

```python
# Complete voice pipeline with VibeVoice TTS
with open("input_audio.wav", "rb") as audio_file:
    # 1. Voice to LLM
    response = requests.post("http://localhost:8000/api/v1/voice-to-llm", 
                           files={"audio": audio_file},
                           data={"model": "default"})
    
    llm_response = response.json()["llm_response"]["text"]
    
    # 2. LLM response to VibeVoice speech
    tts_response = requests.post("http://localhost:8000/api/v1/tts", json={
        "text": llm_response,
        "voice": "vibevoice_vibevoice-alice"
    })
```

## 🎛️ API Endpoints

### New VibeVoice Endpoints

#### `POST /api/v1/vibevoice-conversation`
Create multi-speaker conversations

**Request:**
```json
{
    "script": "Speaker 1: Hello!\nSpeaker 2: Hi there!",
    "speaker_voices": {
        "Speaker 1": "vibevoice_vibevoice-alice",
        "Speaker 2": "vibevoice_vibevoice-andrew"  
    },
    "output_format": "wav"
}
```

#### `GET /api/v1/vibevoice-voices`
Get available VibeVoice voices

**Response:**
```json
{
    "status": "success",
    "voices": {
        "vibevoice-alice": {
            "name": "Alice",
            "engine": "vibevoice-1.5b",
            "quality": "high",
            "description": "Expressive female voice",
            "multi_speaker_capable": true
        }
    }
}
```

### Enhanced Existing Endpoints

#### `POST /api/v1/tts` (Enhanced)
Now supports VibeVoice voices with `vibevoice_` prefix:

```json
{
    "text": "Your text here",
    "voice": "vibevoice_vibevoice-alice",
    "speed": 1.0,
    "emotion": "friendly"
}
```

## 🎨 Advanced Features

### Script Parsing
The service automatically detects multi-speaker scripts with these formats:
- `Speaker 1:`, `Speaker 2:`, etc.
- `[S1]`, `[S2]`, etc.
- `Host:`, `Guest:`, `Interviewer:`, `Interviewee:`

### Voice Cloning
Add custom voice samples to clone specific voices:
1. Place 10-30 second voice samples in `demo/voices/`
2. Use the filename (without extension) as the speaker name
3. VibeVoice will clone the voice characteristics

### Background Music & Sounds
VibeVoice may spontaneously generate:
- Background music for introductory content
- Natural sounds like breathing, coughs, laughter
- Ambient audio that fits the context

This is an emergent behavior that adds realism to conversations.

## 🔧 Configuration

### Device Support
- **CUDA**: Best performance with flash_attention_2
- **MPS** (Apple Silicon): Good performance with SDPA attention
- **CPU**: Basic support (slower generation)

### Memory Requirements
- **VibeVoice-1.5B**: ~8GB GPU memory
- **VibeVoice-7B**: ~16GB GPU memory

### Quality Settings
- `low`: Fast generation, basic quality
- `medium`: Balanced speed/quality  
- `high`: Slower generation, better quality
- `ultra`: Best quality (7B model required)

## 🚨 Important Notes

### Responsible Use
VibeVoice can create very realistic synthetic speech. Please:
- ✅ Disclose when audio is AI-generated
- ✅ Obtain consent before cloning voices
- ✅ Use for legitimate purposes only
- ❌ Don't create deepfakes or misleading content
- ❌ Don't impersonate real people without permission

### Performance Tips
- Use **VibeVoice-1.5B** for most applications (good quality, faster)
- Use **VibeVoice-7B** for critical quality applications
- Chunk very long texts (>1000 words) for better results
- Use English punctuation even for Chinese text
- Provide clear speaker transitions in scripts

### Known Limitations
- English and Chinese only
- Occasional instability with Chinese text
- No direct control over background music
- May generate unexpected sounds in some contexts
- Processing time increases significantly with length

## 📊 Comparison with Other Engines

| Feature | VibeVoice | Edge-TTS | Dia TTS* | Orpheus TTS* |
|---------|-----------|----------|----------|--------------|
| Quality | Ultra | High | Ultra | High |
| Speed | Slow | Fast | Medium | Medium |
| Multi-speaker | ✅ | ❌ | ✅ | Limited |
| Long-form | ✅ | Limited | ✅ | Limited |
| Voice Cloning | ✅ | ❌ | ✅ | ✅ |
| Local/Offline | ✅ | ❌ | ✅ | ✅ |
| Emotion Control | Natural | Limited | High | High |

*\* Integration planned but not yet implemented*

## 🛠️ Troubleshooting

### Common Issues

**1. "VibeVoice not available" error**
```bash
cd vibevoice-community
pip install -e .
```

**2. CUDA out of memory**
- Use VibeVoice-1.5B instead of 7B
- Reduce batch size or text length
- Clear GPU cache between generations

**3. Slow generation**
- Ensure GPU is being used (`torch.cuda.is_available()`)
- Check device allocation in logs
- Consider using smaller model for speed

**4. Audio quality issues**
- Use appropriate sample rate (24kHz recommended)
- Ensure voice samples are clear and noise-free
- Try different CFG scale values (1.0-2.0)

### Debugging

Enable debug logging to see detailed processing information:

```python
import logging
logging.getLogger('vibevoice').setLevel(logging.DEBUG)
```

## 📚 Examples

Run the comprehensive examples:

```bash
cd examples
python vibevoice_examples.py
```

This will generate:
- Basic TTS samples
- Multi-speaker conversations
- Long-form content
- Voice pipeline demonstrations

## 🔄 Updates and Roadmap

### Current Version
- ✅ VibeVoice community integration
- ✅ Multi-speaker conversations
- ✅ Voice cloning support
- ✅ API endpoints and examples

### Planned Updates
- [ ] Dia TTS integration
- [ ] Orpheus TTS integration  
- [ ] Higgs Audio v2 support
- [ ] Real-time streaming TTS
- [ ] Advanced voice mixing
- [ ] Custom voice training

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional TTS engine integrations
- Voice quality optimization
- Performance improvements
- Documentation and examples
- Bug fixes and testing

## 📄 License

This integration is provided under the MIT License, consistent with the VibeVoice community project.

---

**Happy voice synthesis! 🎙️✨**