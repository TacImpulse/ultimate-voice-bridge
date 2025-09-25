# 🔧 Voice Cloning Troubleshooting Guide

> **Ultimate Voice Bridge v5.2 - Complete troubleshooting reference for custom voice cloning**

## 🚀 Quick Status Check

### ✅ Is Voice Cloning Working?
If you can successfully create and test custom voice clones, voice cloning is working perfectly! The major text formatting issue has been **PERMANENTLY FIXED** in v5.2.

### 🎯 Common Success Indicators
- ✅ Voice clone creation completes without errors
- ✅ Voice clone test generates audio successfully 
- ✅ No "No valid speaker lines found in script" errors
- ✅ Custom voice clones sound like the uploaded audio

---

## 🔥 BREAKTHROUGH: Major Issues RESOLVED in v5.2

### ❌ FIXED: "No valid speaker lines found in script"
**Status: ✅ PERMANENTLY RESOLVED**

This critical error that prevented voice clone testing has been completely eliminated with automatic text formatting.

#### What We Fixed
```python
# OLD (BROKEN): Plain text sent to VibeVoice
text = "Hello! This is my custom voice clone test."
# ❌ VibeVoice: "No valid speaker lines found in script"

# NEW (WORKING): Auto-formatted with speaker annotation  
text = "Speaker 0: Hello! This is my custom voice clone test."
# ✅ VibeVoice: Successfully processes and generates audio
```

#### Technical Solution
- **Automatic Text Formatting**: All voice clone text is now automatically prefixed with "Speaker 0:"
- **Smart Detection**: Preserves existing speaker annotations if already present
- **Universal Application**: Works for all voice clones and VibeVoice engines
- **Zero Configuration**: Completely transparent to users

---

## 🛠️ Current Troubleshooting Guide

### 1. 🎤 Voice Clone Creation Issues

#### Issue: Voice clone creation fails
**Symptoms:**
- Backend returns 500 error during clone creation
- Audio file upload fails
- Voice clone not created

**Solutions:**
1. **Check Audio Format**
   ```bash
   # Supported formats: WAV, MP3, FLAC, M4A
   # Ensure audio file is valid and not corrupted
   ```

2. **Check Audio File Size**
   ```bash
   # Maximum file size: 50MB
   # Use audio editor to compress if needed
   ```

3. **Verify Backend Service**
   ```bash
   # Check if VibeVoice service is running
   # Look for "VibeVoice service initialized" in backend logs
   ```

#### Issue: Auto-transcription fails
**Symptoms:**
- STT service returns empty transcript
- Transcription takes too long or times out

**Solutions:**
1. **Check Audio Quality**
   - Ensure clear speech in uploaded audio
   - Remove background noise if possible
   - Minimum 5 seconds of clean speech recommended

2. **Restart STT Service**
   ```bash
   # If STT is stuck, restart the backend
   # Check for Whisper model loading messages
   ```

### 2. 🎭 Voice Clone Testing Issues

#### Issue: Voice clone test returns 500 error
**Symptoms:**
- Test button fails with server error
- No audio generated from custom voice

**Solutions:**
1. **✅ TEXT FORMATTING (AUTO-FIXED in v5.2)**
   - This issue is now **automatically resolved**
   - Text is automatically formatted with "Speaker 0:" prefix
   - No user action required

2. **Check Voice Clone Sync**
   ```bash
   # Frontend and backend voice clone IDs should match
   # Backend automatically reconciles differences
   ```

3. **Verify VibeVoice Model**
   ```bash
   # Check if VibeVoice-Large model is loaded
   # Look for "VibeVoice service initialized" message
   ```

#### Issue: Voice clone generates default voice instead of custom
**Symptoms:**
- Test generates audio but sounds like built-in voice
- Custom voice characteristics not applied

**Solutions:**
1. **Check Voice Sample Quality**
   - Ensure uploaded audio clearly represents the target voice
   - Minimum 10-15 seconds of clean speech recommended
   - Remove background noise and enhance audio quality

2. **Verify Voice Clone Creation**
   - Ensure voice clone was successfully created
   - Check backend logs for voice clone processing confirmation

### 3. 🚀 Backend Service Issues

#### Issue: VibeVoice service not available
**Symptoms:**
- Error: "VibeVoice service not available" 
- Backend fails to initialize voice cloning

**Solutions:**
1. **Check Model Path**
   ```bash
   # Verify VibeVoice-Large model path exists
   set VIBEVOICE_LARGE_PATH=Z:\Models\VibeVoice-Large
   ```

2. **Check GPU/CUDA**
   ```bash
   # Ensure CUDA 13.0 is properly installed
   # RTX 5090 drivers up to date
   # Verify GPU memory available (requires ~8GB)
   ```

3. **Restart Backend Service**
   ```bash
   # Stop current Python processes
   # Restart backend with: python main.py
   ```

#### Issue: GPU acceleration not working
**Symptoms:**
- Voice generation is very slow
- CPU usage high during voice generation
- No GPU utilization shown

**Solutions:**
1. **Verify CUDA Installation**
   ```bash
   nvidia-smi  # Should show RTX 5090
   nvcc --version  # Should show CUDA 13.0
   ```

