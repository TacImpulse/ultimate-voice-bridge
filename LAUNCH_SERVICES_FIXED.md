# 🚀 Ultimate Voice Bridge - Service Launch Instructions (UPDATED)

## ⚠️ CRITICAL: Launch Outside Warp Terminal

**NEVER run these commands inside Warp Agent Mode as they will cause the agent to get stuck:**
- `npm run dev` (frontend)
- `python main.py` (backend) 
- Long-running processes in general

## 🔧 Recent Fixes Applied

### Frontend Issues Resolved ✅
- **Build Cache**: Cleared corrupted `.next` directory
- **TypeScript Errors**: Fixed onClick handler and Set iteration issues  
- **Routing**: Confirmed `/conversation` route works (not `/conversation-engine`)
- **Static Assets**: Cache cleared to resolve 404 errors on CSS/JS files

### Backend Status ✅
- Port 8001 confirmed and working
- VibeVoice integration ready
- Custom voice clones loaded from localStorage

## 🎯 Launch Sequence

### 1. Backend Launch (Separate Terminal/PowerShell)
```powershell
# Navigate to backend directory
cd C:\Users\TacIm\ultimate-voice-bridge\backend

# Option A: Use the RTX 5090 GPU launcher script
.\launch_with_rtx5090.bat

# Option B: Manual launch with GPU acceleration
$env:CUDA_VISIBLE_DEVICES="0"
python main.py --host 0.0.0.0 --port 8001 --gpu
```

**Backend should start on:** `http://localhost:8001`

### 2. Frontend Launch (Separate Terminal/PowerShell)
```powershell
# Navigate to frontend directory  
cd C:\Users\TacIm\ultimate-voice-bridge\frontend

# Start Next.js development server
npm run dev
```

**Frontend should start on:** `http://localhost:3000`

### 3. Verify Services

#### Check Backend Health
- Visit: `http://localhost:8001/docs` (API documentation)
- Visit: `http://localhost:8001/health` (health check)

Expected health response:
```json
{
  "status": "healthy",
  "services": {
    "stt": "healthy",
    "tts": "healthy", 
    "llm": "healthy",
    "gpu_acceleration": "healthy",
    "vibevoice_gpu": "healthy"
  },
  "version": "1.0.0"
}
```

#### Check Frontend
- Visit: `http://localhost:3000` (main dashboard)
- Verify all navigation links work:
  - `/voice` - Voice Recording
  - `/conversation` - Multi-Speaker Conversation Engine  
  - `/voice-clone` - Voice Clone Management
  - `/test` - AI Chat

## 🎪 Voice Clone Testing

### JuicedIn Voice Clone Status
- **Frontend**: Voice clones load from localStorage ✅
- **Backend Issue**: VibeVoice reports "Found 0 voice clones"
- **Current Behavior**: Fallback to default Ava voice for testing

### Next Debugging Steps
1. Check backend VibeVoice voice clone loading
2. Verify voice clone directory and file structure
3. Ensure backend can access custom voice models
4. Test voice clone sync between frontend/backend

## 🛠️ Troubleshooting

### Frontend Issues
- **Blank page**: Clear browser cache and hard refresh (Ctrl+F5)
- **404 on assets**: Restart frontend after clearing `.next` directory
- **TypeScript errors**: All current issues have been resolved

### Backend Issues  
- **Port conflicts**: Ensure nothing else uses port 8001
- **GPU acceleration**: Verify CUDA installation and RTX 5090 drivers
- **VibeVoice loading**: Check model path: `Z:\Models\VibeVoice-Large`

### Voice Clone Issues
- **Zero clones found**: Backend VibeVoice initialization issue
- **Fallback voices**: System defaults to Ava when custom clones unavailable
- **Testing**: Use Test button - should produce clean audio without metadata

## 📋 Environment Verification

### System Requirements Met ✅
- Windows 11 Home 64-bit
- Intel i9 platform  
- 64GB RAM
- NVIDIA RTX 5090 (32GB VRAM)
- VibeVoice-Large model at Z:\Models\VibeVoice-Large

### Port Configuration ✅
- **Backend**: 8001 (FastAPI + VibeVoice)
- **Frontend**: 3000 (Next.js)
- **API calls**: Frontend → Backend on 8001

## 🎵 Current Capabilities

### Working Features ✅
- Real-time voice recording and transcription
- Multi-modal file upload and processing
- LM Studio integration for AI responses
- Web Speech API fallback for voice testing
- Multi-speaker conversation script processing
- Voice clone selection interface

### Pending Fixes 🔄
- Custom voice clone loading in VibeVoice backend
- Voice clone testing with actual custom voices (not fallback)
- Backend/frontend voice clone sync

---

**Last Updated**: 2025-09-28 05:05 UTC  
**Status**: Frontend fixed, Backend operational, Voice clone sync pending