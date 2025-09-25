# 🎙️ Ultimate Voice Bridge

> **Production-Ready v5.0 - RTX 5090 GPU Edition** - Professional voice-to-LLM bridge with RTX 5090 GPU acceleration, VibeVoice integration, and ONNX Runtime optimization

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)

A professional-grade voice processing application that seamlessly bridges Speech-to-Text, Large Language Models, and Text-to-Speech with **comprehensive audio controls**, **primary file selection**, and **industry-standard user experience**.

## 🚀 What's New in v5.0 - RTX 5090 GPU Edition

### 🔥 **RTX 5090 GPU Acceleration**
- **🎨 ONNX Runtime GPU**: TensorRT and CUDA execution providers for maximum performance
- **🚀 7-11x Faster Voice Processing**: RTX 5090's 32GB VRAM fully utilized
- **🧠 Flash Attention 2**: Advanced GPU kernels for efficient attention computation
- **🎯 CuPy Integration**: Custom CUDA kernels for specialized operations
- **🔧 Windows-Optimized**: Full compatibility with Windows 11 and PowerShell
- **📊 Performance Monitoring**: Real-time GPU utilization and memory usage

### 🎤 **VibeVoice Large Model Integration & Voice Cloning Studio**
- **🎧 Ultra-High Quality TTS**: State-of-the-art voice synthesis with 7B parameter model
- **🎭 Custom Voice Cloning**: Professional Voice Clone Studio with drag & drop interface
- **🎙️ Auto-Transcription**: Whisper STT automatically transcribes training audio
- **🔄 Real-time Voice Testing**: Instant voice clone generation and playback
- **🎵 Advanced Audio Editor**: Waveform visualization, trimming, and preview tools
- **🎯 Backend Sync**: Seamless frontend-backend voice clone synchronization
- **📱 GPU-Accelerated Inference**: VibeVoice running on RTX 5090 for real-time generation
- **🔊 Extended Story Support**: 2000+ token support for long-form narratives
- **🌍 Multi-Language Support**: Advanced pronunciation and accent modeling

### 🔧 **Professional Development Tools**
- **🛠️ One-Click GPU Setup**: `setup_rtx5090.bat` installs all dependencies automatically
- **🚀 Performance Launcher**: `launch_rtx5090_gpu.bat` with optimized environment variables
- **📊 Benchmarking Suite**: Comprehensive performance testing for all GPU components
- **🔍 Debug Utilities**: GPU memory tracking, CUDA version verification, and compatibility checks
- **📄 Professional Documentation**: Complete setup guides and troubleshooting resources

## 🚀 What's New in v4.0 - Professional Edition (Legacy Features)

### ✨ **Professional Audio Controls**
- **🎵 Full Playback Control**: Play/pause, seek bar, volume slider, and speed control (0.75x-2x)
- **⏭️ Skip Navigation**: 10-second forward/back with visual feedback and time display
- **🛑 Immediate Stop Control**: Cancel processing and audio playback instantly
- **⌨️ Keyboard Shortcuts**: Spacebar (play/pause), Esc (stop), Arrow keys (skip)

### 🎯 **Primary File Selection & Verification**
- **🖼️ Image Thumbnails**: Visual preview of uploaded images before processing
- **🎯 Primary File Designation**: Radio buttons to select which file is the main focus
- **🔄 File Reordering**: Move files up/down with arrow controls
- **🎬 Per-File Quick Actions**: "Ask about this" buttons for individual file analysis
- **✅ Processing Verification**: See exactly which files were processed

### 🎤 **Voice-First Workflow Enhancement**
- **🎙️ Speech-to-Text for Text Input**: Microphone button in text area for voice prompts
- **🔗 Seamless Integration**: Speak "describe this image" while uploading files
- **📝 Smart Text Appending**: Spoken text automatically appends to typed text
- **🎯 Context Preservation**: Maintains conversation flow between voice and text

