# 🎤 Google Cloud TTS Setup Guide

## Overview
Get Google's high-quality voices including WaveNet and Standard voices for authentic samples!

## 🚀 Quick Setup (Free Tier Available!)

### 1. **Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the **Cloud Text-to-Speech API**
   - Go to "APIs & Services" > "Library"
   - Search "Text-to-Speech API" 
   - Click "Enable"

### 2. **Create Service Account**
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Name: `ultimate-voice-bridge-tts`
4. Role: **Cloud Text-to-Speech Client** 
5. Click "Done"

### 3. **Download Service Account Key**
1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose **JSON** format
5. Download and save as `google_tts_key.json`

### 4. **Set Environment Variable**

#### Windows (PowerShell):
```powershell
# Set for current session
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\google_tts_key.json"

# Set permanently
[Environment]::SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", "C:\full\path\to\google_tts_key.json", "User")
```

#### Alternative: Place in backend directory
Put `google_tts_key.json` in the backend directory and set:
```env
GOOGLE_APPLICATION_CREDENTIALS=./google_tts_key.json
```

### 5. **Install Required Dependencies**
```bash
pip install google-cloud-texttospeech
```

## 🎵 Available Google Voices

### English (US) - High Quality
- **en-US-Standard-A** - Female, clear
- **en-US-Standard-B** - Male, professional  
- **en-US-Standard-C** - Female, warm
- **en-US-Standard-D** - Male, friendly
- **en-US-Wavenet-A** - Female, premium quality
- **en-US-Wavenet-B** - Male, premium quality
- **en-US-Wavenet-C** - Female, natural
- **en-US-Wavenet-D** - Male, authoritative

### English (UK) - High Quality
- **en-GB-Standard-A** - Female, British
- **en-GB-Standard-B** - Male, British
- **en-GB-Wavenet-A** - Female, premium British
- **en-GB-Wavenet-B** - Male, premium British

### Other Languages
- **fr-FR-Standard-A** - French female
- **de-DE-Standard-A** - German female  
- **es-ES-Standard-A** - Spanish female
- **it-IT-Standard-A** - Italian female
- **ja-JP-Standard-A** - Japanese female
- **ko-KR-Standard-A** - Korean female

## 🔧 Testing Your Setup

Run this test script:
```bash
python test_google_tts.py
```

## 💰 Pricing Info

### Free Tier
- **1 million characters/month** free
- Plenty for voice library testing
- No credit card required initially

### Standard Voices
- **$4 per 1M characters** after free tier
- Good quality, cost-effective

### WaveNet Voices  
- **$16 per 1M characters** after free tier
- Premium quality, most natural

### Typical Usage
- **Voice library demos**: ~50 samples = ~2,500 chars = FREE
- **Regular testing**: ~500 tests/month = FREE
- **Production use**: Scales affordably

## 🎯 What You Get
- **High-quality Standard voices** 
- **Premium WaveNet voices**
- **40+ languages and variants**
- **SSML support for advanced control**
- **Fast, reliable generation**

Ready to generate Google TTS samples! 🚀