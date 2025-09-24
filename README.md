# 🎙️ Ultimate Voice Bridge

> **State-of-the-art STT-TTS-LLM voice bridge application with real-time audio processing**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)

A professional-grade, full-stack voice processing application that bridges Speech-to-Text (STT), Large Language Models (LLM), and Text-to-Speech (TTS) with real-time audio streaming, voice cloning, and enterprise-level performance.

## 🚀 Features

### 🆕 Latest Features (v2.0)
- **🤖 Dynamic Model Selector**: Switch between 17+ LM Studio models on-the-fly
- **🛑 Smart Stop Button**: Cancel audio playback and requests instantly
- **🎤 Enhanced Transcription**: See exactly what you said with confidence scores
- **🤔 AI Reasoning Display**: Watch the AI think through your questions step-by-step
- **📊 Conversation Flow UI**: Beautiful User Speech → AI Thinking → AI Response layout
- **🖥️ One-Click Desktop Launchers**: Start everything with a single desktop shortcut

### Core Capabilities
- **🎯 Real-time Speech Processing**: Ultra-low latency STT with Whisper integration
- **🤖 LLM Integration**: Support for OpenAI, Anthropic, and local LM Studio models
- **🗣️ Advanced TTS**: High-quality voice synthesis with Coqui TTS and voice cloning
- **🎵 Audio Processing**: Real-time noise reduction, VAD, and audio enhancement
- **📱 Cross-Platform**: PWA support for desktop, mobile, and web

### Technical Excellence
- **⚡ Performance**: GPU acceleration, WebSocket streaming, async processing
- **🔒 Security**: End-to-end encryption, rate limiting, CORS protection
- **📊 Monitoring**: Real-time performance metrics, logging, and analytics
- **🐳 DevOps**: Docker containerization, CI/CD pipelines, auto-scaling
- **🧪 Testing**: Comprehensive test coverage with Jest and Pytest

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • WebSocket     │    │ • STT (Whisper) │
│ • TypeScript    │    │ • Rate Limiting │    │ • LLM Bridge    │
│ • Tailwind CSS  │    │ • Authentication│    │ • TTS (Coqui)   │
│ • Audio Capture │    │ • Load Balancer │    │ • Voice Clone   │
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
| **Frontend** | Next.js 14 + TypeScript | Modern React framework with SSR |
| **Backend** | FastAPI + Python 3.9+ | High-performance async API |
| **STT Engine** | OpenAI Whisper | State-of-the-art speech recognition |
| **LLM** | LM Studio / OpenAI / Anthropic | Flexible LLM integration |
| **TTS Engine** | Coqui TTS + Voice Cloning | Professional voice synthesis |
| **Database** | Redis + SQLite | Session management & caching |
| **Deployment** | Docker + Nginx | Containerized production setup |
| **CI/CD** | GitHub Actions | Automated testing & deployment |

## 😦 Quick Start

### 🖥️ Super Quick Start (Windows)
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
- **Docker Desktop** (optional, recommended)
- **CUDA Toolkit** (optional, for GPU acceleration)

### 1. Clone & Setup
```bash
git clone https://github.com/TacImpulse/ultimate-voice-bridge.git
cd ultimate-voice-bridge

# Copy environment file
cp .env.example .env

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

### 3. Run Development Server
```bash
# Start both frontend and backend
npm run dev

# Or individually:
npm run dev:frontend  # http://localhost:3000
npm run dev:backend   # http://localhost:8000
```

### 4. 🎤 Quick Start Voice Recording

**PowerShell (Windows):**
```powershell
# Start both servers with one script
.\start-servers.ps1
```

**Manual Start:**
```bash
# Terminal 1: Start backend with GPU support
cd backend
python main.py

# Terminal 2: Start frontend 
cd frontend
npm run dev

# Open http://localhost:3001/voice to test!
```

### 5. 🐳 Docker (Production)
```bash
# Start entire stack with one command
docker-compose up

