'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './voice-clone.css'
import { 
  MicrophoneIcon, 
  StopIcon, 
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  CloudArrowUpIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface VoiceClone {
  id: string
  name: string
  description: string
  samples: VoiceSample[]
  createdAt: Date
  status: 'training' | 'ready' | 'error'
  quality: number
  backendId?: string  // Backend voice clone ID
  backendSynced?: boolean  // Whether this clone is synced with backend
}

interface VoiceSample {
  id: string
  name: string
  duration: number
  audioBlob: Blob
  audioUrl: string
  transcript: string
  quality: number
  uploadedAt: Date
}

interface AvailableVoice {
  id: string
  name: string
  language: string
  gender: string
  description: string
}

export default function VoiceClonePage() {
  // Voice clone management
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([])
  const [currentClone, setCurrentClone] = useState<VoiceClone | null>(null)
  const [availableVoices, setAvailableVoices] = useState<AvailableVoice[]>([])
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  // UI state
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'explore'>('create')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showNewCloneModal, setShowNewCloneModal] = useState(false)
  
  // Form state
  const [newCloneName, setNewCloneName] = useState('')
  const [newCloneDescription, setNewCloneDescription] = useState('')
  const [currentSampleName, setCurrentSampleName] = useState('')
  const [currentTranscript, setCurrentTranscript] = useState('')
  
  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState<HTMLAudioElement | null>(null)
  const [playingStates, setPlayingStates] = useState<{[key: string]: boolean}>({})
  
  // File import state
  const [isDragOver, setIsDragOver] = useState(false)
  const [importedFile, setImportedFile] = useState<File | null>(null)
  const [importedAudioUrl, setImportedAudioUrl] = useState<string | null>(null)
  const [importedDuration, setImportedDuration] = useState<number>(0)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [showTrimmer, setShowTrimmer] = useState(false)
  
  // Audio trimming state
  const [trimStart, setTrimStart] = useState<number>(0)
  const [trimEnd, setTrimEnd] = useState<number>(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const trimmedAudioRef = useRef<HTMLAudioElement | null>(null)
  
  // Sample prompts for voice cloning
  const samplePrompts = [
    "Hello, my name is [Your Name] and I'm creating a voice clone to help with my daily tasks.",
    "I love technology and artificial intelligence. This voice will represent me in digital conversations.",
    "Reading books and learning new things brings me great joy. Knowledge is power.",
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
    "In the future, AI assistants will be personalized with our own voices and personalities.",
    "Weather forecast shows sunny skies today with temperatures reaching seventy degrees.",
    "Please confirm your appointment for tomorrow at three thirty in the afternoon.",
    "Thank you for choosing our service. We appreciate your business and feedback.",
    "Mathematics and science have always fascinated me since childhood.",
    "Artificial intelligence is transforming how we interact with technology every day."
  ]
  
  // Mock data for demo purposes (in case VibeVoice API is not available)
  const mockVoices: AvailableVoice[] = [
    {
      id: 'voice_1',
      name: 'Sarah - Professional',
      language: 'English (US)',
      gender: 'Female',
      description: 'Clear, professional voice ideal for business presentations and formal content.'
    },
    {
      id: 'voice_2', 
      name: 'James - Conversational',
      language: 'English (US)',
      gender: 'Male',
      description: 'Warm, friendly voice perfect for casual conversations and storytelling.'
    },
    {
      id: 'voice_3',
      name: 'Emma - Energetic',
      language: 'English (UK)',
      gender: 'Female', 
      description: 'Vibrant, enthusiastic voice great for marketing and promotional content.'
    },
    {
      id: 'voice_4',
      name: 'David - Documentary',
      language: 'English (US)',
      gender: 'Male',
      description: 'Authoritative, clear voice perfect for educational and documentary content.'
    }
  ]
  
  // Load available voices on component mount
  useEffect(() => {
    loadAvailableVoices()
    loadSavedVoiceClones()
    // Small delay to let localStorage data load first
    setTimeout(() => {
      reconcileWithBackend()
    }, 100)
  }, [])
  
  // Reconcile when switching to manage tab
  useEffect(() => {
    if (activeTab === 'manage') {
      reconcileWithBackend()
    }
  }, [activeTab])
  
  const loadAvailableVoices = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/vibevoice-voices')
      if (response.ok) {
        const data = await response.json()
        // Ensure we always set an array
        const voices = Array.isArray(data.voices) ? data.voices : 
                      Array.isArray(data) ? data : []
        setAvailableVoices(voices)
        console.log('📢 Loaded available voices from API:', voices.length)
      } else {
        console.warn('Failed to load voices from API:', response.status, response.statusText)
        console.log('📢 Using mock voices as fallback')
        setAvailableVoices(mockVoices) // Use mock data as fallback
      }
    } catch (error) {
      console.error('Error loading available voices from API:', error)
      console.log('📢 Using mock voices as fallback due to connection error')
      setAvailableVoices(mockVoices) // Use mock data as fallback
    }
  }
  
  const reconcileWithBackend = async () => {
    try {
      console.log('🔄 Reconciling frontend voice clones with backend...')
      const response = await fetch('http://localhost:8001/api/v1/voice-clones')
      if (response.ok) {
        const data = await response.json()
        const backendClones = Array.isArray(data.voice_clones) ? data.voice_clones : []
        console.log('📋 Backend clones found:', backendClones)
        
        if (backendClones.length > 0) {
          // Use functional state update to get current state
          setVoiceClones(currentVoiceClones => {
            const updatedClones = currentVoiceClones.map(frontendClone => {
              const matchingBackendClone = backendClones.find((bc: any) => 
                bc.name === frontendClone.name || bc.voice_id === frontendClone.id || bc.voice_id === frontendClone.backendId
              )
              
              if (matchingBackendClone) {
                console.log(`✅ Syncing clone "${frontendClone.name}" with backend ID: ${matchingBackendClone.voice_id}`)
                return {
                  ...frontendClone,
                  id: matchingBackendClone.voice_id, // Update to use backend ID
                  backendId: matchingBackendClone.voice_id,
                  backendSynced: true,
                  status: 'ready' as const
                }
              }
              
              return frontendClone
            })
            
            // Only update if there are actual changes
            if (JSON.stringify(updatedClones) !== JSON.stringify(currentVoiceClones)) {
              console.log('🔄 Updating voice clones with backend sync status')
              saveVoiceClones(updatedClones)
              
              // Schedule current clone update for next render
              setTimeout(() => {
                setCurrentClone(prevCurrentClone => {
                  if (prevCurrentClone) {
                    const updatedCurrentClone = updatedClones.find(c => c.name === prevCurrentClone.name)
                    return updatedCurrentClone || prevCurrentClone
                  }
                  return prevCurrentClone
                })
              }, 0)
              
              return updatedClones
            }
            
            return currentVoiceClones
          })
        }
      }
    } catch (error) {
      console.error('❌ Failed to reconcile with backend:', error)
      // Don't show error to user as this is a background operation
    }
  }
  
  const loadSavedVoiceClones = () => {
    try {
      const saved = localStorage.getItem('voice-clones')
      if (saved) {
        const parsed = JSON.parse(saved).map((clone: any) => ({
          ...clone,
          createdAt: new Date(clone.createdAt),
          // Ensure backend sync properties exist (for existing clones)
          backendId: clone.backendId || undefined,
          backendSynced: clone.backendSynced || false,
          samples: clone.samples?.map((sample: any) => ({
            ...sample,
            uploadedAt: new Date(sample.uploadedAt),
            // Don't try to recreate URLs from null blobs
            audioUrl: sample.audioBlob ? URL.createObjectURL(sample.audioBlob) : null
          })).filter((sample: any) => sample.audioUrl) || [] // Filter out samples without URLs
        }))
        setVoiceClones(parsed)
      }
    } catch (error) {
      console.error('Error loading saved voice clones:', error)
      // Clear corrupted data
      localStorage.removeItem('voice-clones')
      setVoiceClones([])
    }
  }
  
  const saveVoiceClones = (clones: VoiceClone[]) => {
    try {
      // Convert for storage (can't store Blob directly)
      const toSave = clones.map(clone => ({
        ...clone,
        samples: clone.samples.map(sample => ({
          ...sample,
          // Note: We lose audio data on refresh - in production, would upload to server
          audioBlob: null,
          audioUrl: null
        }))
      }))
      localStorage.setItem('voice-clones', JSON.stringify(toSave))
    } catch (error) {
      console.error('Error saving voice clones:', error)
    }
  }
  
  // Recording functions
  const startRecording = async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100, // Higher quality for voice cloning
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        bitsPerSecond: 256000 // Higher bitrate for voice cloning
      })
      
      const audioChunks: BlobPart[] = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      setError('Failed to start recording. Please check microphone permissions.')
      console.error('Recording error:', error)
    }
  }
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    
    setIsRecording(false)
  }
  
  // Audio playback functions
  const stopAllAudio = () => {
    if (currentPlayingAudio) {
      currentPlayingAudio.pause()
      currentPlayingAudio.currentTime = 0
      setCurrentPlayingAudio(null)
    }
    setPlayingStates({})
  }
  
  const toggleAudioPlayback = (audioUrl: string, sampleId: string) => {
    // If something is currently playing
    if (currentPlayingAudio && !currentPlayingAudio.paused) {
      // If it's the same audio, pause it
      if (playingStates[sampleId]) {
        currentPlayingAudio.pause()
        setPlayingStates(prev => ({ ...prev, [sampleId]: false }))
        return
      } else {
        // Stop current audio and play new one
        stopAllAudio()
      }
    }
    
    // If this audio is paused, resume it
    if (currentPlayingAudio && playingStates[sampleId] === false) {
      currentPlayingAudio.play().catch(e => console.error('Audio play error:', e))
      setPlayingStates(prev => ({ ...prev, [sampleId]: true }))
      return
    }
    
    // Create new audio instance
    const audio = new Audio(audioUrl)
    setCurrentPlayingAudio(audio)
    setPlayingStates({ [sampleId]: true })
    
    audio.onended = () => {
      setCurrentPlayingAudio(null)
      setPlayingStates({})
    }
    
    audio.onerror = () => {
      console.error('Audio loading error for:', audioUrl)
      setCurrentPlayingAudio(null)
      setPlayingStates({})
    }
    
    audio.play().catch(e => {
      console.error('Audio play error:', e)
      setCurrentPlayingAudio(null)
      setPlayingStates({})
    })
  }
  
  // Voice sample management
  const addVoiceSample = async () => {
    if (!audioBlob || !audioUrl || !currentClone) {
      setError('Please record audio and select a voice clone')
      return
    }
    
    if (!currentSampleName.trim()) {
      setError('Please enter a name for this voice sample')
      return
    }
    
    if (!currentTranscript.trim()) {
      // In development, allow bypass with a warning
      const isDevelopment = window.location.hostname === 'localhost'
      if (isDevelopment && confirm('⚠️ No transcript provided. This will reduce voice clone quality.\n\nFor best results, transcripts are essential for voice cloning.\n\nContinue anyway? (Development only)')) {
        console.log('🚧 Development mode: Bypassing transcript requirement')
        // Use a placeholder transcript
        setCurrentTranscript('[No transcript provided - development mode]')
      } else {
        setError('Please enter a transcript for this voice sample. This is required for voice cloning quality.')
        return
      }
    }
    
    setIsProcessing(true)
    setSuccess(null) // Clear previous success messages
    
    try {
      console.log('🛠️ Starting voice clone creation process...')
      console.log('📊 Audio info:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration: recordingTime,
        transcript_length: currentTranscript.length
      })
      
      // Validate audio before sending
      if (audioBlob.size === 0) {
        throw new Error('Audio file is empty')
      }
      
      if (audioBlob.size > 50 * 1024 * 1024) {
        throw new Error('Audio file too large (max 50MB)')
      }
      
      // Create voice clone on backend
      console.log('🚀 Creating voice clone on backend...')
      const formData = new FormData()
      formData.append('name', currentClone.name)
      formData.append('transcript', currentTranscript)
      formData.append('audio', audioBlob, 'voice_sample.webm')
      if (currentClone.description) {
        formData.append('description', currentClone.description)
      }
      
      console.log('📤 Sending request to backend...')
      const response = await fetch('http://localhost:8001/api/v1/voice-clone', {
        method: 'POST',
        body: formData
      })
      
      console.log('📨 Backend response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Backend voice clone created successfully:', result)
        
        // Update the current clone with the backend's voice ID for future testing
        if (result.voice_id && currentClone) {
          console.log(`🔄 Updating local clone ID from ${currentClone.id} to ${result.voice_id}`)
          const originalId = currentClone.id
          const backendUpdatedClone = {
            ...currentClone,
            id: result.voice_id,  // Use the backend's voice clone ID
            backendId: result.voice_id,  // Store it separately too
            backendSynced: true,
            status: 'ready' as const
          }
          
          const updatedClones = voiceClones.map(clone => 
            clone.id === originalId ? backendUpdatedClone : clone
          )
          
          setVoiceClones(updatedClones)
          setCurrentClone(backendUpdatedClone)
          saveVoiceClones(updatedClones)
          
          console.log('✅ Voice clone ID updated and synced with backend')
          
          setSuccess(`🎉 Voice clone "${currentClone.name}" created successfully! Backend processing time: ${result.processing_time?.toFixed(2) || 'N/A'}s. You can now test your voice clone!`)
        } else {
          console.warn('⚠️ Backend response missing voice_id:', result)
          setSuccess('✅ Voice clone created on backend, but ID sync failed. Sample saved locally.')
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('❌ Backend voice clone creation failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        // Provide more specific error messages
        if (response.status === 400) {
          setError(`❌ Invalid audio file: ${errorText}. Please try a different audio format or check the recording quality.`)
          return // Don't save locally if it's a validation error
        } else if (response.status === 503) {
          setError(`⚠️ VibeVoice service unavailable: ${errorText}. Sample will be saved locally only.`)
        } else {
          setError(`⚠️ Backend error (${response.status}): ${errorText}. Sample will be saved locally only.`)
        }
      }
      
    } catch (error) {
      console.error('Backend voice clone error:', error)
      setError('Backend unavailable - sample saved locally only')
    }
    
    // Always save locally regardless of backend status
    const newSample: VoiceSample = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: currentSampleName,
      duration: recordingTime,
      audioBlob,
      audioUrl,
      transcript: currentTranscript,
      quality: Math.random() * 0.3 + 0.7, // Simulate quality score
      uploadedAt: new Date()
    }
    
    // Use the most current version of voiceClones to avoid overwriting backend sync
    setVoiceClones(prevClones => {
      const mostCurrentClone = prevClones.find(c => c.id === currentClone.id || c.backendId === currentClone.id) || currentClone
      const updatedClone = {
        ...mostCurrentClone,  // Use the most current version (with backend sync)
        samples: [...mostCurrentClone.samples, newSample]
      }
      
      const updatedClones = prevClones.map(clone => 
        (clone.id === currentClone.id || clone.backendId === currentClone.id) ? updatedClone : clone
      )
      
      setCurrentClone(updatedClone)
      saveVoiceClones(updatedClones)
      return updatedClones
    })
    
    // Clear form
    setAudioBlob(null)
    setAudioUrl(null)
    setCurrentSampleName('')
    setCurrentTranscript('')
    setRecordingTime(0)
    
    if (!success) { // Don't override backend success message
      setSuccess('Voice sample added successfully!')
      setTimeout(() => setSuccess(null), 3000)
    }
    
    setIsProcessing(false)
  }
  
  const removeVoiceSample = (sampleId: string) => {
    if (!currentClone) return
    
    const updatedClone = {
      ...currentClone,
      samples: currentClone.samples.filter(sample => sample.id !== sampleId)
    }
    
    const updatedClones = voiceClones.map(clone => 
      clone.id === currentClone.id ? updatedClone : clone
    )
    
    setVoiceClones(updatedClones)
    setCurrentClone(updatedClone)
    saveVoiceClones(updatedClones)
  }
  
  // Voice clone management
  const createNewVoiceClone = () => {
    if (!newCloneName.trim()) {
      setError('Please enter a name for the voice clone')
      return
    }
    
    const newClone: VoiceClone = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: newCloneName,
      description: newCloneDescription,
      samples: [],
      createdAt: new Date(),
      status: 'ready',
      quality: 0,
      backendId: undefined,
      backendSynced: false
    }
    
    const updatedClones = [...voiceClones, newClone]
    setVoiceClones(updatedClones)
    setCurrentClone(newClone)
    saveVoiceClones(updatedClones)
    
    setNewCloneName('')
    setNewCloneDescription('')
    setShowNewCloneModal(false)
    setSuccess('Voice clone created successfully!')
    
    setTimeout(() => setSuccess(null), 3000)
  }
  
  const deleteVoiceClone = (cloneId: string) => {
    if (!confirm('Are you sure you want to delete this voice clone? This cannot be undone.')) return
    
    const updatedClones = voiceClones.filter(clone => clone.id !== cloneId)
    setVoiceClones(updatedClones)
    saveVoiceClones(updatedClones)
    
    if (currentClone?.id === cloneId) {
      setCurrentClone(null)
    }
  }
  
  // Test voice clone with VibeVoice
  const testVoiceClone = async (cloneParam: VoiceClone) => {
    // Always use the most current version from state to ensure we have latest backend sync
    let clone = voiceClones.find(c => c.id === cloneParam.id || c.backendId === cloneParam.id || c.backendId === cloneParam.backendId) || cloneParam
    
    if (clone.samples.length === 0) {
      setError('Please add at least one voice sample to test this clone')
      return
    }
    
    try {
      setIsProcessing(true)
      setError(null)
      
      console.log('🎭 Testing voice clone:', clone.name)
      console.log('📋 Voice samples:', clone.samples.length)
      
      const testText = `Hello! This is ${clone.name}, testing my cloned voice. I have ${clone.samples.length} voice samples for training.`
      
      // Debug: Log current clone state
      console.log('🔍 Current clone state:', {
        id: clone.id,
        backendId: clone.backendId,
        backendSynced: clone.backendSynced,
        name: clone.name
      })
      
      // If this voice clone is not synced with backend, try to reconcile first
      if (!clone.backendSynced) {
        console.log('⚠️ Clone not synced, attempting reconciliation before test...')
        await reconcileWithBackend()
        
        // Check again after reconciliation
        const updatedClone = voiceClones.find(c => c.name === clone.name)
        if (updatedClone && !updatedClone.backendSynced) {
          setError(`❌ Voice clone "${clone.name}" is not synced with backend.\n\nThis means the voice clone exists only locally and hasn't been uploaded to the VibeVoice server yet.\n\nTo fix this:\n1. Click "Edit" on this voice clone\n2. Upload a WAV voice sample with transcript\n3. The system will automatically sync with the backend`)
          return
        }
        // Update clone reference if reconciliation worked
        if (updatedClone && updatedClone.backendSynced) {
          clone = updatedClone
        }
      }
      
      // Reconcile with backend list to ensure we use the correct, server-side voice_id
      let resolvedVoiceId: string = (clone.backendId || clone.id)
      let backendClones: any[] = []
      
      try {
        console.log('🔄 Fetching backend voice clones for reconciliation...')
        const listResp = await fetch('http://localhost:8001/api/v1/voice-clones')
        if (listResp.ok) {
          const listData = await listResp.json()
          backendClones = Array.isArray(listData.voice_clones) ? listData.voice_clones : []
          console.log('📋 Backend voice clones:', backendClones)
          
          const matchByName = backendClones.find((c: any) => c.name === clone.name)
          if (matchByName?.voice_id) {
            resolvedVoiceId = matchByName.voice_id
            console.log(`✅ Found matching backend clone by name: ${resolvedVoiceId}`)
          } else if (backendClones.length === 1 && backendClones[0]?.voice_id) {
            // Last resort: if only one exists, use it
            resolvedVoiceId = backendClones[0].voice_id
            console.log(`🎯 Using single available backend clone: ${resolvedVoiceId}`)
          } else if (backendClones.length === 0) {
            setError(`❌ No voice clones found on backend. Please create a voice sample first to train the voice clone.`)
            return
          } else {
            setError(`❌ Cannot find matching voice clone "${clone.name}" on backend. Available backend clones: ${backendClones.map(c => c.name).join(', ')}`)
            return
          }
        } else {
          throw new Error(`Backend returned ${listResp.status}: ${listResp.statusText}`)
        }
      } catch (reconErr) {
        console.error('❌ Failed to reconcile voice clone with backend:', reconErr)
        setError(`❌ Cannot connect to backend for voice clone testing: ${reconErr}`)
        return
      }

      const voiceIdToUse = resolvedVoiceId
      console.log(`🎤 Using voice ID for test: ${voiceIdToUse} (backend synced: ${clone.backendSynced})`)
      console.log('🧪 Testing with voice clone endpoint...')
      
      const formData = new FormData()
      formData.append('voice_id', voiceIdToUse)
      formData.append('text', testText)
      
      const response = await fetch('http://localhost:8001/api/v1/voice-clone/test', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        console.log('✅ Voice clone test endpoint successful')
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Stop any currently playing audio
        stopAllAudio()
        
        const audio = new Audio(audioUrl)
        setCurrentPlayingAudio(audio)
        setPlayingStates({ [`test_${clone.id}`]: true })
        
        audio.oncanplaythrough = () => {
          audio.play().catch(e => console.error('Audio play error:', e))
        }
        
        audio.onended = () => {
          setCurrentPlayingAudio(null)
          setPlayingStates({})
        }
        
        setSuccess(`🎉 Voice clone test successful! Generated ${Math.round(audioBlob.size / 1024)}KB audio for ${clone.name} using VibeVoice-Large.`)
        
      } else if (response.status === 404 || response.status === 500 || response.status === 503) {
        // Voice clone service not available, try fallback
        console.log('🚨 Voice clone endpoint failed with status ' + response.status + ', trying fallback TTS...')
        
        const fallbackResponse = await fetch('http://localhost:8001/api/v1/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: testText,
            voice: 'en-US-AvaNeural'  // Fallback to regular TTS
          })
        })
        
        if (fallbackResponse.ok) {
          const audioBlob = await fallbackResponse.blob()
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          
          stopAllAudio()
          setCurrentPlayingAudio(audio)
          audio.play().catch(e => console.error('Audio play error:', e))
          
          setError(`⚠️ Voice cloning with VibeVoice failed. Playing with fallback voice (Ava).\n\n🔧 VibeVoice Issues Detected:\n- ONNX Runtime version mismatch (IR v11 vs v10)\n- VibeVoice package installation issues\n- Voice clone ID synchronization problems\n\n💡 The voice clone functionality needs VibeVoice setup or we can switch to IndexTTS for a working solution.`)
        } else {
          throw new Error('Both voice clone and fallback TTS failed')
        }
        
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('🚨 Voice Clone Test Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        throw new Error(`Voice clone test failed (${response.status}): ${errorText}`)
      }
      
    } catch (error: any) {
      console.error('🚨 Voice clone test error:', error)
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('❌ Cannot connect to backend server. Make sure it\'s running on port 8001.')
      } else if (error.message.includes('500')) {
        setError(`❌ Server error testing ${clone.name}. This might be a VibeVoice configuration issue. Check that VibeVoice-Large model is properly set up at Z:\\Models\\VibeVoice-Large`)
      } else if (error.message.includes('404')) {
        // Simulate success for demo purposes
        setSuccess(`🎭 Demo Mode: Voice clone "${clone.name}" would sound great with ${clone.samples.length} samples! Connect VibeVoice API for real generation.`)
      } else {
        setError(`❌ Test failed for ${clone.name}: ${error.message}`)
      }
      
      // Add some helpful debug info
      console.log('🔍 Debug Info:', {
        cloneName: clone.name,
        samplesCount: clone.samples.length,
        hasTranscripts: clone.samples.every(s => s.transcript?.length > 0),
        avgDuration: clone.samples.reduce((acc, s) => acc + s.duration, 0) / clone.samples.length
      })
      
    } finally {
      setIsProcessing(false)
      // Auto-clear messages after 5 seconds
      setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
    }
  }
  
  // File handling functions
  const supportedFormats = ['audio/wav', 'audio/flac', 'audio/mpeg', 'audio/mp3', 'audio/x-flac', 'audio/x-wav']
  const supportedExtensions = ['.wav', '.flac', '.mp3']
  
  const validateAudioFile = (file: File): boolean => {
    const isValidType = supportedFormats.some(format => file.type === format)
    const isValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    return isValidType || isValidExtension
  }
  
  const generateWaveform = async (audioBuffer: AudioBuffer) => {
    const channelData = audioBuffer.getChannelData(0) // Use first channel
    const samples = 2000 // Number of samples for waveform visualization
    const blockSize = Math.floor(channelData.length / samples)
    const waveform = []
    
    for (let i = 0; i < samples; i++) {
      const start = i * blockSize
      const end = start + blockSize
      let max = 0
      
      for (let j = start; j < end; j++) {
        const sample = Math.abs(channelData[j] || 0)
        if (sample > max) max = sample
      }
      
      waveform.push(max)
    }
    
    return waveform
  }
  
  const processAudioFile = async (file: File) => {
    setIsProcessingFile(true)
    setFileError(null)
    
    try {
      if (!validateAudioFile(file)) {
        throw new Error('Unsupported file format. Please use WAV, FLAC, or MP3 files.')
      }
      
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File too large. Please use files smaller than 50MB.')
      }
      
      const url = URL.createObjectURL(file)
      setImportedAudioUrl(url)
      setImportedFile(file)
      
      // Get audio duration and generate waveform
      const audio = new Audio(url)
      
      const loadPromise = new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = async () => {
          try {
            const duration = audio.duration
            setImportedDuration(duration)
            setTrimStart(0)
            setTrimEnd(duration)
            
            // Check duration limits (2 seconds to 5 minutes)
            if (duration < 2) {
              throw new Error('Audio too short. Please use audio at least 2 seconds long.')
            }
            if (duration > 300) {
              throw new Error('Audio too long. Please use audio shorter than 5 minutes.')
            }
            
            // Generate waveform
            const context = audioContext || new AudioContext()
            if (!audioContext) setAudioContext(context)
            
            const response = await fetch(url)
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await context.decodeAudioData(arrayBuffer)
            
            const waveform = await generateWaveform(audioBuffer)
            setWaveformData(waveform)
            
            resolve()
          } catch (error) {
            reject(error)
          }
        }
        
        audio.onerror = () => reject(new Error('Failed to load audio file'))
      })
      
      await loadPromise
      setShowTrimmer(true)
      
      // Auto-transcribe the imported audio using Whisper
      console.log('🎯 Starting auto-transcription for:', file.name)
      try {
        await autoTranscribeAudio(file)
      } catch (transcriptionError) {
        console.error('😨 Auto-transcription failed during file processing:', transcriptionError)
        setError(`⚠️ Auto-transcription failed: ${transcriptionError}. Use the transcribe button or enter transcript manually.`)
      }
      
    } catch (error: any) {
      setFileError(error.message)
      setImportedFile(null)
      setImportedAudioUrl(null)
      setShowTrimmer(false)
    } finally {
      setIsProcessingFile(false)
    }
  }
  
  const autoTranscribeAudio = async (audioFile: File) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      setIsTranscribing(false)
      setError('⏰ Transcription timeout after 30 seconds. Backend might be down. Please try manual transcript.')
    }, 30000) // 30 second timeout
    
    try {
      setError(null)
      setIsTranscribing(true)
      console.log('🎤 Auto-transcribing imported audio file:', {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      })
      
      // Create FormData for the STT API
      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('language', 'auto')
      
      // Try both possible backend ports
      let response
      let lastError
      
      // Try port 8001 first (where your backend is running)
      try {
        console.log('🔄 Trying STT API on port 8001...')
        response = await fetch('http://localhost:8001/api/v1/stt', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        })
        console.log('✅ Port 8001 successful')
      } catch (error) {
        console.log('❌ Port 8001 failed, trying 8000:', error)
        lastError = error
        
        // Fallback to port 8000
        try {
          console.log('🔄 Trying STT API on port 8000...')
          response = await fetch('http://localhost:8000/api/v1/stt', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          })
          console.log('✅ Port 8000 successful')
        } catch (error2) {
          console.log('❌ Both ports failed:', error2)
          throw lastError // Throw the original error
        }
      }
      
      clearTimeout(timeoutId) // Clear timeout if successful
      
      console.log('📡 STT API response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('📋 STT API result:', result)
        
        if (result.text && result.text.trim()) {
          setCurrentTranscript(result.text.trim())
          setSuccess(`✨ Auto-transcription complete! Confidence: ${Math.round((result.confidence || 0.9) * 100)}%`)
          console.log('📝 Auto-transcribed text:', result.text)
        } else {
          console.warn('⚠️ STT returned empty text:', result)
          setError('⚠️ Auto-transcription returned empty text. Please enter the transcript manually.')
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('🚨 STT API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        if (response.status === 400) {
          setError(`⚠️ Auto-transcription failed: ${errorText}. Please enter the transcript manually.`)
        } else if (response.status === 500) {
          setError('⚠️ Auto-transcription service unavailable. Please enter the transcript manually.')
        } else {
          setError(`⚠️ Auto-transcription error (${response.status}): ${response.statusText}. Please enter the transcript manually.`)
        }
      }
      
    } catch (error: any) {
      console.error('Auto-transcription error:', error)
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('⚠️ Cannot connect to backend for auto-transcription. Please enter the transcript manually.')
      } else {
        setError(`⚠️ Auto-transcription failed: ${error.message}. Please enter the transcript manually.`)
      }
      
      // Auto-clear error after 5 seconds so it doesn't block the UI
      setTimeout(() => setError(null), 5000)
    } finally {
      clearTimeout(timeoutId)
      setIsTranscribing(false)
    }
  }
  
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processAudioFile(files[0])
    }
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processAudioFile(files[0])
    }
  }
  
  const drawWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas || waveformData.length === 0) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height } = canvas
    const centerY = height / 2
    
    ctx.clearRect(0, 0, width, height)
    
    // Draw waveform
    ctx.fillStyle = '#8b5cf6' // Purple color
    const barWidth = width / waveformData.length
    
    waveformData.forEach((amplitude, i) => {
      const barHeight = amplitude * centerY
      const x = i * barWidth
      
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight * 2)
    })
    
    // Draw trim selection
    const startX = (trimStart / importedDuration) * width
    const endX = (trimEnd / importedDuration) * width
    
    // Dim out non-selected areas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, startX, height)
    ctx.fillRect(endX, 0, width - endX, height)
    
    // Draw selection borders
    ctx.strokeStyle = '#10b981' // Green color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(startX, 0)
    ctx.lineTo(startX, height)
    ctx.moveTo(endX, 0)
    ctx.lineTo(endX, height)
    ctx.stroke()
  }
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickTime = (x / canvas.width) * importedDuration
    
    // If closer to start, move start; if closer to end, move end
    const distanceToStart = Math.abs(clickTime - trimStart)
    const distanceToEnd = Math.abs(clickTime - trimEnd)
    
    if (distanceToStart < distanceToEnd) {
      setTrimStart(Math.max(0, Math.min(clickTime, trimEnd - 1)))
    } else {
      setTrimEnd(Math.max(trimStart + 1, Math.min(clickTime, importedDuration)))
    }
  }
  
  const trimAudio = async () => {
    if (!importedAudioUrl || !audioContext) return
    
    try {
      setIsProcessingFile(true)
      
      const response = await fetch(importedAudioUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      const sampleRate = audioBuffer.sampleRate
      const startSample = Math.floor(trimStart * sampleRate)
      const endSample = Math.floor(trimEnd * sampleRate)
      const trimmedLength = endSample - startSample
      
      // Create new trimmed audio buffer
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        sampleRate
      )
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        const trimmedChannelData = trimmedBuffer.getChannelData(channel)
        
        for (let i = 0; i < trimmedLength; i++) {
          trimmedChannelData[i] = channelData[startSample + i]
        }
      }
      
      // Convert to blob
      const trimmedBlob = await audioBufferToWav(trimmedBuffer)
      const trimmedUrl = URL.createObjectURL(trimmedBlob)
      
      // Update audio state with trimmed version
      setAudioBlob(trimmedBlob)
      setAudioUrl(trimmedUrl)
      setRecordingTime(trimEnd - trimStart)
      
      // Clean up original imported audio
      if (importedAudioUrl) {
        URL.revokeObjectURL(importedAudioUrl)
      }
      
      setImportedFile(null)
      setImportedAudioUrl(null)
      setShowTrimmer(false)
      setSuccess('Audio imported and trimmed successfully!')
      
    } catch (error) {
      setError('Failed to trim audio. Please try again.')
    } finally {
      setIsProcessingFile(false)
    }
  }
  
  // Convert AudioBuffer to WAV Blob
  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const length = buffer.length
      const arrayBuffer = new ArrayBuffer(44 + length * 2)
      const view = new DataView(arrayBuffer)
      
      // WAV file header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }
      
      writeString(0, 'RIFF')
      view.setUint32(4, 36 + length * 2, true)
      writeString(8, 'WAVE')
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, 1, true)
      view.setUint32(24, buffer.sampleRate, true)
      view.setUint32(28, buffer.sampleRate * 2, true)
      view.setUint16(32, 2, true)
      view.setUint16(34, 16, true)
      writeString(36, 'data')
      view.setUint32(40, length * 2, true)
      
      // Convert audio data
      const channelData = buffer.getChannelData(0)
      let offset = 44
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
      
      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }))
    })
  }
  
  // Update waveform when data changes
  useEffect(() => {
    if (waveformData.length > 0 && canvasRef.current) {
      drawWaveform()
    }
  }, [waveformData, trimStart, trimEnd, importedDuration])
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      
      {/* Navigation Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-lg">🏠</span>
                </div>
                <span className="font-medium">Home</span>
              </a>
              
              <a 
                href="/voice" 
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-red-600 transition-colors"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <MicrophoneIcon className="h-5 w-5" />
                </div>
                <span className="font-medium">Voice Recorder</span>
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <UserIcon className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100">Voice Clone Studio</span>
              </div>
              
              {/* Emergency Stop Button */}
              {(currentPlayingAudio || isTranscribing) && (
                <button
                  onClick={() => {
                    stopAllAudio()
                    setIsTranscribing(false)
                    setIsProcessingFile(false)
                    setError(null)
                    setSuccess('All processes stopped')
                    setTimeout(() => setSuccess(null), 2000)
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 animate-pulse"
                >
                  <StopIcon className="h-4 w-4" />
                  EMERGENCY STOP
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="p-3 bg-purple-600 rounded-xl">
              <UserIcon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Voice Clone Studio
            </h1>
          </motion.div>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Create personalized AI voices with VibeVoice technology. Record samples, train your voice, and generate custom speech.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-gray-700">
            {[
              { key: 'create', label: '🎤 Create Clone', desc: 'Record & Train' },
              { key: 'manage', label: '🎭 Manage Clones', desc: 'Your Voices' },
              { key: 'explore', label: '🌍 Explore Voices', desc: 'Available Options' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="text-sm font-medium">{tab.label}</div>
                <div className="text-xs opacity-75">{tab.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Error/Success Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-red-600 dark:text-red-400">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">{success}</span>
                <button
                  onClick={() => setSuccess(null)}
                  className="ml-auto text-green-400 hover:text-green-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              
              {/* Voice Clone Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                  <UserIcon className="h-6 w-6 text-purple-600" />
                  Select Voice Clone
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {voiceClones.map((clone) => (
                    <motion.button
                      key={clone.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentClone(clone)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        currentClone?.id === clone.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {clone.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {clone.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">
                            {clone.samples.length} samples
                          </span>
                          <div className="flex items-center gap-1">
                            {clone.backendSynced && (
                              <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full" title="Synced with backend">
                                🔗
                              </div>
                            )}
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              clone.status === 'ready' ? 'bg-green-100 text-green-700' :
                              clone.status === 'training' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {clone.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                  
                  {/* Add new clone button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewCloneModal(true)}
                    className="p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-500 transition-all"
                  >
                    <div className="text-center text-purple-600 dark:text-purple-400">
                      <div className="text-4xl mb-2">+</div>
                      <div className="font-medium">Create New Clone</div>
                      <div className="text-sm opacity-75">Start fresh</div>
                    </div>
                  </motion.button>
                </div>
                
                {currentClone && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Working with: {currentClone.name}
                      </h3>
                      <button
                        onClick={() => testVoiceClone(currentClone)}
                        disabled={isProcessing || currentClone.samples.length === 0}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SpeakerWaveIcon className="h-4 w-4" />
                        )}
                        Test Voice
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-600">{currentClone.samples.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Voice Samples</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(currentClone.samples.reduce((acc, sample) => acc + sample.quality, 0) / Math.max(currentClone.samples.length, 1) * 100)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(currentClone.samples.reduce((acc, sample) => acc + sample.duration, 0) / 60)}m
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Audio</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {currentClone && (
                <>
                  {/* Recording Interface */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <MicrophoneIcon className="h-6 w-6 text-red-600" />
                        Record or Import Voice Sample
                      </h2>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowTrimmer(false)
                            setImportedFile(null)
                            setImportedAudioUrl(null)
                            setAudioBlob(null)
                            setAudioUrl(null)
                          }}
                          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {/* Recording Method */}
                      <div className={`rounded-xl border-2 ${showTrimmer || audioUrl ? 'border-gray-200 dark:border-gray-700' : 'border-purple-500'} p-5`}>
                        <div className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          <MicrophoneIcon className="h-5 w-5 text-red-600" />
                          Record Audio
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Use your microphone to record high-quality voice samples for cloning.
                          Speak clearly with minimal background noise.
                        </p>
                        
                        <button
                          onClick={startRecording}
                          disabled={isRecording || showTrimmer || !!audioUrl}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <MicrophoneIcon className="h-5 w-5" />
                          Start Recording
                        </button>
                      </div>
                      
                      {/* Import Method */}
                      <div className={`rounded-xl border-2 ${showTrimmer || audioUrl ? 'border-gray-200 dark:border-gray-700' : 'border-purple-500'} p-5`}>
                        <div className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          <CloudArrowUpIcon className="h-5 w-5 text-blue-600" />
                          Import Audio File
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Upload WAV, FLAC, or MP3 files from your device.
                          Files should be 2 seconds to 5 minutes in length.
                        </p>
                        
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept=".wav,.flac,.mp3,audio/wav,audio/flac,audio/mpeg"
                          className="hidden"
                          disabled={isProcessingFile || !!audioUrl}
                        />
                        
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isProcessingFile || showTrimmer || !!audioUrl}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <CloudArrowUpIcon className="h-5 w-5" />
                          Select Audio File
                        </button>
                      </div>
                    </div>
                    
                    {/* Drag and Drop Zone */}
                    {!audioUrl && !showTrimmer && (
                      <div
                        className={`mb-6 border-2 border-dashed rounded-xl p-8 file-drop-zone ${
                          isDragOver 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 drag-over' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setIsDragOver(true)
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleFileDrop}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-4">
                            {isProcessingFile ? '⏳' : '📁'}
                          </div>
                          <div className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            {isProcessingFile ? 'Processing audio file...' : 'Drag & drop audio files here'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Supports WAV, FLAC, and MP3 files • 2 seconds to 5 minutes • Max 50MB
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* File Error Display */}
                    {fileError && (
                      <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <span className="text-red-600 dark:text-red-400">{fileError}</span>
                          <button
                            onClick={() => setFileError(null)}
                            className="ml-auto text-red-400 hover:text-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Audio Trimmer Interface */}
                    {showTrimmer && importedAudioUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <div className="p-2 bg-purple-600 rounded-lg">
                              <SpeakerWaveIcon className="h-5 w-5 text-white" />
                            </div>
                            Audio Trimmer
                          </h3>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {importedFile?.name} • {formatTime(importedDuration)}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {/* Waveform Canvas */}
                          <div className="relative">
                            <canvas
                              ref={canvasRef}
                              width={800}
                              height={200}
                              onClick={handleCanvasClick}
                              className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-crosshair border border-gray-300 dark:border-gray-600 waveform-canvas transition-all duration-200 hover:shadow-lg"
                              style={{ aspectRatio: '4/1' }}
                            />
                            
                            {/* Time markers */}
                            <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
                              <span>0:00</span>
                              <span>{formatTime(importedDuration / 2)}</span>
                              <span>{formatTime(importedDuration)}</span>
                            </div>
                          </div>
                          
                          {/* Trim Controls */}
                          <div className="space-y-4">
                            {/* Range Sliders */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Start Time: {formatTime(trimStart)}
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(0, trimEnd - 0.5)}
                                  step={0.01}
                                  value={trimStart}
                                  onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  End Time: {formatTime(trimEnd)}
                                </label>
                                <input
                                  type="range"
                                  min={Math.max(0, trimStart + 0.5)}
                                  max={importedDuration}
                                  step={0.01}
                                  value={trimEnd}
                                  onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                              </div>
                            </div>
                            
                            {/* Precise Number Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Start (seconds)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={Math.max(0, trimEnd - 0.5)}
                                  step={0.01}
                                  value={trimStart.toFixed(2)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    setTrimStart(Math.max(0, Math.min(val, trimEnd - 0.5)))
                                  }}
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  End (seconds)
                                </label>
                                <input
                                  type="number"
                                  min={Math.max(0, trimStart + 0.5)}
                                  max={importedDuration}
                                  step={0.01}
                                  value={trimEnd.toFixed(2)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || importedDuration
                                    setTrimEnd(Math.max(trimStart + 0.5, Math.min(val, importedDuration)))
                                  }}
                                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                                />
                              </div>
                            </div>
                            
                            {/* Quick Trim Buttons */}
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  setTrimStart(0)
                                  setTrimEnd(Math.min(10, importedDuration))
                                }}
                                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                              >
                                First 10s
                              </button>
                              <button
                                onClick={() => {
                                  setTrimStart(Math.max(0, importedDuration - 10))
                                  setTrimEnd(importedDuration)
                                }}
                                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                              >
                                Last 10s
                              </button>
                              <button
                                onClick={() => {
                                  const center = importedDuration / 2
                                  setTrimStart(Math.max(0, center - 5))
                                  setTrimEnd(Math.min(importedDuration, center + 5))
                                }}
                                className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-full transition-colors"
                              >
                                Middle 10s
                              </button>
                              <button
                                onClick={() => {
                                  setTrimStart(0)
                                  setTrimEnd(importedDuration)
                                }}
                                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                              >
                                Full Audio
                              </button>
                            </div>
                          </div>
                          
                          {/* Selection Info */}
                          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Selection: <span className="font-medium text-purple-600">{formatTime(trimEnd - trimStart)}</span>
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                Quality: <span className="font-medium text-green-600">{trimEnd - trimStart >= 10 ? 'Excellent' : trimEnd - trimStart >= 5 ? 'Good' : 'Fair'}</span>
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  // Stop any currently playing audio first
                                  stopAllAudio()
                                  
                                  const audio = new Audio(importedAudioUrl!)
                                  setCurrentPlayingAudio(audio)
                                  setPlayingStates({ 'trimmer-preview': true })
                                  
                                  audio.onloadeddata = () => {
                                    audio.currentTime = trimStart
                                    audio.play().catch(e => console.error('Trimmer preview play error:', e))
                                    
                                    // Stop at trim end time
                                    const duration = (trimEnd - trimStart) * 1000
                                    setTimeout(() => {
                                      audio.pause()
                                      setCurrentPlayingAudio(null)
                                      setPlayingStates({})
                                    }, duration)
                                  }
                                  
                                  audio.onended = () => {
                                    setCurrentPlayingAudio(null)
                                    setPlayingStates({})
                                  }
                                  
                                  audio.onerror = (e) => {
                                    console.error('Trimmer preview error:', e)
                                    setCurrentPlayingAudio(null)
                                    setPlayingStates({})
                                    setError('Failed to play audio preview')
                                  }
                                }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                              >
                                <PlayIcon className="h-4 w-4" />
                                Preview Selection
                              </button>
                              
                              <button
                                onClick={trimAudio}
                                disabled={isProcessingFile}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg transition-colors flex items-center gap-2"
                              >
                                {isProcessingFile ? (
                                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircleIcon className="h-4 w-4" />
                                )}
                                Use Trimmed Audio
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Sample Prompts */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        📝 Suggested Prompts (Click to Use)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                        {samplePrompts.map((prompt, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentTranscript(prompt)}
                            className="p-3 text-left bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                          >
                            <div className="text-sm text-gray-900 dark:text-gray-100">
                              {prompt}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sample Name
                        </label>
                        <input
                          type="text"
                          value={currentSampleName}
                          onChange={(e) => setCurrentSampleName(e.target.value)}
                          placeholder="e.g., Introduction Sample #1"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Recording Duration
                        </label>
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                          <span className="text-lg font-mono text-purple-600">
                            {isRecording ? '🔴' : '⏸️'} {formatTime(recordingTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Text to Read (Transcript) {showTrimmer && currentTranscript.trim() && '✅ Auto-generated'}
                        </label>
                        {showTrimmer && importedFile && (
                          <button
                            onClick={() => autoTranscribeAudio(importedFile)}
                            disabled={isTranscribing}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center gap-1"
                          >
                            {isTranscribing ? (
                              <ArrowPathIcon className="h-3 w-3 animate-spin" />
                            ) : (
                              <MicrophoneIcon className="h-3 w-3" />
                            )}
                            {isTranscribing ? 'Transcribing...' : 'Re-transcribe'}
                          </button>
                        )}
                      </div>
                      
                      {showTrimmer && (
                        <div className="mb-3 space-y-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              <strong>🤖 Auto-Transcription:</strong> The system will automatically transcribe your imported audio using Whisper STT. 
                              You can edit the transcript if needed or use the transcribe button below.
                            </p>
                          </div>
                          
                          {!currentTranscript.trim() && (
                            <div className="text-center space-y-3">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  onClick={() => autoTranscribeAudio(importedFile!)}
                                  disabled={isTranscribing}
                                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                  {isTranscribing ? (
                                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <MicrophoneIcon className="h-5 w-5" />
                                  )}
                                  {isTranscribing ? 'Transcribing Audio...' : 'Transcribe Audio with Whisper'}
                                </button>
                                
                                {isTranscribing && (
                                  <button
                                    onClick={() => {
                                      setIsTranscribing(false)
                                      setError('Transcription cancelled by user')
                                      setTimeout(() => setError(null), 3000)
                                    }}
                                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    <StopIcon className="h-5 w-5" />
                                    Cancel
                                  </button>
                                )}
                              </div>
                              
                              <div className="text-center">
                                <button
                                  onClick={() => {
                                    const isDevelopment = window.location.hostname === 'localhost'
                                    if (isDevelopment) {
                                      setCurrentTranscript('[Manual transcript - please edit this text with what is said in the audio]')
                                      setSuccess('Manual transcript placeholder added - please edit it!')
                                    }
                                  }}
                                  className="text-sm px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                >
                                  Skip & Add Manual Transcript
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <textarea
                        value={currentTranscript}
                        onChange={(e) => setCurrentTranscript(e.target.value)}
                        placeholder={showTrimmer 
                          ? "Auto-transcription will appear here... (you can edit it if needed)" 
                          : "Enter the text you'll be reading for this voice sample..."
                        }
                        rows={4}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                          showTrimmer && !currentTranscript.trim() 
                            ? 'border-blue-300 dark:border-blue-600' 
                            : showTrimmer && currentTranscript.trim()
                            ? 'border-green-300 dark:border-green-600 ring-1 ring-green-300'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      
                      {showTrimmer && (
                        <div className="mt-2 text-xs">
                          {currentTranscript.trim() ? (
                            <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircleIcon className="h-3 w-3" />
                              Transcript ready! Voice cloning quality will be excellent.
                            </p>
                          ) : (
                            <p className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <ArrowPathIcon className={`h-3 w-3 ${isTranscribing ? 'animate-spin' : ''}`} />
                              {isTranscribing ? 'Auto-transcribing audio...' : 'Waiting for auto-transcription or manual input...'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Recording Controls */}
                    <div className="flex justify-center items-center gap-6 mb-8">
                      {!isRecording ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={startRecording}
                          className="flex items-center justify-center w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200"
                        >
                          <MicrophoneIcon className="h-8 w-8" />
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={stopRecording}
                          className="flex items-center justify-center w-20 h-20 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg recording-pulse"
                        >
                          <StopIcon className="h-8 w-8" />
                        </motion.button>
                      )}
                      
                      {audioUrl && (
                        <div className="flex items-center gap-3">
                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => toggleAudioPlayback(audioUrl, 'preview')}
                            className="flex items-center justify-center w-16 h-16 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg"
                            title={playingStates['preview'] ? 'Pause Preview' : 'Play Preview'}
                          >
                            {playingStates['preview'] ? (
                              <PauseIcon className="h-6 w-6" />
                            ) : (
                              <PlayIcon className="h-6 w-6" />
                            )}
                          </motion.button>
                          
                          {(playingStates['preview'] || (currentPlayingAudio && !currentPlayingAudio.paused)) && (
                            <motion.button
                              initial={{ opacity: 0, x: 25 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={stopAllAudio}
                              className="flex items-center justify-center w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-full shadow-lg"
                              title="Stop Preview"
                            >
                              <StopIcon className="h-5 w-5" />
                            </motion.button>
                          )}
                        </div>
                      )}
                      
                      {audioUrl && (
                        <motion.button
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={addVoiceSample}
                          disabled={!currentSampleName.trim()}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          <CloudArrowUpIcon className="h-5 w-5" />
                          Add Sample
                        </motion.button>
                      )}
                    </div>
                    
                    {isRecording && (
                      <div className="text-center text-red-500 font-medium animate-pulse mb-4">
                        🔴 Recording in progress... Speak clearly into your microphone
                      </div>
                    )}
                  </div>
                  
                  {/* Voice Samples List */}
                  {currentClone.samples.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                        <SpeakerWaveIcon className="h-6 w-6 text-green-600" />
                        Voice Samples ({currentClone.samples.length})
                      </h2>
                      
                      <div className="space-y-4">
                        {currentClone.samples.map((sample) => (
                          <motion.div
                            key={sample.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                  {sample.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  <span>⏱️ {formatTime(sample.duration)}</span>
                                  <span>📊 {Math.round(sample.quality * 100)}% quality</span>
                                  <span>📅 {sample.uploadedAt.toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleAudioPlayback(sample.audioUrl, sample.id)}
                                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                  title={playingStates[sample.id] ? 'Pause' : 'Play'}
                                >
                                  {playingStates[sample.id] ? (
                                    <PauseIcon className="h-4 w-4" />
                                  ) : (
                                    <PlayIcon className="h-4 w-4" />
                                  )}
                                </button>
                                
                                {(playingStates[sample.id] || (currentPlayingAudio && !currentPlayingAudio.paused)) && (
                                  <button
                                    onClick={stopAllAudio}
                                    className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                    title="Stop"
                                  >
                                    <StopIcon className="h-4 w-4" />
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => removeVoiceSample(sample.id)}
                                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg">
                              <strong>Transcript:</strong> {sample.transcript}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
          
          {activeTab === 'manage' && (
            <motion.div
              key="manage"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <UserIcon className="h-6 w-6 text-purple-600" />
                  Your Voice Clones ({voiceClones.length})
                </h2>
                <button
                  onClick={reconcileWithBackend}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  title="Sync with backend to check for new voice clones"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  {isProcessing ? 'Syncing...' : 'Sync Backend'}
                </button>
              </div>
              
              {voiceClones.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎭</div>
                  <p className="text-gray-400 text-lg mb-4">No voice clones yet</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Create Your First Voice Clone
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {voiceClones.map((clone) => (
                    <motion.div
                      key={clone.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {clone.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {clone.backendSynced ? (
                            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full" title="Synced with VibeVoice backend - ready for testing">
                              🔗 Synced
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full" title="Local only - needs voice sample to sync with backend">
                              ⚠️ Local Only
                            </div>
                          )}
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            clone.status === 'ready' ? 'bg-green-100 text-green-700' :
                            clone.status === 'training' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {clone.status}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {clone.description || 'No description provided'}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {clone.samples.length}
                          </div>
                          <div className="text-xs text-gray-500">Samples</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(clone.samples.reduce((acc, sample) => acc + sample.quality, 0) / Math.max(clone.samples.length, 1) * 100)}%
                          </div>
                          <div className="text-xs text-gray-500">Quality</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentClone(clone)
                            setActiveTab('create')
                          }}
                          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => testVoiceClone(clone)}
                          disabled={isProcessing || clone.samples.length === 0 || !clone.backendSynced}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm rounded-lg transition-colors"
                          title={
                            !clone.backendSynced ? 'Voice clone must be synced with backend to test' :
                            clone.samples.length === 0 ? 'Voice clone needs voice samples to test' :
                            'Test this voice clone with VibeVoice'
                          }
                        >
                          {!clone.backendSynced ? '🔄 Sync First' : 'Test'}
                        </button>
                        <button
                          onClick={() => deleteVoiceClone(clone.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                <SpeakerWaveIcon className="h-6 w-6 text-blue-600" />
                Available VibeVoice Models ({Array.isArray(availableVoices) ? availableVoices.length : 0})
              </h2>
              
              {!Array.isArray(availableVoices) || availableVoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌍</div>
                  <p className="text-gray-400 text-lg mb-4">
                    {!Array.isArray(availableVoices) ? 'Error loading voices...' : 'Loading available voices...'}
                  </p>
                  <button
                    onClick={loadAvailableVoices}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {!Array.isArray(availableVoices) ? 'Retry Loading' : 'Load Voices'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Info banner for demo/fallback voices */}
                  {availableVoices === mockVoices && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="text-blue-600 dark:text-blue-400 text-2xl">🛠️</div>
                        <div>
                          <p className="text-blue-800 dark:text-blue-200 font-medium">
                            Demo Mode: Showing sample voices
                          </p>
                          <p className="text-blue-600 dark:text-blue-300 text-sm">
                            VibeVoice API not connected. These are example voices for demonstration.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableVoices.map((voice) => (
                      <motion.div
                        key={voice.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
                      >
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {voice.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {voice.language}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            {voice.gender}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {voice.description}
                        </p>
                        <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                          Preview Voice
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* New Clone Modal */}
        <AnimatePresence>
          {showNewCloneModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowNewCloneModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  Create New Voice Clone
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Clone Name
                    </label>
                    <input
                      type="text"
                      value={newCloneName}
                      onChange={(e) => setNewCloneName(e.target.value)}
                      placeholder="e.g., My Professional Voice"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newCloneDescription}
                      onChange={(e) => setNewCloneDescription(e.target.value)}
                      placeholder="Brief description of this voice clone's purpose..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-8">
                  <button
                    onClick={() => setShowNewCloneModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewVoiceClone}
                    disabled={!newCloneName.trim()}
                    className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-medium transition-colors"
                  >
                    Create Clone
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}