'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MicrophoneIcon, 
  StopIcon, 
  PlayIcon, 
  ArrowPathIcon,
  DocumentTextIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface TranscriptionResult {
  text: string
  language: string
  confidence: number
  processing_time: number
  device_used: string
  audio_info: any
  voice_activity: any
}

export default function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0))

  // Initialize audio context and get microphone permission
  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      audioContextRef.current = new AudioContext()
      
      // Resume AudioContext if it's suspended (required by modern browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      return stream
    } catch (error) {
      console.error('Error initializing audio:', error)
      throw error
    }
  }

  // Start recording
  const startRecording = async () => {
    try {
      setError(null)
      setTranscription(null)
      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)
      
      const stream = await initializeAudio()
      
      if (!mediaRecorderRef.current) return
      
      const audioChunks: BlobPart[] = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      // Initialize visualizer with immediate animation to test
      const testLevels = Array.from({length: 20}, (_, i) => Math.random() * 0.3 + 0.1)
      setAudioLevels(testLevels)
      console.log('🎤 Test levels set:', testLevels)
      
      // Start audio visualization
      visualizeAudio()
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      setError('Failed to start recording. Please check microphone permissions.')
      console.error('Recording error:', error)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      // Don't close AudioContext immediately - let it fade out naturally
      setTimeout(() => {
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
      }, 1000)
    }
  }

  // Visualize audio levels with fallback animation
  const visualizeAudio = () => {
    console.log('Starting audio visualization...', analyserRef.current)
    
    if (!analyserRef.current) {
      console.log('No analyser, using fallback animation')
      // Fallback: simple pulsing animation when no analyser is available
      const fallbackAnimation = () => {
        if (!isRecording) return
        const randomLevels = Array.from({length: 20}, () => Math.random() * 0.5 + 0.1)
        setAudioLevels(randomLevels)
        animationFrameRef.current = requestAnimationFrame(fallbackAnimation)
      }
      fallbackAnimation()
      return
    }
    
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    console.log('Audio context setup complete, buffer length:', bufferLength)
    
    const updateLevels = () => {
      if (!analyserRef.current || !isRecording) return
      
      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Create audio level visualization with better sensitivity
      const newLevels = []
      const chunkSize = Math.floor(bufferLength / 20)
      
      let hasSignal = false
      for (let i = 0; i < 20; i++) {
        const start = i * chunkSize
        const chunk = dataArray.slice(start, start + chunkSize)
        const average = chunk.reduce((sum, value) => sum + value, 0) / chunk.length
        
        if (average > 0) hasSignal = true
        
        // Apply logarithmic scaling for better visualization
        const normalized = Math.min(1, (average / 255) * 3.0) // Increased boost
        newLevels.push(normalized)
      }
      
      // Always add some baseline activity for better visualization
      for (let i = 0; i < 20; i++) {
        // Add baseline + signal boost
        const baseline = 0.05 + Math.random() * 0.05
        newLevels[i] = Math.max(newLevels[i], baseline)
        
        // Extra boost for actual signal
        if (hasSignal && newLevels[i] > baseline) {
          newLevels[i] = Math.min(1, newLevels[i] * 1.5)
        }
      }
      
      setAudioLevels(newLevels)
      animationFrameRef.current = requestAnimationFrame(updateLevels)
    }
    
    updateLevels()
  }

  // Send audio to STT API
  const transcribeAudio = async () => {
    if (!audioBlob) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('language', 'auto')
      formData.append('include_segments', 'false')
      formData.append('trim_silence', 'true')
      
      const response = await fetch('http://localhost:8001/api/v1/stt', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`STT API error: ${response.status}`)
      }
      
      const result = await response.json()
      setTranscription(result)
      
      if (!result.text || result.text.trim() === '') {
        setError('No speech detected in the recording. Try speaking louder or closer to the microphone.')
      }
      
    } catch (error) {
      setError('Failed to transcribe audio. Make sure the backend is running on port 8001.')
      console.error('Transcription error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          🎤 Voice Recorder
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Record your voice and see real-time transcription powered by RTX 5090
        </p>
      </div>

      {/* Main Recording Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm p-8">
        
        {/* Audio Visualizer */}
        <div className="flex justify-center items-end gap-2 h-24 mb-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border-2 border-dashed border-gray-200 dark:border-gray-600">
          {audioLevels.map((level, index) => (
            <motion.div
              key={index}
              className={`w-4 rounded-full transition-all duration-150 ${
                isRecording 
                  ? 'bg-gradient-to-t from-red-500 to-red-400 shadow-lg shadow-red-500/50 border border-red-400' 
                  : 'bg-gray-300 dark:bg-gray-600 border border-gray-400'
              }`}
              style={{ 
                height: `${Math.max(8, level * 70)}px`,
                opacity: isRecording ? 0.8 + (level * 0.2) : 0.4,
                minHeight: '6px'
              }}
              animate={{
                scaleY: isRecording ? [1, 1.1, 1] : 1,
                scaleX: isRecording && level > 0.1 ? [1, 1.05, 1] : 1
              }}
              transition={{
                duration: 0.3,
                repeat: isRecording ? Infinity : 0,
                delay: index * 0.02
              }}
            />
          ))}
          {audioLevels.length === 0 && (
            <div className="text-gray-500 text-sm flex items-center justify-center w-full">
              🎤 Audio visualizer will appear when recording starts
            </div>
          )}
          
          {/* Debug info */}
          {isRecording && (
            <div className="absolute top-2 right-2 text-xs text-green-400 bg-black/20 px-2 py-1 rounded">
              🔴 LIVE • {audioLevels.filter(l => l > 0.1).length}/20 active
            </div>
          )}
          
          {/* Manual test button */}
          {!isRecording && (
            <button 
              onClick={() => {
                const testLevels = Array.from({length: 20}, () => Math.random() * 0.8 + 0.1)
                setAudioLevels(testLevels)
                console.log('🧪 Test visualization triggered:', testLevels)
                setTimeout(() => setAudioLevels(new Array(20).fill(0)), 3000)
              }}
              className="absolute top-2 left-2 text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded transition-colors"
            >
              🧪 Test Visualizer
            </button>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center gap-6">
          
          {/* Timer */}
          {isRecording && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-2xl font-mono font-bold text-red-500"
            >
              ⏱️ {formatTime(recordingTime)}
            </motion.div>
          )}
          
          {/* Record Button */}
          <div className="flex gap-4">
            {!isRecording ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className="flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <MicrophoneIcon className="h-8 w-8" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className="flex items-center justify-center w-20 h-20 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <StopIcon className="h-8 w-8" />
              </motion.button>
            )}
            
            {/* Transcribe Button */}
            {audioBlob && !isRecording && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={transcribeAudio}
                disabled={isProcessing}
                className="flex items-center justify-center w-20 h-20 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isProcessing ? (
                  <ArrowPathIcon className="h-8 w-8 animate-spin" />
                ) : (
                  <DocumentTextIcon className="h-8 w-8" />
                )}
              </motion.button>
            )}
          </div>
          
          {/* Status Text */}
          <div className="text-center">
            {isRecording ? (
              <p className="text-red-500 font-medium animate-pulse">🔴 Recording... Click stop when finished</p>
            ) : audioBlob ? (
              <p className="text-green-500 font-medium">✅ Recording complete! Click the document icon to transcribe</p>
            ) : (
              <p className="text-gray-500">Click the microphone to start recording</p>
            )}
          </div>
        </div>

        {/* Audio Playback */}
        {audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <SpeakerWaveIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <audio controls className="flex-1">
                <source src={audioUrl} type="audio/webm" />
                Your browser does not support audio playback.
              </audio>
            </div>
          </motion.div>
        )}

        {/* Processing Status */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-3">
                <ArrowPathIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  🚀 Processing with RTX 5090... This should be lightning fast!
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
            >
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-600 dark:text-red-400 font-medium">Error</p>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcription Results */}
        <AnimatePresence>
          {transcription && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 space-y-4"
            >
              {/* Transcribed Text */}
              <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-600 dark:text-green-400 font-semibold text-lg">
                      Transcription Complete
                    </h3>
                    <p className="text-green-600/80 dark:text-green-400/80 text-sm">
                      Processed by {transcription.device_used} in {transcription.processing_time.toFixed(2)}s
                    </p>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed">
                    "{transcription.text || 'No speech detected'}"
                  </p>
                </div>
              </div>

              {/* Technical Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Language</h4>
                  <p className="text-gray-600 dark:text-gray-300">{transcription.language.toUpperCase()}</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Confidence</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {(transcription.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Processing</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {transcription.processing_time.toFixed(2)}s
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}