### 🛡️ **Professional Error Handling & Recovery**
- **🔄 Automatic Retry Logic**: Network failures retry up to 2 times with backoff
- **📋 Categorized Error Messages**: Network, server, format, and connection-specific errors
- **🎯 Status Indicators**: Real-time connection status and processing feedback
- **📊 Progress Tracking**: Clear visual feedback on current operation status

### ⌨️ **Complete Keyboard Shortcuts System**
- **Spacebar**: Play/pause audio playback
- **Escape**: Stop/cancel all operations
- **Ctrl+R**: Toggle voice recording
- **Ctrl+S**: Stop processing
- **Ctrl+Enter**: Process input (in text areas)
- **Arrow Left/Right**: Skip audio back/forward (when playing)

## 🔥 Core Features

### 🎤 **Advanced Voice Processing**
- **Real-time Audio Visualization**: 20-bar dynamic frequency display with extreme sensitivity
- **Professional Recording**: 16kHz WebM/Opus with noise suppression and echo cancellation
- **Live Transcription**: Real-time STT display during recording with confidence scores
- **TTS Replay System**: Re-synthesize and replay any AI response on demand
- **Voice Activity Detection**: Automatic silence trimming and audio enhancement

### 🤖 **Intelligent LLM Integration**
- **Multi-Model Support**: 17+ LM Studio models with dynamic switching
- **Enhanced Metadata**: Processing times, token counts, and full AI reasoning display
- **Request Management**: Cancel operations mid-processing with AbortController
- **Model Persistence**: Remembers preferred models across sessions
- **Error Recovery**: Comprehensive error handling and user feedback

### 📁 **Advanced Multimodal File Processing**
- **Drag & Drop Upload**: Visual feedback and multi-file support with thumbnails
- **Primary File Selection**: Designate which file is the main focus for AI analysis
- **File Management**: Reordering, individual removal, size validation (50MB limit)
- **Comprehensive Formats**: Images (JPG, PNG, GIF, WebP), Documents (PDF, Word, Excel), Audio/Video, Code files
- **Processing Verification**: Backend confirms which files were processed

### 📚 **Rich Conversation Management**
- **Persistent History**: Stores last 50 conversations with full metadata
- **Export Functionality**: JSON export with conversation data
- **Statistics Dashboard**: Token usage, processing times, conversation counts
- **AI Reasoning Display**: Expandable thought process for transparency
- **Replay Controls**: TTS replay for any historical response

### 🎨 **Professional UI/UX**
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion transitions and micro-interactions
- **Visual Status Feedback**: Connection status, processing indicators, file verification
- **Accessibility First**: ARIA labels, keyboard navigation, screen reader support
- **Settings Panel**: Theme selection, audio preferences, shortcuts customization

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • WebSocket     │    │ • STT (Whisper) │
│ • TypeScript    │    │ • Rate Limiting │    │ • LLM Bridge    │
│ • Audio Controls│    │ • File Handling │    │ • TTS (Coqui)   │
│ • File Preview  │    │ • Error Recovery│    │ • Voice Clone   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌─────────┐              ┌─────────┐          ┌─────────────┐
    │ Browser │              │  Redis  │          │ GPU Cluster │
    │  APIs   │              │ Session │          │   (CUDA)    │
    └─────────┘              └─────────┘          └─────────────┘