2. **Check PyTorch CUDA**
   ```python
   import torch
   print(torch.cuda.is_available())  # Should be True
   print(torch.cuda.get_device_name())  # Should show RTX 5090
   ```

3. **Update Environment Variables**
   ```bash
   set CUDA_HOME=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0
   set CUDA_VISIBLE_DEVICES=0
   ```

### 4. 📱 Frontend Issues

#### Issue: Voice clone UI not responsive
**Symptoms:**
- Buttons don't respond
- Upload doesn't work
- No feedback from interface

**Solutions:**
1. **Check Frontend-Backend Connection**
   ```bash
   # Verify backend is running on port 8001
   # Check frontend connects to correct API endpoints
   ```

2. **Browser Developer Tools**
   ```bash
   # Open browser console (F12)
   # Look for JavaScript errors or network failures
   # Check for CORS errors
   ```

3. **Clear Browser Cache**
   ```bash
   # Hard refresh: Ctrl+F5
   # Clear browser cache and cookies
   # Try different browser or incognito mode
   ```

---

## 🧪 Diagnostic Tools

### 1. Backend Voice Clone Test Script
```bash
cd backend
python test_voice_clone_fix.py
```
**Expected Output:**
```
🧪 Testing VibeVoice text formatting...
✅ PASS - Correct speaker formatting (Test 1)
✅ PASS - Correct speaker formatting (Test 2)
✅ PASS - Correct speaker formatting (Test 3)
```

### 2. Manual VibeVoice Test
```bash
cd backend
python test_vibevoice_directly.py
```
**Expected Output:**
```
✅ VibeVoice model loaded successfully
✅ Audio generation completed: 192KB output
```

### 3. Frontend Network Check
```bash
# Open browser developer tools (F12)
# Go to Network tab
# Try voice clone operations
# Check for 500 errors or failed requests
```

---

## 📊 Performance Expectations

### 🎯 Normal Performance Metrics
- **Voice Clone Creation**: 5-15 seconds
- **Voice Clone Testing**: 3-8 seconds  
- **Audio File Size**: 50-200KB for typical sentences
- **Model Loading**: 30-60 seconds (first startup only)
- **GPU Memory Usage**: 6-8GB VRAM during processing

### 🚨 Performance Warning Signs
- **Voice Clone Creation >60 seconds**: Check GPU acceleration
- **Voice Clone Test >30 seconds**: Restart backend service
- **Audio Output <10KB**: Potential generation failure
- **Error Rate >10%**: Check model integrity

---

## 🔄 Recovery Procedures

### 1. Complete System Reset
```bash
# 1. Stop all services
# Kill Python processes (outside Warp)

# 2. Restart backend
cd backend
python main.py

# 3. Restart frontend  
cd frontend
npm run dev

# 4. Test voice clone functionality
```

### 2. Model Reinitialization
```bash
# If VibeVoice models are corrupted
# 1. Clear model cache
rm -rf ~/.cache/huggingface/

# 2. Restart backend (will re-download models)
python main.py
```

### 3. Database/Storage Reset
```bash
# If voice clone metadata is corrupted
# 1. Clear temporary voice clone files
cd backend
rm -rf temp/voice_clone_*

# 2. Restart backend to reinitialize
python main.py
```

---

## ✅ Success Verification Checklist

### After Troubleshooting, Verify:
- [ ] Backend starts without errors
- [ ] VibeVoice service initializes successfully  
- [ ] Frontend connects to backend
- [ ] Audio file upload works
- [ ] Auto-transcription generates text
- [ ] Voice clone creation completes
- [ ] Voice clone test generates audio
- [ ] Audio plays correctly in browser
- [ ] Custom voice characteristics are audible

### Performance Verification:
- [ ] Voice clone creation <15 seconds
- [ ] Voice clone testing <10 seconds
- [ ] GPU utilization visible during processing
- [ ] Audio output size 50-200KB range
- [ ] No console errors or warnings

---

## 🆘 Getting Help

### When to Seek Additional Support:
1. **Critical errors persist** after following this guide
2. **Hardware-specific issues** with RTX 5090 or CUDA
3. **New error messages** not covered in this guide
4. **Performance issues** that don't match expected metrics

### Information to Include When Reporting Issues:
1. **Exact error messages** from browser console and backend logs
2. **System specifications** (GPU, CUDA version, Python version)
3. **Steps to reproduce** the issue
4. **Audio file details** (format, size, duration)
5. **Screenshots** of error messages or unexpected behavior

### Support Channels:
- **GitHub Issues**: [Ultimate Voice Bridge Issues](https://github.com/TacImpulse/ultimate-voice-bridge/issues)
- **Documentation**: [Project Wiki](https://github.com/TacImpulse/ultimate-voice-bridge/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/TacImpulse/ultimate-voice-bridge/discussions)

---

## 🎯 Summary

**Voice cloning in Ultimate Voice Bridge v5.2 is now extremely reliable** with the major text formatting issue permanently fixed. Most users should experience seamless voice cloning functionality.

The troubleshooting steps above cover edge cases and system-specific issues. **The core voice cloning pipeline is production-ready and works consistently.**

**🎉 Enjoy creating amazing custom voice clones!**