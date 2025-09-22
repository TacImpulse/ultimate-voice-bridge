'use client'

import { useState, useEffect } from 'react'

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [gpuInfo, setGpuInfo] = useState<any>(null)

  useEffect(() => {
    // Check backend status
    const checkApi = async () => {
      try {
        const response = await fetch('http://localhost:8000/health')
        const data = await response.json()
        setApiStatus(data.status)
        setGpuInfo(data.gpu_info)
      } catch (error) {
        setApiStatus('offline')
        console.error('Failed to connect to backend:', error)
      }
    }
    
    checkApi()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              🎙️
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Ultimate Voice Bridge
            </h1>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
              🔊
            </div>
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            State-of-the-art STT-TTS-LLM bridge with real-time voice processing,
            powered by Whisper, LM Studio, and Coqui TTS.
          </p>
          
          {/* Status */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              apiStatus === 'healthy' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : apiStatus === 'offline'
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                apiStatus === 'healthy' ? 'bg-green-500 animate-pulse' : 
                apiStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              Backend API: {apiStatus}
            </div>
            
            {gpuInfo && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🚀 GPU Status</h3>
                <div className="text-sm space-y-1">
                  <div>Device: <span className="font-mono font-medium">{gpuInfo.device_name}</span></div>
                  <div>Memory: <span className="font-mono font-medium">{gpuInfo.memory_gb}GB</span></div>
                  <div>CUDA: <span className="font-mono font-medium">{gpuInfo.cuda_available ? '✅ Available' : '❌ Not Available'}</span></div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              🎯 Voice Bridge Ready!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your backend is running and GPU acceleration is detected. You can now:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="text-2xl mb-2">🎤</div>
                <h3 className="font-semibold">Speech-to-Text</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Convert speech to text with Whisper</p>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="text-2xl mb-2">🤖</div>
                <h3 className="font-semibold">AI Processing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Generate responses with LLM</p>
              </div>
              
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <div className="text-2xl mb-2">🔊</div>
                <h3 className="font-semibold">Text-to-Speech</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Convert text back to speech</p>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                🚧 Coming Next
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Voice recording interface, real-time processing, and full AI pipeline integration!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 py-8">
          <p className="text-gray-500 dark:text-gray-400">
            Built with ❤️ using Next.js, FastAPI, and cutting-edge AI models
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="http://localhost:8000/docs" target="_blank" className="text-blue-600 hover:text-blue-700 transition-colors">
              API Documentation
            </a>
            <a href="https://github.com/YOUR-USERNAME/ultimate-voice-bridge" className="text-blue-600 hover:text-blue-700 transition-colors">
              View on GitHub
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}