# 🎭 Voice Clone Recovery & Backup Guide

**NEVER LOSE YOUR VOICE CLONES AGAIN!**

This guide provides comprehensive backup and recovery procedures for Ultimate Voice Bridge voice clones.

## 🚨 Emergency Recovery (If Voice Clones Are Lost)

### Step 1: Extract from Browser localStorage
1. **Go to your frontend** (http://localhost:3000)
2. **Open extract_localStorage.html** (double-click the file)
3. **Click "Extract Voice Clone Data"**
4. **Download the backup JSON file**

### Step 2: Restore Voice Clone Structure
```bash
python restore_voice_clones.py
# Enter path to your downloaded backup file when prompted
```

### Step 3: Copy Original Audio Files
```bash
python auto_restore_files.py
# This copies your original trimmed audio files from Music folder
```

### Step 4: Integrate with VibeVoice
```bash
python integrate_with_vibevoice.py
# This puts files where VibeVoice expects them
```

### Step 5: Restart Backend
**Restart your backend server** to load the restored voice clones.

## 🛡️ Prevention (Backup Procedures)

### Regular Backups
1. **Monthly**: Run the localStorage extraction tool
2. **After creating new clones**: Always extract and save backup
3. **Before system changes**: Create backup first

### Original Audio File Protection
- Keep original audio files in `C:\Users\TacIm\Music\`
- **Never delete these files** - they're your recovery source
- Consider backing up to cloud storage (Google Drive, etc.)

## 🔧 Technical Details

### ONNX Runtime Compatibility
- **Required Version**: 1.17.1 (NOT 1.22.0+)
- **NumPy Version**: 1.26.4 (NOT 2.0+)
- **Fix Command**: 
  ```bash
  pip uninstall onnxruntime onnxruntime-gpu -y
  pip install onnxruntime-gpu==1.17.1
  pip install "numpy<2"
  ```

### Voice Clone File Structure
```
AppData/Local/Temp/vibevoice_tts/
├── voice_clone_[ID].wav          # Audio file
└── voice_clone_[ID]_metadata.json # Metadata
```

### VibeVoice Service Patch
The `fix_vibevoice_init.py` script adds voice clone loading at startup:
- Scans temp directory for existing voice clones
- Loads them into `self.voice_configs`
- Enables proper backend recognition

## 📁 Recovery Files Reference

| File | Purpose |
|------|---------|
| `extract_localStorage.html` | Browser tool to extract voice clone data |
| `restore_voice_clones.py` | Restore voice clone structure from backup |
| `auto_restore_files.py` | Copy original audio files automatically |
| `integrate_with_vibevoice.py` | Integrate restored files with VibeVoice |
| `fix_vibevoice_init.py` | Patch VibeVoice service to load existing clones |
| `bookmarklet.html` | One-click voice clone extraction bookmarklet |

## ⚠️ Known Issues & Solutions

### Issue: "Voice cloning with VibeVoice failed"
**Cause**: ONNX Runtime version mismatch  
**Solution**: Downgrade to ONNX Runtime 1.17.1 and NumPy 1.26.4

### Issue: "Found 0 voice clones" in backend logs
**Cause**: VibeVoice service not loading existing clones  
**Solution**: Run `fix_vibevoice_init.py` to patch the service

### Issue: localStorage data missing
**Cause**: Browser refresh cleared localStorage  
**Solution**: Use the recovery tools with original audio files

### Issue: Voice clones sound different after recovery
**Cause**: Different audio sample used or processing changes  
**Solution**: Use exact original trimmed files, may need to re-record

## 🎯 Best Practices

1. **Always test voice clones** after any system changes
2. **Keep original audio files safe** - they're your primary backup
3. **Export localStorage data regularly** using the extraction tools
4. **Document your voice clone settings** (names, transcripts, etc.)
5. **Test recovery procedures** periodically to ensure they work

## 📞 Emergency Contacts

If recovery fails:
1. Check this guide first
2. Verify original audio files exist in Music folder
3. Ensure ONNX Runtime compatibility
4. Check backend logs for specific errors

## 🔄 Version History

- **v1.0**: Initial recovery system after ONNX Runtime issues
- **Fixed**: ONNX Runtime 1.22.0 → 1.17.1 compatibility
- **Added**: Comprehensive backup/restore tools
- **Enhanced**: VibeVoice service voice clone loading

---

**Remember: Prevention is better than recovery. Back up your voice clones regularly!** 🎭✨