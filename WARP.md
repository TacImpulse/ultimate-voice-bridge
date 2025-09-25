# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Ultimate Voice Bridge is a production-ready voice processing application that bridges Speech-to-Text (STT), Large Language Models (LLM), and Text-to-Speech (TTS) technologies. The system features professional audio controls, multimodal file processing, and GPU-accelerated AI services.

## Architecture

The application follows a microservices architecture with three main components:

- **Frontend (Next.js 14 + TypeScript)**: Professional React UI with audio controls, file handling, and real-time interactions
- **Backend (FastAPI + Python)**: High-performance async API handling STT, TTS, and LLM services  
- **AI Services Layer**: GPU-accelerated Whisper (STT), LM Studio integration (LLM), and TTS engines

### Key Services

- **STTService**: OpenAI Whisper with RTX 5090 GPU optimization for speech recognition
- **LLMService**: LM Studio integration supporting ByteDance OSS-36B and other models
- **TTSService**: Edge TTS and voice cloning capabilities
- **WebSocketManager**: Real-time communication for audio streaming

## Common Development Commands

### Quick Start (Windows)
```powershell
# One-command launch for development
.\start-dev.ps1

# Or use the desktop shortcut launcher
.\launch_voice_bridge.bat
```

### Setup Commands
```bash
# Install all dependencies
npm run setup

# Individual setup
npm run setup:frontend  # Install frontend dependencies
npm run setup:backend   # Install Python backend dependencies
```

### Development Servers
```bash
# Start both servers concurrently
npm run dev

# Start individually
npm run dev:frontend    # Next.js dev server (port 3000)
npm run dev:backend     # FastAPI server (port 8000/8001)

# Manual startup (alternative)
cd backend && python main.py
cd frontend && npm run dev
```

### Testing
```bash
# Run all tests
npm run test

# Frontend tests
cd frontend && npm test
cd frontend && npm run test:watch

# Backend tests
cd backend && pytest

# Test individual services
cd backend && python test_llm_directly.py
cd backend && python test_tts_directly.py
cd backend && python test_voice_chat.py
```

### Build & Deploy
```bash
# Production build
npm run build
npm start

# Docker deployment
npm run docker:dev      # Development with hot reload
npm run docker:prod     # Production deployment
```

### Code Quality
```bash
# Frontend linting and type checking
npm run lint
npm run type-check

# Backend formatting (if available)
cd backend && black .
cd backend && isort .
cd backend && mypy .
```

## Key Architectural Concepts

### Service Integration Pattern
All AI services follow a consistent initialization and health check pattern:
- Services implement `initialize()`, `cleanup()`, and `health_check()` async methods
- GPU optimization is handled at the service layer (especially for Whisper STT)
- LM Studio acts as the LLM gateway, supporting model switching

### Audio Processing Pipeline
The audio pipeline flows through multiple stages:
1. Frontend captures audio using Web Audio API with real-time visualization
2. Audio is processed through WebSocket or HTTP upload to backend
3. STT service (Whisper) transcribes with GPU acceleration
4. LLM service processes text through LM Studio
5. TTS service generates speech output
6. Frontend provides professional playback controls

### State Management Architecture
- **Frontend**: Uses Zustand for client state, React Context for settings
- **Backend**: FastAPI dependency injection with global service instances
- **Communication**: WebSocket for real-time features, REST API for file operations

### GPU Optimization Strategy
The backend is optimized for RTX 5090 GPU usage:
- Whisper models use CUDA with FP16 precision
- Automatic GPU detection and fallback to CPU
- Memory management with `torch.cuda.empty_cache()`

## Environment Configuration

### Required Environment Variables
```env
# LLM Configuration (choose one or multiple)
LM_STUDIO_BASE_URL=http://localhost:1234/v1
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Backend Configuration
BACKEND_PORT=8001
DEBUG=true
WHISPER_DEVICE=cuda

# Audio Settings
MAX_AUDIO_DURATION=300
AUDIO_SAMPLE_RATE=16000
```

### Development Dependencies
- **Node.js 18+** and npm 9+ for frontend
- **Python 3.9+** with CUDA support for backend
- **LM Studio** for local LLM hosting
- **Redis** (optional, for session management)

## File Structure Context

### Frontend Structure
- `app/`: Next.js 14 app router pages
- `components/`: Reusable React components (VoiceRecorder, SettingsModal)
- `contexts/`: React contexts for global state management
- Professional audio controls and multimodal file handling

### Backend Structure
- `app/`: Application configuration and WebSocket management
- `services/`: Core AI services (STT, TTS, LLM)
- `models/`: Pydantic data models for API contracts
- `utils/`: Utility functions for audio processing and logging

## Common Troubleshooting Areas

### GPU Issues
- Verify CUDA installation: `torch.cuda.is_available()`
- Check GPU memory with RTX 5090 optimization
- Whisper model loading requires significant GPU memory

### LM Studio Connection
- Ensure LM Studio is running on port 1234
- Check model loading status in LM Studio interface
- ByteDance OSS-36B is the preferred model

### Audio Processing
- WebM/Opus format is preferred for recording
- 16kHz sample rate is standard for Whisper
- File size limits: 50MB per upload

## Performance Considerations

- **STT Latency**: <200ms with RTX 5090 GPU acceleration
- **LLM Response**: 1-3s depending on model complexity  
- **TTS Generation**: <1s with Edge TTS optimization
- **File Processing**: <5s for files up to 50MB limit

## Deployment Notes

The system supports both development and production deployment:
- Development uses concurrent npm scripts or PowerShell launchers
- Production uses Docker Compose with Nginx reverse proxy
- GPU support requires NVIDIA Docker runtime for containerization

When working with this codebase, prioritize the voice processing pipeline and GPU optimization. The system is designed for real-time performance with professional audio controls.