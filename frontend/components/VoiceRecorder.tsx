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
  CheckCircleIcon,
  CpuChipIcon,
  ChevronDownIcon
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
  const [llmResponse, setLlmResponse] = useState<any | null>(null)
  const [isLlmProcessing, setIsLlmProcessing] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('default')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0))
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const shouldAnimateRef = useRef<boolean>(false)

  // Fetch available models from backend
  const fetchAvailableModels = async () => {
    try {
      setIsLoadingModels(true)
      const response = await fetch('http://localhost:8001/api/v1/models')
      
      if (response.ok) {
        const data = await response.json()
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models)
          // Set default to current default from backend, or first available
          setSelectedModel(data.current_default || data.models[0] || 'default')
          console.log('🤖 Available models loaded:', data.models)
        }
      } else {
        console.error('Failed to fetch models:', response.status)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      // Fallback to default
      setAvailableModels(['default'])
      setSelectedModel('default')
    } finally {
      setIsLoadingModels(false)
    }
  }

  // Stop current audio and cancel any pending requests
  const stopAudioAndRequests = () => {
    console.log('🛑 Stopping audio and canceling requests...')
    
    // Stop current audio playback
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setCurrentAudio(null)
      console.log('🔇 Audio playback stopped')
    }
    
    // Cancel pending HTTP requests
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      console.log('🚫 HTTP requests canceled')
    }
    
    // Reset processing states
    setIsLlmProcessing(false)
    setIsProcessing(false)
    
    console.log('✅ Stop completed')
  }

  // Load models when component mounts
  useEffect(() => {
    fetchAvailableModels()
  }, [])

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
      analyserRef.current.smoothingTimeConstant = 0.3 // Less smoothing for more responsiveness
      analyserRef.current.minDecibels = -90 // Lower threshold to catch quiet sounds
      analyserRef.current.maxDecibels = -10 // Higher range for better sensitivity
      
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        bitsPerSecond: 128000, // Add explicit bitrate
        videoBitsPerSecond: 0   // Ensure no video
      })
      
      console.log('🔊 MediaRecorder created with state:', mediaRecorderRef.current.state)
      
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
        console.log('📀 MediaRecorder data available:', event.data.size, 'bytes')
        audioChunks.push(event.data)
      }
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🚫 MediaRecorder ONSTOP event fired - this might be the culprit!')
        console.log('🚫 MediaRecorder state:', mediaRecorderRef.current?.state)
        console.log('🚫 Current isRecording state:', isRecording)
        
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
        // Don't automatically change isRecording state here
        // Let the user-initiated stopRecording() function control the UI state
        console.log('🚫 MediaRecorder stopped, but NOT changing isRecording state automatically')
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        console.log('📀 Audio blob created:', blob.size, 'bytes')
      }
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('🚨 MediaRecorder ERROR:', event)
        console.error('🚨 MediaRecorder state:', mediaRecorderRef.current?.state)
      }
      
      mediaRecorderRef.current.onstart = () => {
        console.log('🎤 MediaRecorder STARTED successfully')
        console.log('🎤 MediaRecorder state:', mediaRecorderRef.current?.state)
      }
      
      mediaRecorderRef.current.onpause = () => {
        console.log('⏸️ MediaRecorder PAUSED - unexpected!')
      }
      
      mediaRecorderRef.current.onresume = () => {
        console.log('▶️ MediaRecorder RESUMED')
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      console.log('🔴 RECORDING STATE SET TO TRUE')
      
      // Start independent animation system
      startIndependentAnimation()
      
      // Also try real audio visualization
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

  // Stop recording with independent animation control
  const stopRecording = () => {
    console.log('🚫 STOP RECORDING CALLED by user')
    
    // Stop MediaRecorder if it's recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('🚫 Stopping MediaRecorder...')
      mediaRecorderRef.current.stop()
    }
    
    // Stop our independent animation
    stopIndependentAnimation()
    
    // Stop real audio visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    // Update UI state
    setIsRecording(false)
    console.log('🔴 RECORDING STATE SET TO FALSE by user action')
    
    // Don't close AudioContext immediately - let it fade out naturally
    setTimeout(() => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }, 1000)
  }

  // Independent animation system that runs separately from MediaRecorder
  const startIndependentAnimation = () => {
    console.log('🔥 Starting INDEPENDENT animation system - completely separate from MediaRecorder!')
    
    setIsAnimating(true)
    shouldAnimateRef.current = true // Use ref to avoid closure issues
    let animationCount = 0
    
    // Clear any existing animation
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
    }
    
    animationIntervalRef.current = setInterval(() => {
      animationCount++
      
      // Only stop when we explicitly stop the animation using ref
      if (!shouldAnimateRef.current) {
        console.log('🌊 Independent animation stopped by explicit stop')
        setAudioLevels(new Array(20).fill(0.1))
        setIsAnimating(false)
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current)
          animationIntervalRef.current = null
        }
        return
      }
      
      // Create beautiful flowing animation
      const time = Date.now() / 1000
      const newLevels = Array.from({length: 20}, (_, i) => {
        const wave1 = Math.sin(time * 2 + i * 0.3) * 0.15 + 0.3
        const wave2 = Math.cos(time * 1.5 + i * 0.4) * 0.1 + 0.2
        const noise = Math.random() * 0.05 // Add some natural variation
        return Math.max(0.1, Math.min(0.6, wave1 + wave2 + noise))
      })
      
      // Log less frequently to reduce console spam
      if (animationCount % 30 === 0) { // Every 3 seconds
        console.log(`🌊 Independent Animation #${animationCount}: shouldAnimate: ${shouldAnimateRef.current}, isRecording: ${isRecording}`)
      }
      
      setAudioLevels(newLevels.slice())
      setUpdateTrigger(prev => (prev + 1) % 1000)
      
      // Safety timeout after 10 minutes
      if (animationCount > 6000) {
        console.log('🚨 Independent animation timeout after 10 minutes - stopping')
        shouldAnimateRef.current = false
      }
      
    }, 100) // Update every 100ms
    
    console.log('🚀 Independent animation started with interval:', animationIntervalRef.current)
  }
  
  const stopIndependentAnimation = () => {
    console.log('🚫 Stopping independent animation')
    shouldAnimateRef.current = false // Use ref to immediately stop
    setIsAnimating(false)
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
        
        // Apply extreme scaling for tiny microphone changes
        let normalized = (average / 255) * 50.0 // EXTREME 50x boost!
        
        // Add massive boost for any signal at all
        if (average > 0.5) {
          normalized = Math.min(1, normalized * 5.0) // 5x boost for any detected signal
        }
        
        // Amplify small differences 
        if (normalized > 0.05) {
          normalized = Math.pow(normalized, 0.5) // Square root to spread small values
        }
        
        newLevels.push(normalized)
      }
      
      // Always add some baseline activity for better visualization
      for (let i = 0; i < 20; i++) {
        // Add stronger baseline + signal boost
        const baseline = 0.1 + Math.random() * 0.05 // Higher baseline
        newLevels[i] = Math.max(newLevels[i], baseline)
        
        // Massive boost for any actual signal
        if (hasSignal && newLevels[i] > baseline) {
          newLevels[i] = Math.min(1, newLevels[i] * 3.0) // Triple boost!
        }
      }
      
      // Force React updates with new array reference
      setAudioLevels([...newLevels])
      setUpdateTrigger(prev => (prev + 1) % 1000) // Trigger re-renders
      
      // Debug logging every 60 frames (~1 second)
      if (Math.random() < 0.016) {
        const maxLevel = Math.max(...newLevels)
        const avgSignal = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
        const activeCount = newLevels.filter(l => l > 0.15).length
        console.log(`🔊 Levels: [${newLevels.slice(0,5).map(l => l.toFixed(2)).join(',')}...] Max:${maxLevel.toFixed(2)} Active:${activeCount}/20`)
      }
      
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

  // Send audio to Voice Chat pipeline (STT + LLM + TTS)
  const processVoiceChat = async () => {
    if (!audioBlob) return
    
    setIsLlmProcessing(true)
    setError(null)
    setLlmResponse(null)
    
    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)
    
    try {
      console.log(`🤖 Starting Voice Chat pipeline (STT + LLM + TTS) with model: ${selectedModel}...`)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('voice', 'en-US-AvaNeural') // Add voice parameter for TTS
      formData.append('model', selectedModel) // Use selected model
      formData.append('language', 'auto')
      
      const response = await fetch('http://localhost:8001/api/v1/voice-chat', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      
      if (!response.ok) {
        throw new Error(`Voice Chat API error: ${response.status}`)
      }
      
      // Get metadata from headers
      const transcript = response.headers.get('X-Transcript') || 'No transcript'
      const transcriptLanguage = response.headers.get('X-Transcript-Language') || 'unknown'
      const transcriptConfidence = parseFloat(response.headers.get('X-Transcript-Confidence') || '0')
      const transcriptDevice = response.headers.get('X-Transcript-Device') || 'unknown'
      const llmResponse = response.headers.get('X-LLM-Response') || 'No response'
      const llmReasoning = response.headers.get('X-LLM-Reasoning') || ''
      const llmModel = response.headers.get('X-LLM-Model') || selectedModel
      const llmTokens = parseInt(response.headers.get('X-LLM-Tokens') || '0')
      const sttTime = parseFloat(response.headers.get('X-STT-Time') || '0')
      const llmTime = parseFloat(response.headers.get('X-LLM-Time') || '0')
      const ttsTime = parseFloat(response.headers.get('X-TTS-Time') || '0')
      
      // Debug: Log ALL available headers
      console.log('🔍 ALL Response Headers:', Array.from(response.headers.entries()))
      
      console.log('✨ Voice Chat Response received:', { transcript, llmResponse, llmReasoning, sttTime, llmTime, ttsTime })
      console.log('🔍 Enhanced transcription data:', {
        transcript,
        language: transcriptLanguage,
        confidence: transcriptConfidence,
        device: transcriptDevice,
        model: llmModel,
        tokens: llmTokens,
        hasReasoning: !!llmReasoning
      })
      
      // Get audio blob from response
      const responseAudioBlob = await response.blob()
      
      // Play the audio automatically
      console.log('🔊 Playing TTS audio response...')
      try {
        const audioUrl = URL.createObjectURL(responseAudioBlob)
        const audio = new Audio(audioUrl)
        setCurrentAudio(audio) // Track current audio
        
        audio.onloadeddata = () => {
          console.log('🎵 TTS audio loaded, playing...')
          audio.play().catch(e => console.error('Audio play error:', e))
        }
        
        audio.onended = () => {
          console.log('🎵 TTS audio playback finished')
          setCurrentAudio(null) // Clear current audio
          URL.revokeObjectURL(audioUrl)
        }
        
        audio.onerror = (e) => {
          console.error('🚨 TTS audio playback error:', e)
          setCurrentAudio(null) // Clear current audio on error
        }
      } catch (audioError) {
        console.error('🚨 Error processing TTS audio:', audioError)
      }
      
      // Create result object for display
      const result = {
        transcript,
        transcript_details: {
          text: transcript,
          language: transcriptLanguage,
          confidence: transcriptConfidence,
          device: transcriptDevice
        },
        llm_response: llmResponse,
        llm_reasoning: llmReasoning,
        llm_details: {
          model: llmModel,
          tokens: llmTokens,
          response: llmResponse,
          reasoning: llmReasoning
        },
        processing_time: {
          stt: sttTime,
          llm: llmTime,
          tts: ttsTime
        }
      }
      
      console.log('🔍 Setting LLM Response with result:', result)
      setLlmResponse(result)
      
      // Set the transcription with enhanced STT data
      if (result.transcript_details) {
        setTranscription({
          text: result.transcript_details.text,
          language: result.transcript_details.language,
          confidence: result.transcript_details.confidence,
          processing_time: result.processing_time?.stt || 0,
          device_used: result.transcript_details.device,
          audio_info: {},
          voice_activity: {}
        })
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🚫 Voice chat request was canceled')
        setError('Voice chat was stopped')
      } else {
        setError('Failed to process voice chat. Make sure the backend and LM Studio are running.')
        console.error('Voice Chat error:', error)
      }
    } finally {
      setIsLlmProcessing(false)
      setAbortController(null)
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
      // Stop audio and cancel requests
      stopAudioAndRequests()
      
      // Stop independent animation
      shouldAnimateRef.current = false
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
      }
      setIsAnimating(false)
      
      // Stop real audio visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      
      // Close AudioContext
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

      {/* Model Selector */}
      <div className="mb-6">
        <div className="max-w-md mx-auto">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🤖 LM Studio Model
          </label>
          <div className="relative">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoadingModels || isLlmProcessing}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10"
            >
              {isLoadingModels ? (
                <option value="loading">Loading models...</option>
              ) : availableModels.length === 0 ? (
                <option value="default">No models available</option>
              ) : (
                availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model.replace('bytedance/', '').replace('seed-', '')}
                  </option>
                ))
              )}
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          
          {availableModels.length > 0 && (
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>📊 {availableModels.length} models available</span>
              <button 
                onClick={fetchAvailableModels}
                disabled={isLoadingModels}
                className="text-purple-500 hover:text-purple-600 disabled:opacity-50"
              >
                {isLoadingModels ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Recording Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm p-8">
        
        {/* Audio Visualizer */}
        <div className="flex justify-center items-end gap-2 h-32 mb-8 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border-2 border-dashed border-gray-200 dark:border-gray-600">
          {audioLevels.map((level, index) => (
            <motion.div
              key={`bar-${index}-${updateTrigger}`} // Force re-render with changing key
              className={`w-4 rounded-full transition-all duration-150 ${
                (isRecording || isAnimating) 
                  ? 'bg-gradient-to-t from-red-500 to-red-400 shadow-lg shadow-red-500/50 border border-red-400' 
                  : 'bg-gray-300 dark:bg-gray-600 border border-gray-400'
              }`}
              style={{ 
                height: `${Math.max(12, level * 200)}px`, // Massive 200px multiplier!
                opacity: (isRecording || isAnimating) ? 0.6 + (level * 0.4) : 0.4,
                minHeight: '12px', // Higher minimum
                transform: `scaleY(${1 + level * 2})` // Additional scaling
              }}
              animate={{
                scaleY: (isRecording || isAnimating) ? [1, 1.1, 1] : 1,
                scaleX: (isRecording || isAnimating) && level > 0.1 ? [1, 1.05, 1] : 1
              }}
              transition={{
                duration: 0.1, // Much faster transitions
                ease: "easeOut",
                repeat: 0 // No infinite repeat - let real data drive animation
              }}
            />
          ))}
          {audioLevels.length === 0 && (
            <div className="text-gray-500 text-sm flex items-center justify-center w-full">
              🎤 Audio visualizer will appear when recording starts
            </div>
          )}
          
          {/* Debug info */}
          {(isRecording || isAnimating) && (
            <div className="absolute top-2 right-2 text-xs text-green-400 bg-black/20 px-2 py-1 rounded">
              🔴 {isRecording ? 'REC' : 'ANIM'} • {audioLevels.filter(l => l > 0.1).length}/20 active • #{updateTrigger % 100}
            </div>
          )}
          
          {/* Manual test button */}
          {!isRecording && !isAnimating && (
            <button 
              onClick={() => {
                const testLevels = Array.from({length: 20}, () => Math.random() * 0.4 + 0.1) // Keep within bounds
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

            {/* OSS36B LLM Button */}
            {audioBlob && !isRecording && (
              <motion.button
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={processVoiceChat}
                disabled={isLlmProcessing}
                className="flex items-center justify-center w-20 h-20 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                title={`Process with ${selectedModel.replace('bytedance/', '').replace('seed-', '')}`}
              >
                {isLlmProcessing ? (
                  <ArrowPathIcon className="h-8 w-8 animate-spin" />
                ) : (
                  <CpuChipIcon className="h-8 w-8" />
                )}
              </motion.button>
            )}

            {/* Stop Button */}
            {(isLlmProcessing || isProcessing || currentAudio) && (
              <motion.button
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopAudioAndRequests}
                className="flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                title="Stop Audio and Cancel Requests"
              >
                <StopIcon className="h-8 w-8" />
              </motion.button>
            )}
          </div>
          
          {/* Status Text */}
          <div className="text-center">
            {isRecording ? (
              <p className="text-red-500 font-medium animate-pulse">🔴 Recording... Click stop when finished</p>
            ) : audioBlob ? (
              <p className="text-green-500 font-medium">✅ Recording complete! 📄 Transcribe or 🤖 Process with {selectedModel.replace('bytedance/', '').replace('seed-', '')}</p>
            ) : (
              <p className="text-gray-500">Click the microphone to start recording</p>
            )}
            
            {/* Model Status */}
            {selectedModel !== 'default' && !isRecording && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                🤖 Ready with {selectedModel.replace('bytedance/', '').replace('seed-', '')}
              </p>
            )}
            
            {/* Stop Instructions */}
            {(isLlmProcessing || isProcessing || currentAudio) && (
              <p className="text-red-500 text-sm mt-2 animate-pulse">
                🛑 Click the red stop button to cancel
              </p>
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

        {/* LLM Processing Status */}
        <AnimatePresence>
          {isLlmProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-center gap-3">
                <ArrowPathIcon className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  🤖 Processing with OSS36B on LM Studio... Generating intelligent response!
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

        {/* Enhanced Conversation Flow */}
        <AnimatePresence>
          {llmResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 space-y-4"
            >
              {/* User Speech (What you said) */}
              <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3 mb-4">
                  <MicrophoneIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-blue-600 dark:text-blue-400 font-semibold text-lg">
                      🎤 What You Said
                    </h3>
                    <div className="flex items-center gap-4 text-blue-600/80 dark:text-blue-400/80 text-sm">
                      <span>Language: {llmResponse.transcript_details?.language?.toUpperCase() || 'Unknown'}</span>
                      <span>Confidence: {((llmResponse.transcript_details?.confidence || 0) * 100).toFixed(1)}%</span>
                      <span>Device: {llmResponse.transcript_details?.device || 'Unknown'}</span>
                      <span>Time: {llmResponse.processing_time?.stt?.toFixed(2) || 0}s</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed">
                    "{llmResponse.transcript || 'No speech detected'}"
                  </p>
                </div>
              </div>

              {/* AI Thinking Process (if available) */}
              {llmResponse.llm_reasoning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <ArrowPathIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-yellow-600 dark:text-yellow-400 font-semibold text-lg">
                        🤔 AI Thinking Process
                      </h3>
                      <p className="text-yellow-600/80 dark:text-yellow-400/80 text-sm">
                        How the AI reasoned through your question
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap text-sm">
                      {llmResponse.llm_reasoning}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* AI Response (What Ava said) */}
              <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3 mb-4">
                  <SpeakerWaveIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-purple-600 dark:text-purple-400 font-semibold text-lg">
                      🎙️ Ava's Response
                    </h3>
                    <div className="flex items-center gap-4 text-purple-600/80 dark:text-purple-400/80 text-sm">
                      <span>Model: {llmResponse.llm_details?.model?.replace('bytedance/', '').replace('seed-', '') || selectedModel}</span>
                      <span>Tokens: {llmResponse.llm_details?.tokens || 0}</span>
                      <span>Time: {llmResponse.processing_time?.llm?.toFixed(2) || 0}s</span>
                      <span>TTS: {llmResponse.processing_time?.tts?.toFixed(2) || 0}s</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed whitespace-pre-wrap">
                    {llmResponse.llm_response || 'No response generated'}
                  </p>
                </div>
              </div>
              
              {/* Pipeline Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🎤 Speech Processing</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-2xl font-mono">
                    {llmResponse.processing_time?.stt?.toFixed(2) || 0}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">STT on {llmResponse.transcript_details?.device}</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🤖 AI Processing</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-2xl font-mono">
                    {llmResponse.processing_time?.llm?.toFixed(2) || 0}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{llmResponse.llm_details?.tokens || 0} tokens</p>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🎧 Voice Synthesis</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-2xl font-mono">
                    {llmResponse.processing_time?.tts?.toFixed(2) || 0}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">TTS Generation</p>
                </div>
              </div>
              
              {/* Total Processing Time */}
              <div className="mt-4 text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">⚡ Total Pipeline Time</h4>
                <p className="text-green-600 dark:text-green-300 text-3xl font-mono font-bold">
                  {((llmResponse.processing_time?.stt || 0) + (llmResponse.processing_time?.llm || 0) + (llmResponse.processing_time?.tts || 0)).toFixed(2)}s
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">Voice-to-Voice Complete Pipeline</p>
              </div>
              
            </motion.div>
          )}
        </AnimatePresence>

        {/* STT-Only Transcription Results (when not using voice chat) */}
        <AnimatePresence>
          {transcription && !llmResponse && (
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
                      🎤 Speech Transcription
                    </h3>
                    <div className="flex items-center gap-4 text-green-600/80 dark:text-green-400/80 text-sm">
                      <span>Language: {transcription.language.toUpperCase()}</span>
                      <span>Confidence: {(transcription.confidence * 100).toFixed(1)}%</span>
                      <span>Device: {transcription.device_used}</span>
                      <span>Time: {transcription.processing_time.toFixed(2)}s</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed">
                    "{transcription.text || 'No speech detected'}"
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