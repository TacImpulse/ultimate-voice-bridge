# 🔧 ONNX Runtime Compatibility Fix for RTX 5090

**CRITICAL: This fix resolves voice clone failures with VibeVoice**

## Problem
```
⚠️ RTX 5090 verification warning: Unsupported model IR version: 11, max supported IR version: 10
❌ Voice cloning with VibeVoice failed. Playing with fallback voice (Ava).
```

## Root Cause
- **ONNX Runtime 1.22.0**: Supports IR version 11, but some models need IR version 10 compatibility
- **NumPy 2.x**: Incompatible with ONNX Runtime 1.17.1 which has better compatibility

## Solution
```bash
# Remove incompatible versions
pip uninstall onnxruntime onnxruntime-gpu -y

# Install compatible versions
pip install onnxruntime-gpu==1.17.1
pip install "numpy<2"
```

## Verification
```bash
python -c "import onnxruntime; print('ONNX Runtime version:', onnxruntime.__version__)"
python -c "import numpy; print('NumPy version:', numpy.__version__)"
```

**Expected output:**
```
ONNX Runtime version: 1.17.1
NumPy version: 1.26.4
```

## Warning Messages (These are NORMAL)
After the fix, you may still see warnings, but they don't affect functionality:
```
UserWarning: Unsupported Windows version (11). ONNX Runtime supports Windows 10 and above, only.
⚠️ RTX 5090 verification warning: [...] max supported IR version: 9
```

**These warnings are harmless** as long as you see:
```
✅ ONNX Runtime GPU acceleration service initialized  
✅ RTX 5090 GPU acceleration enabled!
✅ Loaded voice clone: [YourClone] ([voice_id])
```

## Environment Compatibility
- **OS**: Windows 11 (works despite warnings)
- **GPU**: RTX 5090 with CUDA 13.0
- **PyTorch**: 2.10.0.dev20250924+cu130
- **Python**: 3.12

## Dependencies That May Conflict
Some packages prefer newer versions but work with our fix:
- `faster-whisper`: Wants ONNX Runtime >=1.14 ✅ (1.17.1 works)  
- `opencv-contrib-python`: Wants NumPy >=2.0 ⚠️ (1.26.4 works but shows warnings)
- `thinc`: Wants NumPy >=2.0 ⚠️ (1.26.4 works but shows warnings)

## Testing Voice Clones
After applying the fix:
1. Restart your backend server
2. Check logs for voice clone loading: `✅ Loaded voice clone: [Name]`
3. Test voice clones in frontend - should use custom voices, not Ava

## Rollback (If Needed)
```bash
pip uninstall onnxruntime-gpu numpy -y
pip install onnxruntime-gpu  # Latest version
pip install numpy            # Latest version
```

## Flash Attention Alternative
Since Flash Attention is difficult to compile on Windows, we use **SDPA (Scaled Dot Product Attention)** which provides good performance on RTX 5090:
```
ℹ️ Flash Attention not available, using SDPA (Scaled Dot Product Attention)
```

This is totally fine and still provides excellent performance.

---

**This fix is essential for voice clone functionality. Apply it whenever you see ONNX Runtime version mismatch errors!** 🚀