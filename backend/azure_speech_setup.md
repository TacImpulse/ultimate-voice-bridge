# 🎤 Azure Speech Services Setup Guide

## Overview
Get Microsoft's premium Neural voices (Aria, Guy, Jenny, Ryan, etc.) working with authentic samples!

## 🚀 Quick Setup (Free Tier Available!)

### 1. **Create Azure Speech Resource**
1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → Search "Speech"
3. Click "Speech" → "Create"
4. Choose:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose closest to you (e.g., East US)
   - **Name**: `ultimate-voice-bridge-speech`
   - **Pricing Tier**: **Free (F0)** - 5 hours/month free!

### 2. **Get Your API Keys**
1. Go to your Speech resource
2. Click "Keys and Endpoint" in the left menu  
3. Copy **Key 1** and **Location/Region**

### 3. **Set Environment Variables**

#### Windows (PowerShell):
```powershell
# Set for current session
$env:AZURE_SPEECH_KEY="your_key_here"
$env:AZURE_SPEECH_REGION="your_region_here"

# Set permanently
[Environment]::SetEnvironmentVariable("AZURE_SPEECH_KEY", "your_key_here", "User")
[Environment]::SetEnvironmentVariable("AZURE_SPEECH_REGION", "your_region_here", "User")
```

#### Alternative: Create .env file
Create `.env` file in the backend directory:
```env
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

### 4. **Install Required Dependencies**
```bash
pip install azure-cognitiveservices-speech python-dotenv
```

## 🎵 Available Microsoft Neural Voices

### English (US) - Premium Quality
- **en-US-AriaNeural** - Conversational, friendly female
- **en-US-GuyNeural** - Casual, modern male  
- **en-US-JennyNeural** - Professional, reliable female
- **en-US-RyanNeural** - Authoritative, news-style male
- **en-US-BrianNeural** - Corporate, executive male
- **en-US-EmmaNeural** - Warm, storytelling female
- **en-US-AndrewNeural** - Clear, educational male

### English (UK) - Premium Quality  
- **en-GB-LibbyNeural** - Elegant, sophisticated female
- **en-GB-MaisieNeural** - Youthful, energetic female
- **en-GB-RyanNeural** - Distinguished, professional male
- **en-GB-SoniaNeural** - Clear, articulate female

### Other Languages
- **fr-FR-DeniseNeural** - French female
- **de-DE-KatjaNeural** - German female
- **es-ES-ElviraNeural** - Spanish female
- **it-IT-ElsaNeural** - Italian female
- **ja-JP-NanamiNeural** - Japanese female
- **ko-KR-SunHiNeural** - Korean female

## 🔧 Testing Your Setup

Run this test script:
```bash
python test_azure_speech.py
```

## 💰 Pricing Info

### Free Tier (F0)
- **5 hours/month** of Neural TTS
- Perfect for testing and demos
- No credit card required

### Standard Tier (S0) 
- **$1 per 1M characters** for Neural TTS
- **$4 per 1M characters** for Premium Neural TTS
- Pay as you use

### Typical Usage
- **Voice library demos**: ~50 samples × 30 seconds = ~$0.10
- **Regular testing**: ~100 tests/month = ~$0.50
- **Production use**: Scales with usage

## 🎯 What You Get
- **Studio-quality neural voices** 
- **Emotional and speaking styles**
- **Multiple languages and accents**
- **Real-time and batch synthesis**
- **SSML support for advanced control**

Ready to generate premium voice samples! 🚀