```

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14 + TypeScript | Modern React framework with professional UI controls |
| **Backend** | FastAPI + Python 3.9+ | High-performance async API with file handling |
| **STT Engine** | OpenAI Whisper | State-of-the-art speech recognition |
| **LLM** | LM Studio / OpenAI / Anthropic | Flexible LLM integration with model switching |
| **TTS Engine** | Edge TTS + Voice Cloning | Professional voice synthesis |
| **Audio Processing** | Web Audio API | Real-time audio visualization and controls |
| **File Processing** | FormData + Thumbnails | Multimodal file handling with preview |
| **UI Framework** | Tailwind CSS + Framer Motion | Responsive design with smooth animations |

## 🚀 Quick Start

### 🔥 RTX 5090 GPU Quick Start (Windows)
1. **Clone the repository**
   ```bash
   git clone https://github.com/TacImpulse/ultimate-voice-bridge.git
   cd ultimate-voice-bridge
   ```
2. **One-Click GPU Setup**
   ```bash
   # Double-click this file to install everything
   setup_rtx5090.bat
   ```
3. **Launch with GPU Acceleration**
   ```bash
   # Double-click this file for maximum performance
   launch_rtx5090_gpu.bat
   ```
4. **Verify GPU Acceleration**: Look for "RTX 5090 GPU acceleration active" in the console! 🚀

### 🖥️ Standard Quick Start (Windows)
1. **Clone the repository**
   ```bash
   git clone https://github.com/TacImpulse/ultimate-voice-bridge.git
   cd ultimate-voice-bridge
   ```
2. **Create Desktop Shortcut**
   - Right-click on `launch_voice_bridge.bat`
   - Select "Send to" → "Desktop (create shortcut)"
3. **Double-click your shortcut** – Everything starts automatically! 🎆

### Prerequisites
- **Node.js 18+** and npm 9+
- **Python 3.9+** and pip
- **LM Studio** (for local LLM models)
- **CUDA Toolkit** (optional, for GPU acceleration)

### 1. Clone & Setup
```bash
git clone https://github.com/TacImpulse/ultimate-voice-bridge.git
cd ultimate-voice-bridge

# Install all dependencies
npm run setup
```

### 2. Configure Environment
Edit `.env` file with your API keys:
```env
# Required for cloud LLM services
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional: Use local LM Studio instead
LM_STUDIO_BASE_URL=http://localhost:1234/v1
```

### 3. Run Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start individually:
# Terminal 1: Backend (port 8001)
cd backend && python main.py

# Terminal 2: Frontend (port 3000)  
cd frontend && npm run dev
```

### 4. 🎤 Start Using the Voice Bridge
1. **Open**: http://localhost:3000
2. **Choose Your Experience**:
   - **🎤 Voice Recorder**: Traditional voice-to-text-to-voice workflow
   - **🎭 Voice Clone Studio**: Create and test custom AI voices
3. **Voice Recorder Features**:
   - Select Model: Choose your preferred LLM from the dropdown
   - Upload Files: Drag & drop images/documents, set primary file
   - Voice Input: Use 🎤 button in text area or main voice recorder
   - Process: Click "Process with AI" and enjoy full audio controls
4. **Voice Clone Studio Features**:
   - Create New Voice Clone: Give it a name and description
   - Record/Import Audio: Use microphone or drag & drop audio files (WAV, FLAC, MP3)
   - Auto-transcribe: Whisper STT automatically transcribes your audio
   - Advanced Editor: Trim audio with waveform visualization and precise controls
   - Train Voice: Submit to VibeVoice-Large for voice clone creation
   - Test Voice: Generate speech using your custom AI voice
5. **Control**: Use spacebar, escape, and audio controls as needed

## 📱 Usage Guide

### 🎯 **Professional Workflow**
1. **File Upload & Selection**:
   - Drag & drop multiple files
   - See image thumbnails immediately
   - Use radio buttons to set primary file
   - Reorder files with up/down arrows

2. **Voice-First Input**:
   - Click 🎤 in text area to speak prompts
   - Use main recorder for longer conversations
   - Text and voice seamlessly combine

3. **Audio Control Mastery**:
   - **Spacebar**: Play/pause any TTS audio
   - **Arrow keys**: Skip forward/back during playback
   - **Seek bar**: Jump to any position in audio
   - **Volume/Speed**: Adjust playback to your preference

4. **Error Recovery**:
   - Network failures automatically retry
   - **Escape**: Cancel any stuck operation
   - Clear status indicators show what's happening

### 🎛️ **Keyboard Shortcuts Reference**
| Shortcut | Action | Context |
|----------|--------|---------|
| **Spacebar** | Play/pause audio | When audio is available |
| **Escape** | Stop/cancel all | Global |
| **Ctrl+R** | Toggle recording | Global |
| **Ctrl+S** | Stop processing | Global |
| **Ctrl+Enter** | Process input | Text areas |
| **← / →** | Skip audio ±10s | During playback |

