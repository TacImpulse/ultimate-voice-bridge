'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, Toaster } from 'react-hot-toast'
import VoiceInterface from '@/components/VoiceInterface'
import ChatHistory from '@/components/ChatHistory'
import SettingsPanel from '@/components/SettingsPanel'
import { useVoiceStore } from '@/store/voiceStore'
import { Cog6ToothIcon, MicrophoneIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'

export default function HomePage() {
  const [showSettings, setShowSettings] = useState(false)
  const { isConnected, connectionStatus } = useVoiceStore()

  useEffect(() => {
    // Show connection status notifications
    if (connectionStatus === 'connected') {
      toast.success('Connected to Voice Bridge API', {
        icon: '🎙️',
        duration: 3000,
      })
    } else if (connectionStatus === 'disconnected') {
      toast.error('Disconnected from Voice Bridge API', {
        icon: '🔌',
        duration: 4000,
      })
    } else if (connectionStatus === 'reconnecting') {
      toast.loading('Reconnecting to Voice Bridge...', {
        icon: '🔄',
        duration: 2000,
      })
    }
  }, [connectionStatus])

  return (
    <div className=\"min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900\">
      <div className=\"container mx-auto px-4 py-8\">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className=\"text-center mb-12\"
        >
          <div className=\"flex items-center justify-center gap-4 mb-6\">
            <div className=\"p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg\">
              <MicrophoneIcon className=\"h-8 w-8 text-primary-600 dark:text-primary-400\" />
            </div>
            <h1 className=\"text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent\">
              Ultimate Voice Bridge
            </h1>
            <div className=\"p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg\">
              <SpeakerWaveIcon className=\"h-8 w-8 text-accent-600 dark:text-accent-400\" />
            </div>
          </div>
          
          <p className=\"text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed\">
            State-of-the-art STT-TTS-LLM bridge with real-time voice processing,
            powered by Whisper, LM Studio, and Coqui TTS.
          </p>
          
          {/* Connection Status */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isConnected
                ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
                : 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-success-500 animate-pulse' : 'bg-error-500'
              }`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Voice Interface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 order-2 lg:order-1"
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
              <VoiceInterface />
            </div>
          </motion.div>

          {/* Chat History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="order-1 lg:order-2"
          >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 h-full">
              <ChatHistory />
            </div>
          </motion.div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <SettingsPanel onClose={() => setShowSettings(false)} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-16 py-8"
        >
          <p className="text-gray-500 dark:text-gray-400">
            Built with ❤️ using Next.js, FastAPI, and cutting-edge AI models
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <a
              href="https://github.com/YOUR-USERNAME/ultimate-voice-bridge"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
            <a
              href="https://docs.voicebridge.dev"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </a>
          </div>
        </motion.footer>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}
