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
  const [showReasoningPanel, setShowReasoningPanel] = useState<boolean>(false)
  const [fullReasoningData, setFullReasoningData] = useState<string>('')
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string
    timestamp: Date
    userInput: string
    userInputDetails: {
      language: string
      confidence: number
      device: string
      processingTime: number
    }
    aiResponse: string
    aiReasoning: string
    aiDetails: {
      model: string
      tokens: number
      processingTime: number
    }
    ttsTime: number
  }>>([])
  const [showConversationHistory, setShowConversationHistory] = useState<boolean>(false)
  const [textInput, setTextInput] = useState<string>('')
  const [showTextInput, setShowTextInput] = useState<boolean>(false)
  const [realtimeTranscription, setRealtimeTranscription] = useState<string>('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [primaryFileIndex, setPrimaryFileIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<boolean>(false)
  const [isTextInputRecording, setIsTextInputRecording] = useState<boolean>(false)
  const [textInputRecorder, setTextInputRecorder] = useState<MediaRecorder | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false)
  const [audioProgress, setAudioProgress] = useState<number>(0)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [audioVolume, setAudioVolume] = useState<number>(1.0)
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0)
  const [isSeekingAudio, setIsSeekingAudio] = useState<boolean>(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected')
  const [lastProcessedFiles, setLastProcessedFiles] = useState<string[]>([])
  
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
          
          // Check for saved model preference
          const savedModel = localStorage.getItem('voice-bridge-selected-model')
          let modelToSelect = data.current_default || data.models[0] || 'default'
          
          // Use saved model if it's still available
          if (savedModel && data.models.includes(savedModel)) {
            modelToSelect = savedModel
            console.log('💾 Restored saved model preference:', savedModel)
          }
          
          setSelectedModel(modelToSelect)
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
  
  // Save model selection to localStorage when it changes
  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    localStorage.setItem('voice-bridge-selected-model', model)
    console.log('💾 Saved model preference:', model)
  }

  // Process text input (pasted or typed text) with optional files
  const processTextInput = async (retryCount = 0) => {
    const maxRetries = 2
    
    if (!textInput.trim() && uploadedFiles.length === 0) {
      setError('Please enter some text or upload files to process')
      return
    }

    try {
      setIsLlmProcessing(true)
      setError(null)
      setConnectionStatus('connecting')
      setProcessingStatus('Preparing request...')
      
      const controller = new AbortController()
      setAbortController(controller)
      
      console.log('🤖 Processing text input with LLM:', textInput)
      console.log('📁 Including files:', uploadedFiles.map(f => f.name))
      console.log('🎯 Primary file index:', primaryFileIndex)
      
      // 🔍 CRITICAL DEBUG INFO for file upload issue
      console.log('🚨 DETAILED FILE DEBUG:')
      uploadedFiles.forEach((file, index) => {
        console.log(`File ${index}:`, {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString(),
          isPrimary: index === primaryFileIndex
        })
        
        // For images, show first few bytes as hex for fingerprinting
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer
            if (arrayBuffer) {
              const bytes = new Uint8Array(arrayBuffer.slice(0, 20))
              const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ')
              console.log(`🖼️ Image ${index} (${file.name}) fingerprint:`, hex)
            }
          }
          reader.readAsArrayBuffer(file.slice(0, 20))
        }
      })
      
      // Create FormData for multimodal support
      const formData = new FormData()
      
      // If we have image files but no text input, provide a better default prompt
      let processedTextInput = textInput
      if (!textInput.trim() && uploadedFiles.length > 0) {
        const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'))
        if (imageFiles.length > 0) {
          processedTextInput = "Please describe what you see in this image in a natural, conversational way. Focus on the main subject and interesting details, but keep it concise and engaging."
        }
      }
      
      formData.append('text_input', processedTextInput)
      formData.append('selected_model', selectedModel)
      
      // Add response style preference for images
      if (uploadedFiles.some(f => f.type.startsWith('image/'))) {
        formData.append('response_style', 'conversational_description')
        formData.append('avoid_metadata', 'true')
      }
      
      // Add primary file index if specified
      if (primaryFileIndex !== null) {
        formData.append('primary_file_index', primaryFileIndex.toString())
      }
      
      // Add all uploaded files with metadata
      console.log('📦 BUILDING FORMDATA:')
      uploadedFiles.forEach((file, index) => {
        console.log(`🖼️ Adding file ${index}:`, {
          name: file.name,
          type: file.type, 
          size: file.size,
          isPrimary: index === primaryFileIndex
        })
        
        formData.append(`file_${index}`, file)
        formData.append(`file_${index}_name`, file.name)
        formData.append(`file_${index}_type`, file.type)
        formData.append(`file_${index}_size`, file.size.toString())
        formData.append(`file_${index}_last_modified`, file.lastModified.toString())
        formData.append(`file_${index}_is_primary`, (index === primaryFileIndex).toString())
      })
      
      // Add total file count
      formData.append('total_files', uploadedFiles.length.toString())
      
      console.log('🚀 FormData ready with', uploadedFiles.length, 'files. Primary index:', primaryFileIndex)
      
      setProcessingStatus(`Sending request with ${uploadedFiles.length} files...`)
      setConnectionStatus('connecting')
      
      const response = await fetch('http://localhost:8001/api/v1/voice-chat', {
        method: 'POST',
        body: formData, // Use FormData instead of JSON for file upload
        signal: controller.signal
      })
      
      if (!response.ok) {
        // Get detailed error info from backend
        let errorDetails = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorText = await response.text()
          if (errorText) {
            console.error('🚨 Backend Error Details:', errorText)
            errorDetails += ` - ${errorText.substring(0, 200)}`
          }
        } catch (e) {
          console.error('🚨 Could not read error details:', e)
        }
        
        // Special handling for image processing errors
        if (response.status === 500 && uploadedFiles.some(f => f.type.startsWith('image/'))) {
          errorDetails += '\n\nThis might be an image processing issue. Check if:';
          errorDetails += '\n- The image file is corrupted or in an unsupported format'
          errorDetails += '\n- The backend has enough memory to process large images'
          errorDetails += '\n- The multimodal LLM is properly configured'
          errorDetails += `\n- Image size: ${uploadedFiles.find(f => f.type.startsWith('image/'))?.size} bytes`
        }
        
        throw new Error(errorDetails)
      }
      
      // Get all the enhanced metadata from headers (same as voice processing)
      const llmResponse = response.headers.get('X-LLM-Response')
      const llmReasoning = response.headers.get('X-LLM-Reasoning')
      const llmModel = response.headers.get('X-LLM-Model')
      const llmTokens = parseInt(response.headers.get('X-LLM-Tokens') || '0')
      const llmTime = parseFloat(response.headers.get('X-LLM-Processing-Time') || '0')
      const ttsTime = parseFloat(response.headers.get('X-TTS-Processing-Time') || '0')
      const usedFiles = response.headers.get('X-Used-Files') ? JSON.parse(response.headers.get('X-Used-Files') || '[]') : []
      const primaryFile = response.headers.get('X-Primary-File') || ''
      const fileCount = parseInt(response.headers.get('X-File-Count') || '0')
      
      console.log('📁 Files processed:', { usedFiles, primaryFile, fileCount })
      setLastProcessedFiles(usedFiles)
      setConnectionStatus('connected')
      setProcessingStatus(`Successfully processed ${fileCount} files. Playing response...`)
      
      // Get audio blob and play it
      const responseAudioBlob = await response.blob()
      
      console.log('🔊 Playing TTS audio response...')
      try {
        const audioUrl = URL.createObjectURL(responseAudioBlob)
        const audio = new Audio(audioUrl)
        setCurrentAudio(audio)
        
        audio.onloadeddata = () => {
          console.log('🎵 TTS audio loaded, playing...')
          setAudioDuration(audio.duration || 0)
          setIsAudioPlaying(true)
          audio.volume = audioVolume
          audio.playbackRate = audioSpeed
          audio.play().catch(e => console.error('Audio play error:', e))
        }
        
        audio.onplay = () => {
          setIsAudioPlaying(true)
        }
        
        audio.onpause = () => {
          setIsAudioPlaying(false)
        }
        
        audio.ontimeupdate = () => {
          setAudioProgress(audio.currentTime || 0)
        }
        
        audio.onended = () => {
          console.log('🎵 TTS audio playback finished')
          setCurrentAudio(null)
          setIsAudioPlaying(false)
          setAudioProgress(0)
          setAudioDuration(0)
          URL.revokeObjectURL(audioUrl)
        }
      } catch (audioError) {
        console.error('🚨 Error processing TTS audio:', audioError)
      }
      
      // Create result object for display
      const result = {
        transcript: textInput, // Use the input text as "transcript"
        transcript_details: {
          text: textInput,
          language: 'text-input',
          confidence: 1.0,
          device: 'Text Input'
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
          stt: 0, // No STT for text input
          llm: llmTime,
          tts: ttsTime
        }
      }
      
      setLlmResponse(result)
      
      // Set full reasoning data
      if (llmReasoning && llmReasoning.trim()) {
        setFullReasoningData(llmReasoning)
      }
      
      // Add to conversation history
      const newConversationEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        userInput: textInput,
        userInputDetails: {
          language: 'text-input',
          confidence: 1.0,
          device: 'Text Input',
          processingTime: 0
        },
        aiResponse: llmResponse || '',
        aiReasoning: llmReasoning || '',
        aiDetails: {
          model: llmModel || selectedModel,
          tokens: llmTokens,
          processingTime: llmTime
        },
        ttsTime: ttsTime
      }
      
      setConversationHistory(prev => {
        const updated = [...prev, newConversationEntry]
        const toSave = updated.slice(-50)
        localStorage.setItem('voice-bridge-conversation-history', JSON.stringify(
          toSave.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString()
          }))
        ))
        return updated
      })
      
      // Clear the text input and uploaded files
      setTextInput('')
      setUploadedFiles([])
      setPrimaryFileIndex(null)
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🙫 Text processing request was canceled')
        setError('Text processing was stopped')
      } else {
        // Categorize errors for better user experience
        let errorMessage = 'Failed to process text input.'
        
        if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
          
          // Retry on network errors
          if (retryCount < maxRetries) {
            console.log(`🔄 Retrying request (${retryCount + 1}/${maxRetries})...`)
            setTimeout(() => processTextInput(retryCount + 1), 1000 * (retryCount + 1))
            return
          } else {
            errorMessage += ' Retries exhausted.'
          }
        } else if (error.message?.includes('422')) {
          errorMessage = 'Invalid input format. Please check your files and text.'
        } else if (error.message?.includes('500')) {
          errorMessage = 'Server error. The backend service may be unavailable.'
        } else if (error.message?.includes('404')) {
          errorMessage = 'Service endpoint not found. Please check the backend configuration.'
        }
        
        setError(errorMessage)
        console.error('Text processing error:', { error, retryCount, maxRetries })
      }
    } finally {
      setIsLlmProcessing(false)
      setAbortController(null)
      setProcessingStatus('')
      setConnectionStatus('disconnected')
    }
  }

  // Replay TTS for any given text with full professional audio controls
  const replayTTS = async (text: string, buttonId?: string) => {
    if (!text || !text.trim()) {
      console.log('No text to replay')
      return
    }

    try {
      console.log('🔊 Replaying TTS for text:', text.substring(0, 50) + '...')
      
      // Stop any currently playing audio first
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
        setIsAudioPlaying(false)
        setAudioProgress(0)
        setAudioDuration(0)
      }
      
      // Disable the button temporarily
      if (buttonId) {
        const button = document.getElementById(buttonId) as HTMLButtonElement
        if (button) {
          button.disabled = true
          button.textContent = '🔄 Playing...'
        }
      }
      
      const response = await fetch('http://localhost:8001/api/v1/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text
        })
      })
      
      if (!response.ok) {
        throw new Error(`TTS error! status: ${response.status}`)
      }
      
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      // Set as current audio with full professional controls
      setCurrentAudio(audio)
      
      audio.onloadeddata = () => {
        console.log('🎵 TTS replay audio loaded, playing...')
        setAudioDuration(audio.duration || 0)
        setIsAudioPlaying(true)
        audio.volume = audioVolume
        audio.playbackRate = audioSpeed
        audio.play().catch(e => console.error('TTS replay error:', e))
      }
      
      audio.onplay = () => {
        setIsAudioPlaying(true)
      }
      
      audio.onpause = () => {
        setIsAudioPlaying(false)
      }
      
      audio.ontimeupdate = () => {
        setAudioProgress(audio.currentTime || 0)
      }
      
      audio.onended = () => {
        console.log('🎵 TTS replay audio playback finished')
        setCurrentAudio(null)
        setIsAudioPlaying(false)
        setAudioProgress(0)
        setAudioDuration(0)
        URL.revokeObjectURL(audioUrl)
        
        // Re-enable button
        if (buttonId) {
          const button = document.getElementById(buttonId) as HTMLButtonElement
          if (button) {
            button.disabled = false
            button.textContent = '🔊 Read Aloud'
          }
        }
      }
      
      audio.onerror = (e) => {
        console.error('🚨 TTS replay audio playback error:', e)
        setCurrentAudio(null)
        setIsAudioPlaying(false)
        setAudioProgress(0)
        setAudioDuration(0)
        
        // Re-enable button
        if (buttonId) {
          const button = document.getElementById(buttonId) as HTMLButtonElement
          if (button) {
            button.disabled = false
            button.textContent = '🔊 Read Aloud'
          }
        }
      }
      
    } catch (error) {
      console.error('🚨 TTS replay failed:', error)
      // Re-enable button
      if (buttonId) {
        const button = document.getElementById(buttonId) as HTMLButtonElement
        if (button) {
          button.disabled = false
          button.textContent = '🔊 Read Aloud'
        }
      }
    }
  }

  // Speech-to-text for text input field
  const startTextInputRecording = async () => {
    try {
      setError(null)
      setIsTextInputRecording(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        await processTextInputSpeech(audioBlob)
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop())
        setTextInputRecorder(null)
        setIsTextInputRecording(false)
      }
      
      recorder.start()
      setTextInputRecorder(recorder)
      console.log('🎤 Started text input speech recording')
      
    } catch (error) {
      console.error('Error starting text input recording:', error)
      setError('Failed to start recording. Please check microphone permissions.')
      setIsTextInputRecording(false)
    }
  }
  
  const stopTextInputRecording = () => {
    if (textInputRecorder && textInputRecorder.state === 'recording') {
      textInputRecorder.stop()
      console.log('🛑 Stopped text input speech recording')
    }
  }
  
  const processTextInputSpeech = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)
      console.log('🎯 Processing text input speech with Whisper...', audioBlob.size, 'bytes')
      
      const formData = new FormData()
      formData.append('file', audioBlob, 'text_input_recording.wav')
      
      const response = await fetch('http://localhost:8001/api/v1/transcribe', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ Text input speech transcribed:', result.text)
      
      // Append the transcribed text to the existing text input
      if (result.text && result.text.trim()) {
        const newText = textInput ? textInput + ' ' + result.text.trim() : result.text.trim()
        setTextInput(newText)
      }
      
    } catch (error) {
      console.error('Error processing text input speech:', error)
      setError('Failed to transcribe speech. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle paste functionality
  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setTextInput(clipboardText)
      console.log('📋 Pasted text from clipboard:', clipboardText.substring(0, 50) + '...')
    } catch (error) {
      console.error('Failed to paste from clipboard:', error)
      setError('Failed to paste from clipboard. You can manually paste using Ctrl+V in the text area.')
    }
  }

  // File upload handling
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files)
    const validFiles: File[] = []
    const maxSize = 50 * 1024 * 1024 // 50MB limit
    
    for (const file of newFiles) {
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 50MB.`)
        continue
      }
      
      // Accept most common file types for multimodal processing
      const allowedTypes = [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
        // Documents
        'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Audio
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
        // Video
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv',
        // Code files
        'text/javascript', 'text/typescript', 'text/html', 'text/css', 'application/json',
        'text/x-python', 'text/x-java', 'text/x-c', 'text/x-cpp'
      ]
      
      if (allowedTypes.includes(file.type) || file.type.startsWith('text/')) {
        validFiles.push(file)
      } else {
        console.warn(`File type ${file.type} not explicitly supported, but will attempt to process:`, file.name)
        validFiles.push(file) // Still allow - let the backend decide
      }
    }
    
    setUploadedFiles(prev => {
      const combined = [...prev, ...validFiles]
      // If no primary is set yet, default to the first file
      if (combined.length > 0 && primaryFileIndex === null) {
        setPrimaryFileIndex(0)
      }
      return combined
    })
    console.log('📁 Added files:', validFiles.map(f => `${f.name} (${f.type})`).join(', '))
  }

  // Remove uploaded file
  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index)
      // Adjust primary file index if needed
      if (primaryFileIndex === index) {
        setPrimaryFileIndex(null) // Reset primary if it was the removed file
      } else if (primaryFileIndex !== null && primaryFileIndex > index) {
        setPrimaryFileIndex(primaryFileIndex - 1) // Shift down if primary was after removed file
      }
      return newFiles
    })
  }
  
  // Set primary file
  const setPrimaryFile = (index: number) => {
    setPrimaryFileIndex(index)
  }
  
  // Move file up/down in the list
  const moveFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= uploadedFiles.length) return
    
    setUploadedFiles(prev => {
      const newFiles = [...prev]
      const [movedFile] = newFiles.splice(fromIndex, 1)
      newFiles.splice(toIndex, 0, movedFile)
      
      // Update primary file index if needed
      if (primaryFileIndex === fromIndex) {
        setPrimaryFileIndex(toIndex)
      } else if (primaryFileIndex !== null) {
        if (fromIndex < primaryFileIndex && toIndex >= primaryFileIndex) {
          setPrimaryFileIndex(primaryFileIndex - 1)
        } else if (fromIndex > primaryFileIndex && toIndex <= primaryFileIndex) {
          setPrimaryFileIndex(primaryFileIndex + 1)
        }
      }
      
      return newFiles
    })
  }
  
  // Process single file with specific prompt
  const processSingleFile = async (fileIndex: number, customPrompt?: string) => {
    if (fileIndex >= uploadedFiles.length) return
    
    const originalPrimary = primaryFileIndex
    const originalText = textInput
    
    try {
      // Temporarily set this file as primary
      setPrimaryFileIndex(fileIndex)
      if (customPrompt) {
        setTextInput(customPrompt)
      }
      
      // Process with just this context
      await processTextInput()
      
    } finally {
      // Restore original state
      setPrimaryFileIndex(originalPrimary)
      setTextInput(originalText)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase()
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('video/')) return '🎥'
    if (type.startsWith('audio/')) return '🎵'
    if (type === 'application/pdf') return '📄'
    if (type.includes('word')) return '📄'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📈'
    if (type.includes('powerpoint') || type.includes('presentation')) return '📉'
    if (type.startsWith('text/')) return '📝'
    return '📁'
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Generate thumbnail URL for image files
  const generateThumbnail = (file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return null
  }

  // Stop current audio and cancel any pending requests
  const stopAudioAndRequests = () => {
    console.log('🛑 Stopping audio and canceling requests...')
    
    // Stop current audio playback
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setCurrentAudio(null)
      setIsAudioPlaying(false)
      setAudioProgress(0)
      setAudioDuration(0)
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
  
  // Play/Pause audio control
  const toggleAudioPlayback = () => {
    if (currentAudio) {
      if (isAudioPlaying) {
        currentAudio.pause()
      } else {
        currentAudio.play().catch(e => console.error('Audio play error:', e))
      }
    }
  }
  
  // Seek audio to specific time
  const seekAudio = (time: number) => {
    if (currentAudio) {
      currentAudio.currentTime = time
      setAudioProgress(time)
    }
  }
  
  // Skip forward/backward
  const skipAudio = (seconds: number) => {
    if (currentAudio) {
      const newTime = Math.max(0, Math.min(currentAudio.duration, currentAudio.currentTime + seconds))
      currentAudio.currentTime = newTime
    }
  }
  
  // Set audio playback speed
  const changeAudioSpeed = (speed: number) => {
    setAudioSpeed(speed)
    if (currentAudio) {
      currentAudio.playbackRate = speed
    }
  }
  
  // Set audio volume
  const changeAudioVolume = (volume: number) => {
    setAudioVolume(volume)
    if (currentAudio) {
      currentAudio.volume = volume
    }
  }
  
  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Keyboard shortcuts handler
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in an input field
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return
    }
    
    switch (e.code) {
      case 'Space':
        e.preventDefault()
        if (currentAudio) {
          toggleAudioPlayback()
        }
        break
      case 'Escape':
        e.preventDefault()
        stopAudioAndRequests()
        break
      case 'KeyR':
        if (e.ctrlKey) {
          e.preventDefault()
          if (isRecording) {
            stopRecording()
          } else {
            startRecording()
          }
        }
        break
      case 'KeyS':
        if (e.ctrlKey) {
          e.preventDefault()
          stopAudioAndRequests()
        }
        break
      case 'ArrowLeft':
        if (currentAudio) {
          e.preventDefault()
          skipAudio(-10) // Skip back 10 seconds
        }
        break
      case 'ArrowRight':
        if (currentAudio) {
          e.preventDefault()
          skipAudio(10) // Skip forward 10 seconds
        }
        break
    }
  }
  
  // Load models and conversation history when component mounts
  useEffect(() => {
    fetchAvailableModels()
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown)
    
    // Load conversation history from localStorage
    try {
      const savedHistory = localStorage.getItem('voice-bridge-conversation-history')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        const restored = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp) // Convert string back to Date
        }))
        setConversationHistory(restored)
        console.log('📜 Restored conversation history:', restored.length, 'entries')
      }
    } catch (error) {
      console.error('Error loading conversation history:', error)
    }
    
    return () => {
      // Remove keyboard shortcuts
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecording, currentAudio, isAudioPlaying])

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
      setRealtimeTranscription('') // Clear previous transcription
      setLlmResponse(null) // Clear previous LLM response
      
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
      console.log('📄 STT Result:', result)
      
      // Set the transcription result
      setTranscription(result)
      
      // Also set real-time transcription for display
      if (result.text && result.text.trim()) {
        setRealtimeTranscription(result.text)
        console.log('📄 Transcription completed:', result.text)
      } else {
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
      
      // Get enhanced metadata from new JSON header
      let enhancedData = null
      try {
        const voiceBridgeData = response.headers.get('X-Voice-Bridge-Data')
        if (voiceBridgeData) {
          enhancedData = JSON.parse(voiceBridgeData)
          console.log('🎆 Enhanced Voice Bridge Data:', enhancedData)
        }
      } catch (error) {
        console.error('Error parsing enhanced data:', error)
      }
      
      // Use enhanced data if available, fall back to individual headers
      const transcript = enhancedData?.transcript?.text || response.headers.get('X-Transcript') || 'No transcript'
      const transcriptLanguage = enhancedData?.transcript?.language || 'unknown'
      const transcriptConfidence = enhancedData?.transcript?.confidence || parseFloat(response.headers.get('X-Transcript-Confidence') || '0')
      const transcriptDevice = enhancedData?.transcript?.device_used || 'unknown'
      const llmResponse = enhancedData?.llm_response?.text || response.headers.get('X-LLM-Response') || 'No response'
      const llmReasoning = enhancedData?.llm_response?.reasoning || '' // FULL reasoning now!
      const llmModel = enhancedData?.llm_response?.model || selectedModel
      const llmTokens = enhancedData?.llm_response?.tokens || parseInt(response.headers.get('X-LLM-Tokens') || '0')
      const sttTime = enhancedData?.transcript?.processing_time || parseFloat(response.headers.get('X-STT-Time') || '0')
      const llmTime = enhancedData?.llm_response?.processing_time || parseFloat(response.headers.get('X-LLM-Time') || '0')
      const ttsTime = enhancedData?.tts?.processing_time || parseFloat(response.headers.get('X-TTS-Time') || '0')
      
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
      
      // Set full reasoning data for the dedicated panel
      if (llmReasoning && llmReasoning.trim()) {
        setFullReasoningData(llmReasoning)
        console.log('🤔 Full reasoning data available:', llmReasoning.length, 'characters')
      } else {
        setFullReasoningData('')
      }
      
      // Add this conversation to history
      const newConversationEntry = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        userInput: transcript,
        userInputDetails: {
          language: transcriptLanguage,
          confidence: transcriptConfidence,
          device: transcriptDevice,
          processingTime: sttTime
        },
        aiResponse: llmResponse,
        aiReasoning: llmReasoning,
        aiDetails: {
          model: llmModel,
          tokens: llmTokens,
          processingTime: llmTime
        },
        ttsTime: ttsTime
      }
      
      setConversationHistory(prev => {
        const updated = [...prev, newConversationEntry]
        // Save to localStorage (keep last 50 conversations)
        const toSave = updated.slice(-50)
        localStorage.setItem('voice-bridge-conversation-history', JSON.stringify(
          toSave.map(entry => ({
            ...entry,
            timestamp: entry.timestamp.toISOString() // Convert Date to string for storage
          }))
        ))
        console.log('📜 Added conversation to history. Total:', updated.length)
        return updated
      })
      
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
      
      // Stop text input recorder
      if (textInputRecorder && textInputRecorder.state === 'recording') {
        textInputRecorder.stop()
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
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex-1 max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🤖 LM Studio Model
            </label>
          <div className="relative">
            <select 
              value={selectedModel} 
              onChange={(e) => handleModelChange(e.target.value)}
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
          
          {/* Conversation History Button */}
          <div className="flex items-end">
            <button
              onClick={() => setShowConversationHistory(!showConversationHistory)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              📜 History ({conversationHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Text Input Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              📝 Multimodal AI Input
            </h3>
            {/* Input Type Indicators */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <span>📝</span>
                <span className="text-blue-700 dark:text-blue-300 font-medium">Text</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <span>🖼️</span>
                <span className="text-green-700 dark:text-green-300 font-medium">Images</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                <span>📄</span>
                <span className="text-red-700 dark:text-red-300 font-medium">Docs</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <span>🎥</span>
                <span className="text-purple-700 dark:text-purple-300 font-medium">Media</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <span>💻</span>
                <span className="text-yellow-700 dark:text-yellow-300 font-medium">Code</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowTextInput(!showTextInput)}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            {showTextInput ? 'Hide' : 'Show'} Multimodal Input
          </button>
        </div>
        
        {showTextInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  📋 Text Input:
                </label>
                <div className="relative">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault()
                        processTextInput()
                      }
                    }}
                    placeholder={uploadedFiles.some(f => f.type.startsWith('image/')) 
                      ? "Optional: Add custom instructions for image analysis (e.g., 'Describe the cat', 'What colors do you see?', 'Is this funny?'). Leave blank for natural description."
                      : "Type, paste, or use the 🎤 button to add speech-to-text. Use Ctrl+Enter to process with AI."
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={isTextInputRecording ? stopTextInputRecording : startTextInputRecording}
                      disabled={isProcessing}
                      className={`p-1 transition-colors ${
                        isTextInputRecording 
                          ? 'text-red-500 hover:text-red-700 animate-pulse' 
                          : 'text-gray-500 hover:text-blue-600'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={isTextInputRecording ? 'Stop recording' : 'Record speech to text'}
                    >
                      {isTextInputRecording ? '🛑' : '🎤'}
                    </button>
                    <button
                      onClick={handlePaste}
                      className="p-1 text-gray-500 hover:text-purple-600 transition-colors"
                      title="Paste from clipboard"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => {
                        setTextInput('')
                        setUploadedFiles([])
                      }}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                      title="Clear all"
                    >
                      ✖️
                    </button>
                  </div>
                </div>
              </div>
              
              {/* File Upload Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    📁 Multimodal Files (Images, Documents, Audio, Video):
                  </label>
                  
                  {/* Warning about file mix-up issue */}
                  {uploadedFiles.some(f => f.type.startsWith('image/')) && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                      ⚠️ If AI describes wrong image, check console for debug info
                    </div>
                  )}
                </div>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <input
                    type="file"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*,video/*,audio/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  />
                  
                  <div className="space-y-2">
                    <div className="text-4xl">
                      {dragOver ? '📂' : '📁'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {dragOver ? (
                        <span className="font-medium text-purple-600">Drop files here!</span>
                      ) : (
                        <>
                          <span className="font-medium">Drag & drop files here</span> or <span className="text-purple-600 font-medium">click to browse</span>
                          <br />
                          <span className="text-xs text-gray-500">Images, PDFs, Office docs, audio, video, code files (max 50MB each)</span>
                          <br />
                          <div className="flex items-center justify-center gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">.jpg .png .gif</span>
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">.pdf .docx .xlsx</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">.mp3 .mp4 .avi</span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">.js .py .txt</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uploaded Files ({uploadedFiles.length}):
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                      {uploadedFiles.map((file, index) => {
                        const thumb = generateThumbnail(file)
                        const isPrimary = primaryFileIndex === index
                        const canMoveUp = index > 0
                        const canMoveDown = index < uploadedFiles.length - 1
                        const isImage = file.type.startsWith('image/')
                        const quickDescribePrompt = isImage ? 'Please describe the primary image in detail.' : 'Please summarize the primary document/media and key points.'
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 bg-white dark:bg-gray-600 border ${isPrimary ? 'border-purple-400' : 'border-gray-200 dark:border-gray-500'} rounded-lg`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {thumb ? (
                                <img src={thumb} alt={file.name} className="w-10 h-10 object-cover rounded border" />
                              ) : (
                                <span className="text-lg">{getFileIcon(file)}</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {file.name}
                                  </div>
                                  {isPrimary && (
                                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Primary</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-100/80 md:text-gray-500 dark:text-gray-300 truncate">
                                  {file.type || 'Unknown type'} • {formatFileSize(file.size)}
                                </div>
                                {/* Actions */}
                                <div className="mt-1 flex items-center gap-2 text-xs">
                                  <label className="inline-flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="primaryFile"
                                      checked={isPrimary}
                                      onChange={() => setPrimaryFile(index)}
                                    />
                                    <span>Set Primary</span>
                                  </label>
                                  <button
                                    onClick={() => canMoveUp && moveFile(index, index - 1)}
                                    disabled={!canMoveUp}
                                    className={`px-2 py-0.5 rounded border ${canMoveUp ? 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-500' : 'opacity-40 cursor-not-allowed'}`}
                                    title="Move up"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => canMoveDown && moveFile(index, index + 1)}
                                    disabled={!canMoveDown}
                                    className={`px-2 py-0.5 rounded border ${canMoveDown ? 'text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-500' : 'opacity-40 cursor-not-allowed'}`}
                                    title="Move down"
                                  >
                                    ↓
                                  </button>
                                  <button
                                    onClick={() => processSingleFile(index, quickDescribePrompt)}
                                    className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white"
                                    title="Describe/Summarize this file"
                                  >
                                    Ask about this
                                  </button>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="p-1 text-red-500 hover:text-red-700 transition-colors"
                              title="Remove file"
                            >
                              ✖️
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {textInput.length > 0 && `${textInput.length} characters`}
                {uploadedFiles.length > 0 && `${textInput.length > 0 ? ' • ' : ''}${uploadedFiles.length} files attached`}
                {textInput.length === 0 && uploadedFiles.length === 0 && 'Add text or files to process'}
                {uploadedFiles.length > 0 && ' • Files can be processed without text!'}
                
                {/* Show current files being processed */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-1 text-xs">
                    🖼️ Files: {uploadedFiles.map((f, i) => 
                      `${i === primaryFileIndex ? '★' : ''} ${f.name}`
                    ).join(', ')}
                    {primaryFileIndex !== null && (
                      <span className="text-purple-600 dark:text-purple-400 ml-2">
                        (★ = Primary file)
                      </span>
                    )}
                  </div>
                )}
                {/* Status indicators */}
                {processingStatus && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    📊 {processingStatus}
                  </div>
                )}
                {lastProcessedFiles.length > 0 && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✅ Last processed: {lastProcessedFiles.join(', ')}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {/* Stop Button - only show when processing */}
                {(isLlmProcessing || currentAudio) && (
                  <button
                    onClick={stopAudioAndRequests}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    title="Stop processing and audio playback"
                  >
                    <StopIcon className="h-4 w-4" />
                    Stop
                  </button>
                )}
                
                {/* Process Button */}
                <button
                  onClick={processTextInput}
                  disabled={(!textInput.trim() && uploadedFiles.length === 0) || isLlmProcessing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {isLlmProcessing ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {uploadedFiles.length > 0 && !textInput.trim() ? '📁 Analyze Files' : 
                       uploadedFiles.length > 0 ? '📁🤖 Process All' : '🤖 Process with AI'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Recording Interface */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm p-8">
        
        {/* Real-time Transcription Display */}
        {(isRecording || realtimeTranscription) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">
                {isRecording ? '🎤 Live Transcription:' : '📄 Last Transcription:'}
              </span>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
              <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                {realtimeTranscription || 'Listening for speech...'}
              </p>
            </div>
          </motion.div>
        )}
        
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

        {/* 3-Window Enhanced Conversation Flow */}
        <AnimatePresence>
          {llmResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 space-y-6"
            >
              {/* WINDOW 1: STT Recognition - What You Said */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <MicrophoneIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-blue-900 dark:text-blue-100 font-bold text-xl">
                        🎤 STT Recognition Window
                      </h3>
                      <p className="text-blue-700 dark:text-blue-300 text-sm">
                        Speech-to-Text Analysis • Powered by Whisper on {llmResponse.transcript_details?.device || 'CUDA'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-blue-600 dark:text-blue-400 text-sm">
                    <div>Language: <strong>{llmResponse.transcript_details?.language?.toUpperCase() || 'Unknown'}</strong></div>
                    <div>Confidence: <strong>{((llmResponse.transcript_details?.confidence || 0) * 100).toFixed(1)}%</strong></div>
                    <div>Processing: <strong>{llmResponse.processing_time?.stt?.toFixed(2) || 0}s</strong></div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-inner">
                  <p className="text-gray-900 dark:text-gray-100 text-lg leading-relaxed font-medium">
                    "{llmResponse.transcript || 'No speech detected'}"
                  </p>
                </div>
              </motion.div>

              {/* WINDOW 2: AI Reasoning - How Ava Thinks */}
              {llmResponse.llm_reasoning && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-600 rounded-lg">
                        <ArrowPathIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-yellow-900 dark:text-yellow-100 font-bold text-xl">
                          🤔 AI Reasoning Window
                        </h3>
                        <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                          Internal Thought Process • {llmResponse.llm_details?.model?.replace('bytedance/', '').replace('seed-', '') || 'AI Model'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="text-right text-yellow-600 dark:text-yellow-400 text-sm">
                        <div>Length: <strong>{llmResponse.llm_reasoning.length} chars</strong></div>
                        <div>Lines: <strong>~{Math.ceil(llmResponse.llm_reasoning.length / 80)}</strong></div>
                      </div>
                      <button
                        onClick={() => setShowReasoningPanel(true)}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        🔍 Full View
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border-2 border-yellow-200 dark:border-yellow-700 shadow-inner max-h-48 overflow-y-auto">
                    <pre className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap text-sm font-mono">
                      {llmResponse.llm_reasoning.slice(0, 500)}{llmResponse.llm_reasoning.length > 500 ? '\n\n... (click "Full View" to see complete reasoning)' : ''}
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* WINDOW 3: AI Vocalized Response - What Ava Says */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <SpeakerWaveIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-purple-900 dark:text-purple-100 font-bold text-xl">
                        🎙️ Ava's Vocalized Response
                      </h3>
                      <p className="text-purple-700 dark:text-purple-300 text-sm">
                        AI Generated Response • {llmResponse.llm_details?.model?.replace('bytedance/', '').replace('seed-', '') || selectedModel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-purple-600 dark:text-purple-400 text-sm">
                    <div>Tokens: <strong>{llmResponse.llm_details?.tokens || 0}</strong></div>
                    <div>LLM Time: <strong>{llmResponse.processing_time?.llm?.toFixed(2) || 0}s</strong></div>
                    <div>TTS Time: <strong>{llmResponse.processing_time?.tts?.toFixed(2) || 0}s</strong></div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border-2 border-purple-200 dark:border-purple-700 shadow-inner">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">🤖 AI Response
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({(llmResponse.llm_response || '').length} characters)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (llmResponse.llm_response) {
                            navigator.clipboard.writeText(llmResponse.llm_response)
                          }
                        }}
                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs rounded transition-colors"
                        title="Copy response to clipboard"
                      >
                        📋 Copy
                      </button>
                      <button
                        id="current-response-replay"
                        onClick={() => replayTTS(llmResponse.llm_response || '', 'current-response-replay')}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                        title="Read this response aloud"
                      >
                        🔊 Read Aloud
                      </button>
                    </div>
                  </div>
                  
                  {/* Scrollable Response Text */}
                  <div 
                    className="min-h-32 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 custom-scrollbar"
                    style={{ 
                      scrollbarWidth: 'thin',
                      height: 'auto',
                      minHeight: '8rem',
                      maxHeight: '24rem'
                    }}
                  >
                    <p className="text-gray-900 dark:text-gray-100 text-base leading-relaxed whitespace-pre-wrap font-normal break-words">
                      {llmResponse.llm_response || 'No response generated'}
                    </p>
                  </div>
                </div>
                
                {/* Audio Playback Indicator */}
                {currentAudio && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleAudioPlayback}
                        className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm"
                      >
                        {isAudioPlaying ? '⏸️ Pause' : '▶️ Play'}
                      </button>
                      <button
                        onClick={() => skipAudio(-10)}
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                        title="Back 10s"
                      >
                        ⏪ 10s
                      </button>
                      <button
                        onClick={() => skipAudio(10)}
                        className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                        title="Forward 10s"
                      >
                        10s ⏩
                      </button>
                      <button
                        onClick={stopAudioAndRequests}
                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                        title="Stop"
                      >
                        ⏹️ Stop
                      </button>
                      <div className="text-xs text-purple-700 dark:text-purple-300">
                        {formatTime(audioProgress)} / {formatTime(audioDuration || currentAudio.duration || 0)}
                      </div>
                    </div>
                    {/* Seek bar */}
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || currentAudio.duration || 0}
                      step={0.1}
                      value={Math.min(audioProgress, audioDuration || currentAudio.duration || 0)}
                      onChange={(e) => seekAudio(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    {/* Volume & Speed */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🔊</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={audioVolume}
                          onChange={(e) => changeAudioVolume(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">⏱️ Speed</span>
                        <select
                          value={audioSpeed}
                          onChange={(e) => changeAudioSpeed(parseFloat(e.target.value))}
                          className="px-2 py-1 rounded border bg-white dark:bg-gray-700"
                        >
                          <option value={0.75}>0.75x</option>
                          <option value={1}>1x</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2}>2x</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
              
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
      
      {/* Full Reasoning Panel Modal */}
      <AnimatePresence>
        {showReasoningPanel && fullReasoningData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReasoningPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <ArrowPathIcon className="h-8 w-8 text-yellow-600" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      🤔 AI Reasoning Process
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Complete thought process from {llmResponse?.llm_details?.model || 'AI Model'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReasoningPanel(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-yellow-600 text-sm font-medium">
                      📊 {fullReasoningData.length} characters of reasoning
                    </span>
                    <span className="text-yellow-600/60 text-xs">
                      • {Math.ceil(fullReasoningData.length / 100)} lines approx
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border max-h-96 overflow-y-auto">
                    <pre className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap text-sm font-mono">
                      {fullReasoningData}
                    </pre>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ✨ This shows the complete AI reasoning process for transparency
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullReasoningData)
                      // Could add a toast notification here
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    📋 Copy Reasoning
                  </button>
                  <button
                    onClick={() => setShowReasoningPanel(false)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Conversation History Panel */}
      <AnimatePresence>
        {showConversationHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 bg-gray-900 rounded-xl border border-gray-800 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-yellow-300 flex items-center gap-3">
                📜 Conversation History
                <span className="text-lg font-normal text-gray-400">({conversationHistory.length} conversations)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(conversationHistory, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `conversation-history-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                  disabled={conversationHistory.length === 0}
                >
                  💾 Export
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
                      setConversationHistory([]);
                      localStorage.removeItem('conversationHistory');
                    }
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                  disabled={conversationHistory.length === 0}
                >
                  🗑️ Clear
                </button>
                <button
                  onClick={() => setShowConversationHistory(false)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  ✕ Hide
                </button>
              </div>
            </div>
            
            {conversationHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-400 text-lg">No conversations yet</p>
                <p className="text-gray-500 text-sm mt-2">Start a voice chat to see your conversation history here!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {conversationHistory.slice().reverse().map((entry, index) => (
                  <motion.div
                    key={conversationHistory.length - index - 1}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    {/* Conversation Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">💬</div>
                        <div>
                          <div className="text-white font-medium">
                            Conversation #{conversationHistory.length - index}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs">
                        ⏱️ {((entry.userInputDetails?.processingTime || 0) + (entry.aiDetails?.processingTime || 0) + (entry.ttsTime || 0)).toFixed(2)}s total
                      </div>
                    </div>
                    
                    {/* User Input Section */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-purple-400 font-medium flex items-center gap-1">
                          🎤 You said:
                        </div>
                        {entry.userInputDetails && (
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>🎯 {Math.round((entry.userInputDetails.confidence || 0) * 100)}%</span>
                            <span>🌍 {entry.userInputDetails.language}</span>
                            <span>⏱️ {entry.userInputDetails.processingTime?.toFixed(2) || 'N/A'}s</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 border-l-4 border-purple-500">
                        <p className="text-white text-sm leading-relaxed">
                          "{entry.userInput}"
                        </p>
                      </div>
                    </div>
                    
                    {/* AI Response Section */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-green-400 font-medium flex items-center gap-1">
                          🤖 Ava responded:
                        </div>
                        {entry.aiDetails && (
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>🧠 {entry.aiDetails.model}</span>
                            <span>🔤 {entry.aiDetails.tokens} tokens</span>
                            <span>⚡ {entry.aiDetails.processingTime?.toFixed(2) || 'N/A'}s</span>
                            <span>🔊 {entry.ttsTime?.toFixed(2) || 'N/A'}s</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3 border-l-4 border-green-500">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-white text-sm leading-relaxed flex-1">
                            "{entry.aiResponse}"
                          </p>
                          <button
                            id={`history-replay-${conversationHistory.length - index - 1}`}
                            onClick={() => replayTTS(entry.aiResponse, `history-replay-${conversationHistory.length - index - 1}`)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors flex items-center gap-1 flex-shrink-0"
                            title="Read this response aloud"
                          >
                            🔊
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reasoning Section (Collapsible) */}
                    {entry.aiReasoning && (
                      <div className="border-t border-gray-600 pt-3">
                        <button
                          onClick={() => {
                            const reasoningId = `reasoning-${conversationHistory.length - index - 1}`;
                            const element = document.getElementById(reasoningId);
                            if (element) {
                              element.classList.toggle('hidden');
                            }
                          }}
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          <span>🧠 View AI Reasoning</span>
                          <span className="text-xs text-gray-500">({entry.aiReasoning.length} chars)</span>
                        </button>
                        <div id={`reasoning-${conversationHistory.length - index - 1}`} className="hidden mt-2">
                          <div className="bg-gray-700 rounded-lg p-3 border-l-4 border-blue-500 max-h-32 overflow-y-auto">
                            <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                              {entry.aiReasoning}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* History Stats */}
            {conversationHistory.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-yellow-400 text-lg font-bold">
                      {conversationHistory.length}
                    </div>
                    <div className="text-gray-400 text-xs">Total Conversations</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-green-400 text-lg font-bold">
                      {conversationHistory.reduce((acc, entry) => acc + (entry.aiResponse?.length || 0), 0)}
                    </div>
                    <div className="text-gray-400 text-xs">AI Response Chars</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-blue-400 text-lg font-bold">
                      {conversationHistory.reduce((acc, entry) => acc + (entry.aiDetails?.tokens || 0), 0)}
                    </div>
                    <div className="text-gray-400 text-xs">Total Tokens</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3">
                    <div className="text-purple-400 text-lg font-bold">
                      {(conversationHistory.reduce((acc, entry) => {
                        const total = (entry.userInputDetails?.processingTime || 0) + (entry.aiDetails?.processingTime || 0) + (entry.ttsTime || 0);
                        return acc + total;
                      }, 0)).toFixed(1)}s
                    </div>
                    <div className="text-gray-400 text-xs">Total Processing</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