### 🔧 **File Processing Tips**
- **Primary files** are highlighted with purple borders
- Use **"Ask about this"** for individual file analysis
- **Thumbnails** show exactly what image will be processed
- **File verification** confirms backend processed correct files

## 🎛️ Configuration

### Settings Panel
Access via the settings button in the interface:
- **Theme Selection**: Light/dark mode preferences
- **Audio Settings**: Input/output device selection
- **Voice Options**: TTS voice and quality settings
- **Keyboard Shortcuts**: Customize hotkey bindings
- **Privacy Settings**: Data retention and privacy controls

### Environment Variables
```env
# LLM Configuration
LM_STUDIO_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here

# Audio Settings
MAX_RECORDING_DURATION=300
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1

# File Upload Limits
MAX_FILE_SIZE=52428800  # 50MB
MAX_FILES_PER_REQUEST=5

# UI Configuration
DEFAULT_THEME=auto
ENABLE_ANIMATIONS=true
SHOW_DEBUG_INFO=false
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Frontend tests
cd frontend && npm test

# Backend tests  
cd backend && pytest

# Integration tests
npm run test:integration

# Performance benchmarks
npm run benchmark
```

## 📊 Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **STT Latency** | <200ms | RTX 5090 GPU acceleration |
| **LLM Response** | 1-3s | Depends on model and complexity |
| **TTS Generation** | <1s | Edge TTS optimized |
| **File Processing** | <5s | 50MB limit per file |
| **Audio Controls** | <50ms | Real-time responsiveness |

## 🎯 Roadmap

### 🔄 **Recently Added**
- [x] **Voice Cloning Studio** - ✅ Complete custom voice generation and cloning
- [x] **VibeVoice-Large Integration** - ✅ Professional-grade voice synthesis
- [x] **Auto-transcription** - ✅ Whisper STT for voice training data
- [x] **Advanced Audio Editor** - ✅ Waveform editing with drag & drop
- [x] **Voice Clone Testing** - ✅ Real-time voice clone generation and playback
- [x] **Backend Synchronization** - ✅ Seamless frontend-backend voice clone management

### 🔄 **Coming Soon**
- [ ] **Advanced Export Options** - PDF reports, Word documents, Markdown
- [ ] **Conversation Search** - Full-text search through history
- [ ] **Multi-language Voice Cloning** - Support for multiple languages and accents
- [ ] **Voice Clone Marketplace** - Share and discover community voice models
- [ ] **Multi-language UI** - Internationalization support
- [ ] **Plugin System** - Custom integrations and extensions

### 🔮 **Future Plans**
- [ ] **Advanced Voice Cloning** - Multi-language support and accent transfer
- [ ] **Real-time Collaboration** - Multi-user voice sessions with voice clones
- [ ] **Voice Clone Analytics** - Quality metrics and usage patterns
- [ ] **Mobile Applications** - iOS and Android native apps with voice cloning
- [ ] **API Marketplace** - Third-party integrations for voice cloning
- [ ] **Enterprise Features** - SSO, audit logs, team management, voice governance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI Whisper** - Revolutionary speech recognition and auto-transcription
- **VibeVoice-Large** - State-of-the-art voice cloning and synthesis
- **LM Studio** - Local LLM hosting made easy  
- **Microsoft Edge TTS** - High-quality text-to-speech fallback
- **Next.js & FastAPI** - Modern web framework foundations
- **Framer Motion** - Beautiful UI animations and voice studio interface
- **Tailwind CSS** - Utility-first styling for professional design
- **NVIDIA RTX 5090** - Unprecedented GPU acceleration for voice processing

## 📞 Support

- **Documentation**: [Wiki](https://github.com/TacImpulse/ultimate-voice-bridge/wiki)
- **Issues**: [GitHub Issues](https://github.com/TacImpulse/ultimate-voice-bridge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/TacImpulse/ultimate-voice-bridge/discussions)

---

**Made with ❤️ by TacImpulse** - Bridging the gap between human voice and artificial intelligence.