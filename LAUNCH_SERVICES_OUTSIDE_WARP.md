# 🚀 How to Launch Services Outside Warp

## ⚠️ CRITICAL RULE
**NEVER launch frontend/backend services inside Warp terminal** - this causes the AI agent to get stuck and requires manual intervention to stop the process.

## ✅ CORRECT WAY: Launch Outside Warp

### Method 1: Using Windows PowerShell (Recommended)
1. **Press `Win + R`** → Type `powershell` → Press Enter
2. **Navigate to backend**: `cd C:\Users\TacIm\ultimate-voice-bridge\backend`
3. **Start backend**: `python main.py`
4. **Open another PowerShell window** (repeat step 1)
5. **Navigate to frontend**: `cd C:\Users\TacIm\ultimate-voice-bridge\frontend` 
6. **Start frontend**: `npm run dev`

### Method 2: Using Command Prompt
1. **Press `Win + R`** → Type `cmd` → Press Enter
2. **Navigate to backend**: `cd C:\Users\TacIm\ultimate-voice-bridge\backend`
3. **Start backend**: `python main.py`
4. **Open another Command Prompt** (repeat step 1)
5. **Navigate to frontend**: `cd C:\Users\TacIm\ultimate-voice-bridge\frontend`
6. **Start frontend**: `npm run dev`

### Method 3: Using Your GPU Launcher Script
1. **Navigate to**: `C:\Users\TacIm\ultimate-voice-bridge`
2. **Double-click**: `launch_voice_bridge_gpu.bat`
3. **This automatically**:
   - Starts backend with RTX 5090 GPU acceleration
   - Starts frontend 
   - Opens browser to main page
   - Shows all service URLs

## 🎯 Expected Results
- **Backend**: Running on `http://localhost:8000`
- **Frontend**: Running on `http://localhost:3000`
- **Main Page**: `http://localhost:3000`
- **Conversation Engine**: `http://localhost:3000/conversation-engine`
- **Voice Clones**: `http://localhost:3000/voice-clone`

## 🚫 What NOT to Do in Warp
```bash
# ❌ NEVER do this in Warp - causes agent to get stuck
npm run dev
python main.py
curl http://localhost:3000
```

## 📋 Troubleshooting
- **Port conflicts**: If port 3000/8000 is busy, stop existing processes first
- **Backend not responding**: Check if `python main.py` shows "🎤️ Ultimate Voice Bridge is ready!"
- **Frontend 404**: Check if `npm run dev` shows "ready - started server on 0.0.0.0:3000"

## 🎮 RTX 5090 GPU Status
When backend starts properly, you should see:
```
🚀 RTX 5090 GPU Acceleration initialized successfully!
✅ VibeVoice with GPU Acceleration initialized
🎮 GPU: NVIDIA GeForce RTX 5090 (CUDA: True)
```