# Production mode
docker-compose -f docker-compose.prod.yml up
```

## 📱 Usage

### 🎤 Enhanced Voice Chat Interface
1. **Launch**: Double-click your desktop shortcut or go to http://localhost:3000/voice
2. **Select Model**: Choose from 17+ available LM Studio models in the dropdown
3. **Record**: Click the red microphone button and speak clearly
4. **Process**: Click the purple model button to start the full AI pipeline
5. **Experience**: Watch the conversation flow:
   - 🎤 **Your Speech**: See transcription with confidence and language detection
   - 🤔 **AI Thinking**: Watch reasoning models show their thought process
   - 🎧 **AI Response**: Hear Ava speak with automatic audio playback
6. **Control**: Use the stop button to cancel audio or requests anytime

**🆕 New Features:**
- **Smart Model Switching**: 17+ models including uncensored options
- **Stop Control**: Instantly stop chatty AI responses
- **Enhanced Transcription**: Language, confidence, device, and timing details
- **AI Reasoning**: See how reasoning models think through problems
- **Performance Stats**: Real-time STT/LLM/TTS processing times
- **Desktop Shortcuts**: One-click launching with automatic browser opening

**Classic Features:**
- Real-time audio visualization with 20-band frequency display
- Recording timer and audio playback
- GPU-accelerated Whisper transcription (typically <1 second)
- Voice activity detection and silence trimming
- Professional UI with smooth animations

### API Endpoints
```bash
# Health check
curl http://localhost:8000/health

# STT transcription
curl -X POST http://localhost:8000/api/v1/stt \
  -F "audio=@audio.wav"

# Text-to-speech
curl -X POST http://localhost:8000/api/v1/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "voice": "default"}'

# Real-time WebSocket
wscat -c ws://localhost:8000/ws
```

## 🎯 Development

### Project Structure
```
ultimate-voice-bridge/
├── frontend/                 # Next.js React app
│   ├── components/          # Reusable UI components
│   ├── pages/              # Next.js pages
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Helper functions
├── backend/                 # FastAPI Python app
│   ├── app/                # Main application
│   ├── services/           # STT, TTS, LLM services
│   ├── models/             # Pydantic models
│   └── utils/              # Helper utilities
├── docs/                   # Documentation
├── .github/                # GitHub workflows
└── docker-compose.yml     # Container orchestration
```

### Development Commands
```bash
# Frontend development
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint + TypeScript check
npm test             # Jest testing

# Backend development
cd backend
uvicorn main:app --reload    # Development server
pytest                       # Run tests
black . && isort .          # Code formatting
mypy .                      # Type checking
```

### Testing
```bash
# Run all tests
npm test                    # Frontend tests
cd backend && pytest       # Backend tests

# Test coverage
npm run test:coverage       # Frontend coverage
cd backend && pytest --cov # Backend coverage
```

## 🔧 Configuration

### Voice Models
```yaml
# STT Configuration
WHISPER_MODEL: "base"       # tiny, base, small, medium, large
WHISPER_LANGUAGE: "auto"    # auto-detect or specific language

# TTS Configuration  
TTS_MODEL: "tts_models/en/ljspeech/tacotron2-DDC"
ENABLE_VOICE_CLONING: true
```

### Performance Tuning
```yaml
# Audio Settings
AUDIO_SAMPLE_RATE: 16000
MAX_AUDIO_DURATION: 300
AUDIO_CHUNK_SIZE: 1024

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE: 60
RATE_LIMIT_CONCURRENT_SESSIONS: 10
```

## 🚀 Deployment

### Production Docker
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with GPU support
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment
- **AWS**: EC2 + ECS + Load Balancer
- **GCP**: Cloud Run + Cloud SQL + CDN  
- **Azure**: Container Instances + Cosmos DB

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- **Frontend**: ESLint + Prettier + TypeScript strict
- **Backend**: Black + isort + mypy + pytest
- **Commits**: Conventional Commits format
- **Testing**: Minimum 80% code coverage

## 📊 Performance

### Benchmarks
- **STT Latency**: <200ms (base model, CPU)
- **LLM Response**: <1s (depends on model)
- **TTS Generation**: <500ms (standard voice)
- **End-to-End**: <2s total pipeline time

### Scaling
- **Concurrent Users**: 100+ (single instance)
- **Audio Processing**: Real-time streaming
- **GPU Acceleration**: 10x faster inference
- **Horizontal Scaling**: Kubernetes ready

## 📚 Documentation

- [API Documentation](docs/api.md)
- [Voice Model Guide](docs/voice-models.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Coqui TTS](https://github.com/coqui-ai/TTS) - Text-to-speech
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python framework
- [Next.js](https://nextjs.org/) - React production framework

## 💬 Support

- 📧 Email: support@voicebridge.dev
- 💬 Discord: [Join our community](https://discord.gg/voicebridge)
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR-USERNAME/ultimate-voice-bridge/issues)
- 📖 Docs: [Documentation Site](https://docs.voicebridge.dev)

---

⭐ **Star this repo if you find it helpful!**

Made with ❤️ by [TacImpulse](https://github.com/TacImpulse)
