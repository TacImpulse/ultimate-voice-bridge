'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
  ArrowUpTrayIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  HeartIcon,
  UserPlusIcon,
  StarIcon
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
  customTestText?: string  // User's preferred test text for this clone
  cachedTestAudio?: {
    text: string
    audioUrl?: string
    audioSize: number
    testedAt: number
    cacheKey: string
    isCustomText?: boolean  // Whether this was from custom test text
  }  // Cached test audio information
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

interface VoiceLibraryEntry {
  id: string
  name: string
  gender: 'Male' | 'Female' | 'Non-binary'
  nationality: string
  language: string
  accent: string
  style: string[]
  ageRange: string
  description: string
  quality: number // 1-5 stars
  source: 'OpenVoice' | 'Coqui-TTS' | 'Microsoft' | 'Mozilla' | 'ElevenLabs' | 'Bark' | 'Community' | 'Google' | 'System' | 'Festival' | 'eSpeak'
  license: 'Open Source' | 'Free Commercial' | 'Attribution Required' | 'Non-Commercial' | 'Free Tier' | 'Free'
  modelSize: string
  sampleUrl?: string
  githubUrl?: string
  paperUrl?: string
  tags: string[]
  featured: boolean
  webSpeechName?: string // For Web Speech API compatibility
  ttsConfig?: {
    provider?: string
    voice_name?: string
    rate?: number
    pitch?: number
    ms_voice_name?: string
    system_voice_name?: string
  }
}

// Mock voices for fallback when API is unavailable
const mockVoices: AvailableVoice[] = [
  {
    id: 'mock_voice_1',
    name: 'Mock Voice 1',
    language: 'English (US)',
    gender: 'Female',
    description: 'Mock voice for development'
  },
  {
    id: 'mock_voice_2', 
    name: 'Mock Voice 2',
    language: 'English (US)',
    gender: 'Male',
    description: 'Mock voice for development'
  }
]

export default function VoiceClonePage() {
  // Voice clone management
  const [voiceClones, setVoiceClones] = useState<VoiceClone[]>([])
  const [currentClone, setCurrentClone] = useState<VoiceClone | null>(null)
  const [availableVoices, setAvailableVoices] = useState<AvailableVoice[]>([])
  
  // Voice library state
  const [voiceLibrary, setVoiceLibrary] = useState<VoiceLibraryEntry[]>([])
  const [filteredVoices, setFilteredVoices] = useState<VoiceLibraryEntry[]>([])
  const [selectedGender, setSelectedGender] = useState<string>('All')
  const [selectedNationality, setSelectedNationality] = useState<string>('All')
  const [selectedStyle, setSelectedStyle] = useState<string>('All')
  const [selectedSource, setSelectedSource] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState<boolean>(false)
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([])
  const [selectedVoices, setSelectedVoices] = useState<string[]>([])
  
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
  
  // Custom test text state
  const [customTestText, setCustomTestText] = useState('')
  const [showCustomTestInput, setShowCustomTestInput] = useState(false)
  const [isSTTForTest, setIsSTTForTest] = useState(false)
  
  // Cached text display state
  const [expandedCachedText, setExpandedCachedText] = useState<{[key: string]: boolean}>({})
  const [currentCustomTestClone, setCurrentCustomTestClone] = useState<VoiceClone | null>(null)
  
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
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
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
  
  // Advanced recording state
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([])
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const [recordingQuality, setRecordingQuality] = useState<'low' | 'medium' | 'high' | 'studio'>('high')
  const [noiseReduction, setNoiseReduction] = useState<boolean>(true)
  const [autoGain, setAutoGain] = useState<boolean>(true)
  const [echoCancellation, setEchoCancellation] = useState<boolean>(true)
  
  // Audio playback progress tracking
  const [playbackProgress, setPlaybackProgress] = useState<number>(0)
  const progressUpdateRef = useRef<NodeJS.Timeout | null>(null)
  
  // Voice clone editing state
  const [editingCloneName, setEditingCloneName] = useState<string | null>(null)
  const [editingCloneDescription, setEditingCloneDescription] = useState<string | null>(null)
  const [tempCloneName, setTempCloneName] = useState<string>('')
  const [tempCloneDescription, setTempCloneDescription] = useState<string>('')
  
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
  
  // Comprehensive Voice Library with high-quality open-source and public voices
  const voiceLibraryData: VoiceLibraryEntry[] = [
    // ===== FEATURED VOICES =====
    {
      id: 'openvoice_emma',
      name: 'Emma (OpenVoice)',
      gender: 'Female',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'Received Pronunciation',
      style: ['Professional', 'News', 'Audiobook'],
      ageRange: '25-35',
      description: 'Crystal-clear British English with professional tone. Excellent for business, news reading, and educational content.',
      quality: 5,
      source: 'OpenVoice',
      license: 'Open Source',
      modelSize: '1.2GB',
      githubUrl: 'https://github.com/myshell-ai/OpenVoice',
      paperUrl: 'https://arxiv.org/abs/2312.01479',
      tags: ['Neural', 'Zero-Shot', 'Multi-lingual'],
      featured: true
    },
    {
      id: 'coqui_male_deep',
      name: 'Marcus (Coqui Deep)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Documentary', 'Narrator', 'Authoritative'],
      ageRange: '35-45',
      description: 'Deep, authoritative male voice perfect for documentaries, audiobooks, and serious content. Rich bass tones.',
      quality: 5,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '890MB',
      githubUrl: 'https://github.com/coqui-ai/TTS',
      tags: ['VITS', 'Neural', 'High-Quality'],
      featured: true
    },
    {
      id: 'elevenlabs_aria',
      name: 'Aria (Natural)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'California',
      style: ['Conversational', 'Friendly', 'Customer Service'],
      ageRange: '20-30',
      description: 'Natural, friendly female voice with excellent emotional range. Perfect for conversational AI and customer service.',
      quality: 5,
      source: 'ElevenLabs',
      license: 'Free Commercial',
      modelSize: '2.1GB',
      tags: ['Emotional', 'Realistic', 'Commercial'],
      featured: true
    },
    
    // ===== ENGLISH VOICES =====
    {
      id: 'mozilla_jenny',
      name: 'Jenny (Mozilla)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Midwest',
      style: ['News', 'Educational', 'Clear'],
      ageRange: '25-35',
      description: 'Clear, neutral American English. Excellent for educational content and news reading.',
      quality: 4,
      source: 'Mozilla',
      license: 'Open Source',
      modelSize: '450MB',
      githubUrl: 'https://github.com/mozilla/TTS',
      tags: ['Tacotron2', 'WaveNet', 'Clear'],
      featured: false
    },
    {
      id: 'bark_speaker_2',
      name: 'Oliver (Bark)',
      gender: 'Male',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'London',
      style: ['Storytelling', 'Audiobook', 'Character'],
      ageRange: '30-40',
      description: 'Expressive British male voice with character variation capabilities. Great for storytelling and character voices.',
      quality: 4,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '3.2GB',
      githubUrl: 'https://github.com/suno-ai/bark',
      tags: ['Transformer', 'Multi-style', 'Character'],
      featured: false
    },
    {
      id: 'coqui_australian',
      name: 'Sophie (Australian)',
      gender: 'Female',
      nationality: 'Australian',
      language: 'English (AU)',
      accent: 'General Australian',
      style: ['Casual', 'Upbeat', 'Marketing'],
      ageRange: '20-30',
      description: 'Energetic Australian female voice. Perfect for upbeat marketing content and casual conversations.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '780MB',
      tags: ['Accent', 'Energetic', 'Marketing'],
      featured: false
    },
    
    // ===== INTERNATIONAL VOICES =====
    {
      id: 'openvoice_french',
      name: 'Marie (Française)',
      gender: 'Female',
      nationality: 'French',
      language: 'French',
      accent: 'Parisian',
      style: ['Elegant', 'Professional', 'Cultural'],
      ageRange: '30-40',
      description: 'Elegant Parisian French with sophisticated pronunciation. Perfect for French content and cultural presentations.',
      quality: 5,
      source: 'OpenVoice',
      license: 'Open Source',
      modelSize: '1.1GB',
      tags: ['Multi-lingual', 'Sophisticated', 'Native'],
      featured: false
    },
    {
      id: 'coqui_german',
      name: 'Klaus (Deutsch)',
      gender: 'Male',
      nationality: 'German',
      language: 'German',
      accent: 'Standard German',
      style: ['Technical', 'Educational', 'Formal'],
      ageRange: '35-45',
      description: 'Clear, precise German pronunciation. Excellent for technical documentation and educational content in German.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '920MB',
      tags: ['Technical', 'Precise', 'Educational'],
      featured: false
    },
    {
      id: 'openvoice_spanish',
      name: 'Carlos (Español)',
      gender: 'Male',
      nationality: 'Spanish',
      language: 'Spanish',
      accent: 'Castilian',
      style: ['News', 'Dramatic', 'Passionate'],
      ageRange: '30-40',
      description: 'Rich, expressive Spanish voice with dramatic flair. Perfect for news, storytelling, and passionate content.',
      quality: 4,
      source: 'OpenVoice',
      license: 'Open Source',
      modelSize: '1.0GB',
      tags: ['Expressive', 'Dramatic', 'Native'],
      featured: false
    },
    
    // ===== SPECIALIZED VOICES =====
    {
      id: 'bark_child',
      name: 'Alex (Young)',
      gender: 'Non-binary',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Child-friendly', 'Educational', 'Innocent'],
      ageRange: '8-12',
      description: 'Young, innocent voice perfect for children\'s content, educational materials, and family-friendly applications.',
      quality: 3,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '2.8GB',
      tags: ['Child-like', 'Educational', 'Safe'],
      featured: false
    },
    {
      id: 'coqui_elderly',
      name: 'Margaret (Wise)',
      gender: 'Female',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'Received Pronunciation',
      style: ['Wisdom', 'Storytelling', 'Gentle'],
      ageRange: '60-70',
      description: 'Gentle, wise elderly voice with warmth and experience. Perfect for storytelling and wisdom-sharing content.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '680MB',
      tags: ['Elderly', 'Wise', 'Storytelling'],
      featured: false
    },
    {
      id: 'elevenlabs_robot',
      name: 'ARIA-7 (Synthetic)',
      gender: 'Non-binary',
      nationality: 'Synthetic',
      language: 'English (Neutral)',
      accent: 'Digital',
      style: ['Robotic', 'AI', 'Futuristic'],
      ageRange: 'N/A',
      description: 'Futuristic AI voice with robotic characteristics. Perfect for sci-fi content, AI assistants, and tech demos.',
      quality: 4,
      source: 'ElevenLabs',
      license: 'Free Commercial',
      modelSize: '1.5GB',
      tags: ['Robotic', 'Futuristic', 'AI'],
      featured: false
    },
    
    // ===== WEB SPEECH API VOICES (FREE & BUILT-IN) =====
    {
      id: 'webspeech_samantha',
      name: 'Samantha (System)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Assistant', 'Clear', 'System'],
      ageRange: '25-35',
      description: 'Built-in system voice with clear pronunciation. Available on most devices for immediate testing.',
      quality: 4,
      source: 'System',
      license: 'Free',
      modelSize: 'Built-in',
      tags: ['System', 'Built-in', 'Reliable'],
      featured: true,
      webSpeechName: 'Samantha',
      ttsConfig: {
        system_voice_name: 'Samantha'
      }
    },
    {
      id: 'webspeech_alex',
      name: 'Alex (System)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Assistant', 'Clear', 'System'],
      ageRange: '30-40',
      description: 'Built-in male system voice with natural tone. Widely available for immediate voice testing.',
      quality: 4,
      source: 'System',
      license: 'Free',
      modelSize: 'Built-in',
      tags: ['System', 'Built-in', 'Natural'],
      featured: true,
      webSpeechName: 'Alex',
      ttsConfig: {
        system_voice_name: 'Alex'
      }
    },
    
    // ===== GOOGLE VOICES (FREE TIER) =====
    {
      id: 'google_en_us_standard_a',
      name: 'Standard-A (Google)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Standard', 'Clear', 'Professional'],
      ageRange: '25-35',
      description: 'Google\'s standard English voice with clear pronunciation and professional tone.',
      quality: 4,
      source: 'Google',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Google', 'Standard', 'Cloud'],
      featured: false,
      webSpeechName: 'Google US English',
      ttsConfig: {
        provider: 'google',
        voice_name: 'en-US-Standard-A',
        rate: 1.0,
        pitch: 1.0
      }
    },
    {
      id: 'google_en_us_standard_b',
      name: 'Standard-B (Google)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Standard', 'Clear', 'Professional'],
      ageRange: '30-40',
      description: 'Google\'s male English voice with authoritative tone and clear articulation.',
      quality: 4,
      source: 'Google',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Google', 'Standard', 'Authoritative'],
      featured: false,
      webSpeechName: 'Google US English',
      ttsConfig: {
        provider: 'google',
        voice_name: 'en-US-Standard-B',
        rate: 1.0,
        pitch: 1.0
      }
    },
    {
      id: 'google_en_uk_standard_a',
      name: 'UK Standard-A (Google)',
      gender: 'Female',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'Received Pronunciation',
      style: ['Standard', 'British', 'Elegant'],
      ageRange: '25-35',
      description: 'Google\'s British English voice with elegant RP accent and professional tone.',
      quality: 4,
      source: 'Google',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Google', 'British', 'Elegant'],
      featured: false,
      webSpeechName: 'Google UK English Female'
    },
    {
      id: 'google_en_au_standard_a',
      name: 'AU Standard-A (Google)',
      gender: 'Female',
      nationality: 'Australian',
      language: 'English (AU)',
      accent: 'General Australian',
      style: ['Standard', 'Australian', 'Friendly'],
      ageRange: '25-35',
      description: 'Google\'s Australian English voice with friendly accent and upbeat tone.',
      quality: 4,
      source: 'Google',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Google', 'Australian', 'Friendly'],
      featured: false,
      webSpeechName: 'Google UK English Female'
    },
    
    // ===== MICROSOFT VOICES (FREE TIER) =====
    {
      id: 'microsoft_aria',
      name: 'Aria (Microsoft)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Conversational', 'Friendly', 'Modern'],
      ageRange: '25-35',
      description: 'Microsoft\'s modern conversational voice with natural intonation and friendly tone.',
      quality: 5,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Microsoft', 'Neural', 'Modern'],
      featured: true,
      webSpeechName: 'Microsoft Aria Online (Natural) - English (United States)',
      ttsConfig: {
        provider: 'microsoft',
        voice_name: 'en-US-AriaNeural',
        rate: 1.0,
        pitch: 1.0,
        ms_voice_name: 'en-US-AriaNeural',
        system_voice_name: 'Microsoft Aria Online (Natural) - English (United States)'
      }
    },
    {
      id: 'microsoft_guy',
      name: 'Guy (Microsoft)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Conversational', 'Casual', 'Modern'],
      ageRange: '30-40',
      description: 'Microsoft\'s casual male voice with natural speech patterns and modern appeal.',
      quality: 5,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Microsoft', 'Neural', 'Casual'],
      featured: true,
      webSpeechName: 'Microsoft Guy Online (Natural) - English (United States)',
      ttsConfig: {
        provider: 'microsoft',
        voice_name: 'en-US-GuyNeural',
        rate: 1.0,
        pitch: 1.0,
        ms_voice_name: 'en-US-GuyNeural',
        system_voice_name: 'Microsoft Guy Online (Natural) - English (United States)'
      }
    },
    {
      id: 'microsoft_jenny',
      name: 'Jenny (Microsoft)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Assistant', 'Professional', 'Reliable'],
      ageRange: '28-38',
      description: 'Microsoft\'s reliable assistant voice with professional tone and clear articulation.',
      quality: 4,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Microsoft', 'Assistant', 'Professional'],
      featured: false,
      webSpeechName: 'Microsoft Jenny Online (Natural) - English (United States)',
      ttsConfig: {
        provider: 'microsoft',
        voice_name: 'en-US-JennyNeural',
        rate: 1.0,
        pitch: 1.0
      }
    },
    {
      id: 'microsoft_ryan',
      name: 'Ryan (Microsoft)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['News', 'Authoritative', 'Clear'],
      ageRange: '35-45',
      description: 'Microsoft\'s authoritative news voice with commanding presence and clear delivery.',
      quality: 4,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Microsoft', 'News', 'Authoritative'],
      featured: false,
      webSpeechName: 'Microsoft Ryan Online (Natural) - English (United States)',
      ttsConfig: {
        provider: 'microsoft',
        voice_name: 'en-US-RyanNeural',
        rate: 1.0,
        pitch: 1.0
      }
    },
    {
      id: 'microsoft_libby',
      name: 'Libby (Microsoft UK)',
      gender: 'Female',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'Received Pronunciation',
      style: ['British', 'Elegant', 'Professional'],
      ageRange: '25-35',
      description: 'Microsoft\'s British voice with elegant RP accent and sophisticated delivery.',
      quality: 5,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Microsoft', 'British', 'Sophisticated'],
      featured: false,
      webSpeechName: 'Microsoft Libby Online (Natural) - English (United Kingdom)',
      ttsConfig: {
        provider: 'microsoft',
        voice_name: 'en-GB-LibbyNeural',
        rate: 1.0,
        pitch: 1.0
      }
    },
    
    // ===== COQUI VOICES (OPEN SOURCE) =====
    {
      id: 'coqui_ljspeech',
      name: 'LJSpeech (Coqui)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Reading', 'Audiobook', 'Clear'],
      ageRange: '30-40',
      description: 'High-quality voice trained on the LJSpeech dataset. Perfect for audiobooks and reading applications.',
      quality: 5,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '120MB',
      githubUrl: 'https://github.com/coqui-ai/TTS',
      tags: ['VITS', 'LJSpeech', 'Audiobook'],
      featured: true
    },
    {
      id: 'coqui_vctk_p225',
      name: 'VCTK-225 (Scottish)',
      gender: 'Female',
      nationality: 'Scottish',
      language: 'English (UK)',
      accent: 'Scottish',
      style: ['Accent', 'Character', 'Regional'],
      ageRange: '22-28',
      description: 'Scottish-accented female voice from the VCTK dataset. Great for character voices and regional content.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '95MB',
      tags: ['VCTK', 'Scottish', 'Accent'],
      featured: false
    },
    {
      id: 'coqui_vctk_p226',
      name: 'VCTK-226 (Northern English)',
      gender: 'Male',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'Northern English',
      style: ['Accent', 'Regional', 'Character'],
      ageRange: '25-32',
      description: 'Northern English male voice with distinctive regional accent. Perfect for character work.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '98MB',
      tags: ['VCTK', 'Northern', 'Regional'],
      featured: false
    },
    {
      id: 'coqui_vctk_p227',
      name: 'VCTK-227 (Irish)',
      gender: 'Male',
      nationality: 'Irish',
      language: 'English (IE)',
      accent: 'Irish',
      style: ['Accent', 'Character', 'Storytelling'],
      ageRange: '28-35',
      description: 'Irish-accented male voice with warm, storytelling quality. Great for narrative content.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '102MB',
      tags: ['VCTK', 'Irish', 'Storytelling'],
      featured: false
    },
    {
      id: 'coqui_vctk_p243',
      name: 'VCTK-243 (Welsh)',
      gender: 'Female',
      nationality: 'Welsh',
      language: 'English (UK)',
      accent: 'Welsh',
      style: ['Accent', 'Musical', 'Character'],
      ageRange: '26-33',
      description: 'Welsh-accented female voice with musical intonation. Perfect for character voices and regional content.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '96MB',
      tags: ['VCTK', 'Welsh', 'Musical'],
      featured: false
    },
    
    // ===== MOZILLA COMMON VOICE =====
    {
      id: 'mozilla_cv_en_us_1',
      name: 'CommonVoice-EN-1',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Community', 'Natural', 'Diverse'],
      ageRange: '25-35',
      description: 'Community-contributed voice from Mozilla Common Voice. Natural and diverse speech patterns.',
      quality: 3,
      source: 'Mozilla',
      license: 'Open Source',
      modelSize: '180MB',
      githubUrl: 'https://github.com/mozilla/TTS',
      tags: ['Community', 'Diverse', 'Open'],
      featured: false
    },
    {
      id: 'mozilla_cv_en_us_2',
      name: 'CommonVoice-EN-2',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'General American',
      style: ['Community', 'Casual', 'Diverse'],
      ageRange: '30-40',
      description: 'Community male voice with casual, natural delivery. Part of the open voice revolution.',
      quality: 3,
      source: 'Mozilla',
      license: 'Open Source',
      modelSize: '165MB',
      tags: ['Community', 'Casual', 'Natural'],
      featured: false
    },
    
    // ===== INTERNATIONAL EXPANSION =====
    {
      id: 'coqui_fr_mai',
      name: 'Mai (French)',
      gender: 'Female',
      nationality: 'French',
      language: 'French',
      accent: 'Standard French',
      style: ['Professional', 'Clear', 'Native'],
      ageRange: '25-35',
      description: 'Native French speaker with clear, professional pronunciation. Perfect for French content creation.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '145MB',
      tags: ['Native', 'Professional', 'Clear'],
      featured: false,
      webSpeechName: 'Google français'
    },
    {
      id: 'coqui_de_thorsten',
      name: 'Thorsten (German)',
      gender: 'Male',
      nationality: 'German',
      language: 'German',
      accent: 'Standard German',
      style: ['Authoritative', 'Clear', 'Professional'],
      ageRange: '35-45',
      description: 'Authoritative German voice with precise pronunciation. Excellent for technical and professional content.',
      quality: 5,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '165MB',
      tags: ['Authoritative', 'Technical', 'Native'],
      featured: false,
      webSpeechName: 'Google Deutsch'
    },
    {
      id: 'coqui_es_carlfm',
      name: 'Carlos (Spanish)',
      gender: 'Male',
      nationality: 'Spanish',
      language: 'Spanish',
      accent: 'European Spanish',
      style: ['Professional', 'News', 'Clear'],
      ageRange: '30-40',
      description: 'Professional European Spanish voice with news-quality clarity and pronunciation.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '155MB',
      tags: ['Professional', 'News', 'European'],
      featured: false,
      webSpeechName: 'Google español'
    },
    {
      id: 'coqui_pt_brazilian',
      name: 'Isabella (Brazilian)',
      gender: 'Female',
      nationality: 'Brazilian',
      language: 'Portuguese (BR)',
      accent: 'Brazilian Portuguese',
      style: ['Warm', 'Friendly', 'Native'],
      ageRange: '25-35',
      description: 'Warm Brazilian Portuguese voice with native accent and friendly tone.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '140MB',
      tags: ['Brazilian', 'Warm', 'Native'],
      featured: false,
      webSpeechName: 'Google português do Brasil'
    },
    {
      id: 'coqui_it_riccardo',
      name: 'Riccardo (Italian)',
      gender: 'Male',
      nationality: 'Italian',
      language: 'Italian',
      accent: 'Standard Italian',
      style: ['Expressive', 'Passionate', 'Native'],
      ageRange: '28-38',
      description: 'Expressive Italian voice with passionate delivery and native pronunciation.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '150MB',
      tags: ['Expressive', 'Passionate', 'Italian'],
      featured: false,
      webSpeechName: 'Google italiano'
    },
    
    // ===== ASIAN LANGUAGES =====
    {
      id: 'coqui_ja_kokoro',
      name: 'Kokoro (Japanese)',
      gender: 'Female',
      nationality: 'Japanese',
      language: 'Japanese',
      accent: 'Standard Japanese',
      style: ['Anime', 'Cute', 'Expressive'],
      ageRange: '18-25',
      description: 'Expressive Japanese voice with anime-style characteristics. Perfect for Japanese content and character voices.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '180MB',
      tags: ['Anime', 'Japanese', 'Expressive'],
      featured: false,
      webSpeechName: 'Google 日本語'
    },
    {
      id: 'microsoft_zh_xiaoxiao',
      name: 'Xiaoxiao (Chinese)',
      gender: 'Female',
      nationality: 'Chinese',
      language: 'Chinese (Mandarin)',
      accent: 'Beijing Mandarin',
      style: ['Professional', 'Clear', 'Modern'],
      ageRange: '25-35',
      description: 'Modern Chinese voice with clear Beijing Mandarin pronunciation. Professional quality for business use.',
      quality: 5,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Chinese', 'Mandarin', 'Professional'],
      featured: false,
      webSpeechName: 'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)'
    },
    {
      id: 'google_ko_standard_a',
      name: 'Korean Standard-A',
      gender: 'Female',
      nationality: 'Korean',
      language: 'Korean',
      accent: 'Standard Korean',
      style: ['Standard', 'Clear', 'Professional'],
      ageRange: '25-35',
      description: 'Standard Korean voice with clear pronunciation and professional tone.',
      quality: 4,
      source: 'Google',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Korean', 'Standard', 'Clear'],
      featured: false,
      webSpeechName: 'Google 한국어'
    },
    
    // ===== SPECIALIZED AND CHARACTER VOICES =====
    {
      id: 'bark_narrator',
      name: 'The Narrator (Bark)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Theatrical',
      style: ['Narrator', 'Dramatic', 'Storytelling'],
      ageRange: '40-50',
      description: 'Dramatic narrator voice perfect for storytelling, documentaries, and theatrical content.',
      quality: 4,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '3.5GB',
      tags: ['Narrator', 'Dramatic', 'Theater'],
      featured: false
    },
    {
      id: 'bark_oldman',
      name: 'Old Sage (Bark)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Aged',
      style: ['Elderly', 'Wise', 'Character'],
      ageRange: '65-75',
      description: 'Aged, wise character voice perfect for storytelling, grandfather figures, and wisdom-based content.',
      quality: 3,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '3.2GB',
      tags: ['Elderly', 'Character', 'Wise'],
      featured: false
    },
    {
      id: 'bark_pirate',
      name: 'Captain Hook (Character)',
      gender: 'Male',
      nationality: 'British',
      language: 'English (UK)',
      accent: 'Pirate',
      style: ['Character', 'Pirate', 'Entertainment'],
      ageRange: '35-45',
      description: 'Pirate character voice with theatrical British accent. Perfect for entertainment and character work.',
      quality: 3,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '3.1GB',
      tags: ['Character', 'Pirate', 'Theater'],
      featured: false
    },
    
    // ===== ACCESSIBILITY VOICES =====
    {
      id: 'festival_clear',
      name: 'Clear Speech (Festival)',
      gender: 'Non-binary',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Neutral',
      style: ['Accessibility', 'Clear', 'Simple'],
      ageRange: 'N/A',
      description: 'Ultra-clear speech optimized for accessibility applications and screen readers.',
      quality: 3,
      source: 'Festival',
      license: 'Open Source',
      modelSize: '45MB',
      githubUrl: 'https://github.com/festvox/festival',
      tags: ['Accessibility', 'Clear', 'Lightweight'],
      featured: false
    },
    {
      id: 'espeak_robotic',
      name: 'eSpeak Robot',
      gender: 'Non-binary',
      nationality: 'Synthetic',
      language: 'English (Neutral)',
      accent: 'Digital',
      style: ['Robotic', 'Retro', 'Accessibility'],
      ageRange: 'N/A',
      description: 'Classic robotic voice from eSpeak. Perfect for retro applications and accessibility.',
      quality: 2,
      source: 'eSpeak',
      license: 'Open Source',
      modelSize: '15MB',
      tags: ['Robotic', 'Retro', 'Classic'],
      featured: false
    },
    
    // ===== GAMING AND ENTERTAINMENT =====
    {
      id: 'bark_gaming_male',
      name: 'GameMaster (Male)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Gaming',
      style: ['Gaming', 'Energetic', 'Commentary'],
      ageRange: '25-35',
      description: 'Energetic gaming voice perfect for game commentary, streaming, and interactive entertainment.',
      quality: 4,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '2.9GB',
      tags: ['Gaming', 'Streaming', 'Energetic'],
      featured: false
    },
    {
      id: 'bark_gaming_female',
      name: 'GameMaster (Female)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Gaming',
      style: ['Gaming', 'Upbeat', 'Commentary'],
      ageRange: '22-32',
      description: 'Upbeat female gaming voice perfect for streaming, tutorials, and gaming content.',
      quality: 4,
      source: 'Bark',
      license: 'Non-Commercial',
      modelSize: '2.8GB',
      tags: ['Gaming', 'Streaming', 'Upbeat'],
      featured: false
    },
    
    // ===== EDUCATIONAL VOICES =====
    {
      id: 'coqui_teacher_female',
      name: 'Professor Sarah',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Academic',
      style: ['Educational', 'Patient', 'Clear'],
      ageRange: '35-45',
      description: 'Patient, clear voice perfect for educational content, tutorials, and academic presentations.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '185MB',
      tags: ['Educational', 'Academic', 'Patient'],
      featured: false
    },
    {
      id: 'coqui_teacher_male',
      name: 'Professor David',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Academic',
      style: ['Educational', 'Authoritative', 'Scholarly'],
      ageRange: '40-50',
      description: 'Scholarly male voice with authoritative tone, perfect for academic lectures and educational content.',
      quality: 4,
      source: 'Coqui-TTS',
      license: 'Open Source',
      modelSize: '175MB',
      tags: ['Educational', 'Scholarly', 'Academic'],
      featured: false
    },
    
    // ===== BUSINESS AND CORPORATE =====
    {
      id: 'microsoft_corporate_male',
      name: 'Executive (Microsoft)',
      gender: 'Male',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Corporate',
      style: ['Corporate', 'Professional', 'Executive'],
      ageRange: '40-50',
      description: 'Executive-level voice perfect for corporate presentations, board meetings, and business content.',
      quality: 5,
      source: 'Microsoft',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Corporate', 'Executive', 'Business'],
      featured: false,
      webSpeechName: 'Microsoft Brian Online (Natural) - English (United States)'
    },
    {
      id: 'google_corporate_female',
      name: 'CEO Sarah (Google)',
      gender: 'Female',
      nationality: 'American',
      language: 'English (US)',
      accent: 'Corporate',
      style: ['Corporate', 'Leadership', 'Confident'],
      ageRange: '35-45',
      description: 'Confident female executive voice perfect for leadership content and corporate communications.',
      quality: 5,
      source: 'Google',
      license: 'Free Tier',
      modelSize: 'Cloud',
      tags: ['Corporate', 'Leadership', 'Confident'],
      featured: false,
      webSpeechName: 'Google US English'
    }
  ]
  
  // Initialize Web Speech API voices
  const initializeWebSpeechVoices = () => {
    if ('speechSynthesis' in window) {
      // Load voices - may need to wait for them to be available
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        if (voices.length > 0) {
          console.log(`🎤 Found ${voices.length} Web Speech API voices:`, voices.map(v => `${v.name} (${v.lang})`).join(', '))
          // Voices are now available for use in testLibraryVoice
        } else {
          // Voices might not be loaded yet, try again
          setTimeout(loadVoices, 100)
        }
      }
      
      // Load voices immediately and also listen for the event
      loadVoices()
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
      
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  }
  
  // Load available voices and voice library on component mount
  useEffect(() => {
    loadAvailableVoices()
    loadSavedVoiceClones()
    initializeVoiceLibrary()
    loadFavoriteVoices()
    const cleanupWebSpeech = initializeWebSpeechVoices()
    
    // Small delay to let localStorage data load first
    setTimeout(() => {
      reconcileWithBackend()
    }, 100)
    
    return cleanupWebSpeech
  }, [])
  
  // Filter voices when filters change
  useEffect(() => {
    filterVoiceLibrary()
  }, [voiceLibrary, selectedGender, selectedNationality, selectedStyle, selectedSource, searchQuery, showFeaturedOnly])
  
  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])
  
  // Reconcile when switching to manage tab
  useEffect(() => {
    if (activeTab === 'manage') {
      reconcileWithBackend()
    } else if (activeTab === 'explore') {
      checkForRealSamples()
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
  
  // Voice Library Functions
  const initializeVoiceLibrary = () => {
    setVoiceLibrary(voiceLibraryData)
    setFilteredVoices(voiceLibraryData)
  }
  
  const loadFavoriteVoices = () => {
    try {
      const saved = localStorage.getItem('favorite-voices')
      if (saved) {
        setFavoriteVoices(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading favorite voices:', error)
      setFavoriteVoices([])
    }
  }
  
  const checkForRealSamples = async () => {
    try {
      console.log('🔍 Checking for available real voice samples...')
      const response = await fetch('http://localhost:8001/api/v1/voice-library-samples')
      if (response.ok) {
        const data = await response.json()
        setAvailableRealSamples(data.sample_urls || {})
        console.log(`✅ Found ${Object.keys(data.sample_urls || {}).length} real voice samples`)
      } else {
        console.log('⚠️ Backend not available for real samples, using Web Speech API fallback')
      }
    } catch (error) {
      console.log('⚠️ Could not check for real samples:', error)
    }
  }
  
  const saveFavoriteVoices = (favorites: string[]) => {
    try {
      localStorage.setItem('favorite-voices', JSON.stringify(favorites))
      setFavoriteVoices(favorites)
    } catch (error) {
      console.error('Error saving favorite voices:', error)
    }
  }
  
  const toggleFavoriteVoice = (voiceId: string) => {
    const newFavorites = favoriteVoices.includes(voiceId)
      ? favoriteVoices.filter(id => id !== voiceId)
      : [...favoriteVoices, voiceId]
    saveFavoriteVoices(newFavorites)
  }
  
  const toggleVoiceSelection = (voiceId: string) => {
    setSelectedVoices(prev => 
      prev.includes(voiceId)
        ? prev.filter(id => id !== voiceId)
        : [...prev, voiceId]
    )
  }
  
  const clearVoiceSelection = () => {
    setSelectedVoices([])
  }
  
  const useVoiceForClone = (voice: VoiceLibraryEntry) => {
    // Create a new voice clone based on the selected voice library entry
    const newClone: VoiceClone = {
      id: `library_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${voice.name} Clone`,
      description: `Voice clone based on ${voice.name} (${voice.source}): ${voice.description}`,
      samples: [],
      createdAt: new Date(),
      status: 'ready',
      quality: voice.quality * 20, // Convert 1-5 to 0-100
      backendId: undefined,
      backendSynced: false
    }
    
    const updatedClones = [...voiceClones, newClone]
    setVoiceClones(updatedClones)
    setCurrentClone(newClone)
    saveVoiceClones(updatedClones)
    setActiveTab('create')
    
    setSuccess(`🎉 Created new voice clone based on ${voice.name}! Switch to the Create tab to add your voice samples.`)
    setTimeout(() => setSuccess(null), 5000)
  }
  
  const [currentTestingVoice, setCurrentTestingVoice] = useState<string | null>(null)
  const [currentTestingClone, setCurrentTestingClone] = useState<string | null>(null)
  const [voiceTestStates, setVoiceTestStates] = useState<{[key: string]: 'playing' | 'paused' | 'stopped'}>({})
  const [availableRealSamples, setAvailableRealSamples] = useState<{[key: string]: string}>({})
  
  const stopVoiceTest = (voiceId: string) => {
    console.log(`🛑 Stopping voice test for: ${voiceId}`)
    
    // Stop Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      console.log('🗣️ Web Speech API cancelled')
    }
    
    // Stop regular audio if playing
    if (currentPlayingAudio) {
      currentPlayingAudio.pause()
      currentPlayingAudio.currentTime = 0
      setCurrentPlayingAudio(null)
      console.log('🎵 Current playing audio stopped')
    }
    
    setCurrentTestingVoice(null)
    setVoiceTestStates(prev => ({ ...prev, [voiceId]: 'stopped' }))
    setPlayingStates(prev => ({ ...prev, [`voice_test_${voiceId}`]: false }))
  }
  
  const stopVoiceCloneTest = (cloneId: string) => {
    console.log(`🛑 Stopping voice clone test for: ${cloneId}`)
    
    // Stop Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      console.log('🗣️ Web Speech API cancelled for clone test')
    }
    
    // Stop regular audio if playing
    if (currentPlayingAudio) {
      currentPlayingAudio.pause()
      currentPlayingAudio.currentTime = 0
      setCurrentPlayingAudio(null)
      console.log('🎵 Current playing audio stopped for clone test')
    }
    
    setCurrentTestingClone(null)
    setIsProcessing(false)
    setPlayingStates(prev => ({ ...prev, [`clone_test_${cloneId}`]: false }))
  }
  
  const testLibraryVoice = async (voice: VoiceLibraryEntry) => {
    // Stop any currently playing voice test
    if (currentTestingVoice) {
      stopVoiceTest(currentTestingVoice)
    }
    
    // If this voice is already playing, stop it
    if (currentTestingVoice === voice.id) {
      return
    }
    
    setCurrentTestingVoice(voice.id)
    setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'playing' }))
    
    const testText = `Hello! This is ${voice.name}, a ${voice.gender.toLowerCase()} voice from ${voice.nationality} with a ${voice.accent} accent. This voice is perfect for ${voice.style.join(', ')} content.`
    
    setSuccess(`🎧 Testing ${voice.name}... "${testText}"`)
    
    // Try to get a real voice sample first
    try {
      console.log(`🎤 Attempting to get real voice sample for ${voice.name}...`)
      
      const sampleResponse = await fetch('http://localhost:8001/api/v1/voice-library-samples')
      if (sampleResponse.ok) {
        const sampleData = await sampleResponse.json()
        const sampleUrl = sampleData.sample_urls[voice.id]
        
        if (sampleUrl) {
          console.log(`✅ Found real voice sample for ${voice.name}: ${sampleUrl}`)
          
          // CRITICAL: Stop any Web Speech API before playing real audio
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            console.log('🛑 Cancelled Web Speech API before playing real audio')
          }
          
          // Stop any current audio
          if (currentPlayingAudio) {
            currentPlayingAudio.pause()
            currentPlayingAudio.currentTime = 0
            setCurrentPlayingAudio(null)
          }
          
          // Play the real voice sample
          const audio = new Audio(sampleUrl)
          setCurrentPlayingAudio(audio)
          setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: true }))
          
          audio.oncanplaythrough = () => {
            audio.play().catch(e => console.error('Real sample play error:', e))
            setSuccess(`🎵 Playing authentic ${voice.name} sample from ${voice.source}...`)
          }
          
          audio.onended = () => {
            setCurrentPlayingAudio(null)
            setCurrentTestingVoice(null)
            setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
            setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
            setSuccess(`✅ Authentic ${voice.name} sample complete! This is how this voice actually sounds.`)
            setTimeout(() => setSuccess(null), 5000)
          }
          
          audio.onerror = () => {
            console.error('Real sample loading error, falling back to Web Speech API')
            fallbackToWebSpeech()
          }
          
          return // Successfully using real sample, exit here
        }
      }
      
      // Try to generate a real voice sample using backend TTS
      console.log(`🔧 Attempting to generate voice sample for ${voice.name} using backend TTS...`)
      
      // Determine TTS configuration based on voice source and properties
      let ttsConfig = voice.ttsConfig || {}
      
      // If no ttsConfig exists, create one based on voice properties
      if (!voice.ttsConfig) {
        if (voice.source === 'Microsoft' || voice.webSpeechName?.includes('Microsoft')) {
          // Use Microsoft Azure TTS for Microsoft voices
          if (voice.name.includes('Aria')) {
            ttsConfig = { provider: 'microsoft', voice_name: 'en-US-AriaNeural', rate: 1.0, pitch: 1.0 }
          } else if (voice.name.includes('Guy')) {
            ttsConfig = { provider: 'microsoft', voice_name: 'en-US-GuyNeural', rate: 1.0, pitch: 1.0 }
          } else if (voice.name.includes('Jenny')) {
            ttsConfig = { provider: 'microsoft', voice_name: 'en-US-JennyNeural', rate: 1.0, pitch: 1.0 }
          } else if (voice.name.includes('Ryan')) {
            ttsConfig = { provider: 'microsoft', voice_name: 'en-US-RyanNeural', rate: 1.0, pitch: 1.0 }
          } else if (voice.name.includes('Libby')) {
            ttsConfig = { provider: 'microsoft', voice_name: 'en-GB-LibbyNeural', rate: 1.0, pitch: 1.0 }
          }
        } else if (voice.source === 'Google') {
          // Use Google TTS for Google voices
          if (voice.language.includes('US')) {
            ttsConfig = { 
              provider: 'google', 
              voice_name: voice.gender === 'Female' ? 'en-US-Standard-A' : 'en-US-Standard-B',
              rate: 1.0, 
              pitch: 1.0 
            }
          } else if (voice.language.includes('UK')) {
            ttsConfig = { 
              provider: 'google', 
              voice_name: voice.gender === 'Female' ? 'en-GB-Standard-A' : 'en-GB-Standard-B',
              rate: 1.0, 
              pitch: 1.0 
            }
          }
        } else if (voice.source === 'OpenVoice' || voice.source === 'Coqui-TTS') {
          // Use available open-source TTS
          ttsConfig = { 
            provider: 'coqui', 
            voice_name: voice.id,
            rate: 1.0, 
            pitch: 1.0 
          }
        }
      }
      
      // Try backend TTS generation
      try {
        const formData = new FormData()
        formData.append('voice_id', voice.id)
        formData.append('voice_name', voice.name)
        formData.append('source', voice.source)
        formData.append('text', testText)
        formData.append('voice_config', JSON.stringify(ttsConfig))
        
        const generateResponse = await fetch('http://localhost:8001/api/v1/generate-voice-sample', {
          method: 'POST',
          body: formData
        })
        
        if (generateResponse.ok) {
          const generateData = await generateResponse.json()
          if (generateData.sample_url) {
            console.log(`✅ Generated real voice sample for ${voice.name}: ${generateData.sample_url}`)
            
            // Play the newly generated sample
            const audio = new Audio(generateData.sample_url)
            setCurrentPlayingAudio(audio)
            setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: true }))
            
            audio.oncanplaythrough = () => {
              audio.play().catch(e => console.error('Generated sample play error:', e))
              setSuccess(`🎵 Playing authentic ${voice.name} sample from ${voice.source} TTS engine...`)
            }
            
            audio.onended = () => {
              setCurrentPlayingAudio(null)
              setCurrentTestingVoice(null)
              setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
              setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
              setSuccess(`✅ Authentic ${voice.name} sample complete! This voice has been cached for future use.`)
              setTimeout(() => setSuccess(null), 5000)
            }
            
            audio.onerror = () => {
              console.error('Generated sample loading error, trying direct TTS')
              tryDirectTTS()
            }
            
            return // Successfully using generated sample, exit here
          }
        }
      } catch (error) {
        console.error('Backend TTS generation error:', error)
      }
      
      // Try direct TTS API call
      const tryDirectTTS = async () => {
        console.log(`🔄 Trying direct TTS API for ${voice.name}...`)
        
        try {
          // Try Microsoft Azure TTS endpoint
          if (voice.source === 'Microsoft' || ttsConfig.provider === 'microsoft') {
            const ttsResponse = await fetch('http://localhost:8001/api/v1/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: testText,
                voice: ttsConfig.voice_name || 'en-US-AriaNeural',
                rate: ttsConfig.rate || 1.0,
                pitch: ttsConfig.pitch || 1.0
              })
            })
            
            if (ttsResponse.ok) {
              // CRITICAL: Stop any Web Speech API before playing TTS audio
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel()
                console.log('🛑 Cancelled Web Speech API before playing TTS audio')
              }
              
              // Stop any current audio
              if (currentPlayingAudio) {
                currentPlayingAudio.pause()
                currentPlayingAudio.currentTime = 0
                setCurrentPlayingAudio(null)
              }
              
              const audioBlob = await ttsResponse.blob()
              const audioUrl = URL.createObjectURL(audioBlob)
              
              const audio = new Audio(audioUrl)
              setCurrentPlayingAudio(audio)
              setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: true }))
              
              audio.oncanplaythrough = () => {
                audio.play().catch(e => console.error('Direct TTS play error:', e))
                setSuccess(`🎵 Playing ${voice.name} using modern ${voice.source} TTS engine...`)
              }
              
              audio.onended = () => {
                setCurrentPlayingAudio(null)
                setCurrentTestingVoice(null)
                setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
                setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
                URL.revokeObjectURL(audioUrl)
                setSuccess(`✅ Modern TTS sample complete for ${voice.name}!`)
                setTimeout(() => setSuccess(null), 5000)
              }
              
              return // Successfully using direct TTS
            }
          }
        } catch (error) {
          console.error('Direct TTS error:', error)
        }
        
        // Last resort - improved Web Speech API fallback
        console.warn(`⚠️ No modern TTS available for ${voice.name}, using improved Web Speech fallback`)
        setError(`⚠️ ${voice.name}: Authentic voice sample not available. Using legacy system approximation.
        
🔧 To experience the true voice quality:
• Ensure backend server is running on port 8001
• Check that ${voice.source} TTS service is configured
• This approximation may sound different from the actual ${voice.source} voice`)
        setTimeout(() => setError(null), 12000)
        await fallbackToWebSpeech()
      }
      
      // Call tryDirectTTS after it's defined
      await tryDirectTTS()
    } catch (error) {
      console.error('Error trying to get/generate real voice sample:', error)
      // Only call fallback if no audio is currently playing
      if (!currentPlayingAudio || currentPlayingAudio.paused) {
        await fallbackToWebSpeech()
      }
    }
    
    // Fallback to Web Speech API if real sample unavailable
    async function fallbackToWebSpeech() {
      // Don't start Web Speech if real audio is already playing
      if (currentPlayingAudio && !currentPlayingAudio.paused) {
        console.log(`🚨 Skipping Web Speech fallback - real audio is already playing`)
        return
      }
      
      console.log(`🔄 Using Web Speech API fallback for ${voice.name}...`)
      setSuccess(`🔄 Playing system approximation of ${voice.name} (authentic ${voice.source} sample requires backend connection)...`)
      
      try {
        // Check if Web Speech API is available
        if ('speechSynthesis' in window) {
        // Stop any existing speech
        window.speechSynthesis.cancel()
        
        // Wait a bit for voices to load if needed
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get all available voices
        let voices = window.speechSynthesis.getVoices()
        
        // If no voices loaded, wait for the voiceschanged event
        if (voices.length === 0) {
          await new Promise(resolve => {
            const handleVoicesChanged = () => {
              voices = window.speechSynthesis.getVoices()
              if (voices.length > 0) {
                window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
                resolve(undefined)
              }
            }
            window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
            // Fallback timeout
            setTimeout(() => {
              window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
              resolve(undefined)
            }, 1000)
          })
        }
        
        console.log(`🔍 Available voices (${voices.length}):`, voices.map(v => `${v.name} (${v.lang}) [${v.localService ? 'local' : 'remote'}]`))
        
        // Create speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(testText)
        
        // Advanced voice matching algorithm
        let targetVoice = null
        
        if (voice.webSpeechName) {
          console.log(`🎯 Looking for voice: ${voice.webSpeechName} for ${voice.name}`)
          
          // Try exact name match first
          targetVoice = voices.find(v => v.name === voice.webSpeechName)
          
          if (!targetVoice) {
            // Try partial name match
            targetVoice = voices.find(v => 
              v.name.toLowerCase().includes(voice.webSpeechName!.toLowerCase()) ||
              voice.webSpeechName!.toLowerCase().includes(v.name.toLowerCase())
            )
          }
          
          if (!targetVoice) {
            // Try matching by key terms
            const searchTerms = voice.webSpeechName.toLowerCase().split(' ')
            targetVoice = voices.find(v => 
              searchTerms.some(term => v.name.toLowerCase().includes(term))
            )
          }
        }
        
        // Fallback to language and gender matching if no specific voice found
        if (!targetVoice) {
          console.log(`🔄 No exact match found, trying language/gender matching for ${voice.name}`)
          
          // Map our language format to standard language codes
          const langMap: {[key: string]: string} = {
            'English (US)': 'en-US',
            'English (UK)': 'en-GB', 
            'English (AU)': 'en-AU',
            'English (IE)': 'en-IE',
            'French': 'fr-FR',
            'German': 'de-DE',
            'Spanish': 'es-ES',
            'Portuguese (BR)': 'pt-BR',
            'Italian': 'it-IT',
            'Japanese': 'ja-JP',
            'Chinese (Mandarin)': 'zh-CN',
            'Korean': 'ko-KR'
          }
          
          const targetLang = langMap[voice.language] || 'en-US'
          
          // Find voices matching language
          const languageVoices = voices.filter(v => v.lang.startsWith(targetLang.split('-')[0]))
          console.log(`🌐 Found ${languageVoices.length} voices for language ${targetLang}:`, languageVoices.map(v => v.name))
          
          if (languageVoices.length > 0) {
            // Prefer local voices over remote
            const localVoices = languageVoices.filter(v => v.localService)
            const voicesToSearch = localVoices.length > 0 ? localVoices : languageVoices
            
            // Try to match gender-specific voice names
            if (voice.gender === 'Female') {
              targetVoice = voicesToSearch.find(v => 
                /female|woman|girl|she|aria|zira|hazel|susan|samantha|victoria|serena|kylie|catherine|marie|isabella|emma|jenny|libby/i.test(v.name)
              )
            } else if (voice.gender === 'Male') {
              targetVoice = voicesToSearch.find(v => 
                /male|man|boy|he|david|mark|ryan|guy|alex|brian|george|kevin|richard|carlos|riccardo|thorsten/i.test(v.name)
              )
            }
            
            // If no gender-specific match, take the first available voice
            if (!targetVoice) {
              targetVoice = voicesToSearch[0]
            }
          }
        }
        
        // If still no voice found, use system default but log warning
        if (targetVoice) {
          utterance.voice = targetVoice
          console.log(`✅ Selected voice: ${targetVoice.name} (${targetVoice.lang}) [${targetVoice.localService ? 'local' : 'remote'}] for ${voice.name}`)
          setSuccess(`🎵 Testing ${voice.name} using ${targetVoice.name}...`)
        } else {
          console.warn(`⚠️ No suitable voice found for ${voice.name} (${voice.webSpeechName}), using system default`)
          setSuccess(`🎵 Testing ${voice.name} with system default voice (no specific voice available)...`)
        }
        
        // Set voice parameters based on the voice characteristics
        utterance.rate = voice.style.includes('Fast') ? 1.2 : 
                        voice.style.includes('Slow') || voice.style.includes('Wise') ? 0.8 : 1.0
        utterance.pitch = voice.gender === 'Female' ? 1.2 : 
                         voice.gender === 'Male' ? 0.8 : 1.0
        utterance.volume = 0.9
        
        // Set language if we have a target voice
        if (targetVoice) {
          utterance.lang = targetVoice.lang
        }
        
        // Handle events
        utterance.onstart = () => {
          setSuccess(`🎵 Playing ${voice.name}${targetVoice ? ` (${targetVoice.name})` : ' (system default)'}...`)
          setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: true }))
        }
        
        utterance.onend = () => {
          const voiceUsed = targetVoice ? `${targetVoice.name} (${targetVoice.lang})` : 'system default'
          setSuccess(`✅ System approximation complete for ${voice.name}!
          
⚠️ Note: This was a legacy system voice, not the authentic ${voice.source} voice. For true ${voice.name} quality, ensure your backend server is running with ${voice.source} TTS configured.`)
          setCurrentTestingVoice(null)
          setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
          setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
          setTimeout(() => setSuccess(null), 8000)
        }
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event)
          
          // Handle common speech synthesis errors
          if (event.error === 'interrupted') {
            console.log('🔄 Speech interrupted, trying simpler approach...')
            
            // Try with a very simple, short text
            const fallbackText = `Testing ${voice.name.split(' ')[0]}.`
            const fallbackUtterance = new SpeechSynthesisUtterance(fallbackText)
            
            if (targetVoice) {
              fallbackUtterance.voice = targetVoice
            }
            fallbackUtterance.rate = 1.0
            fallbackUtterance.pitch = 1.0
            fallbackUtterance.volume = 0.8
            
            fallbackUtterance.onend = () => {
              setSuccess(`✅ Voice test completed for ${voice.name}!`)
              setCurrentTestingVoice(null)
              setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
              setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
              setTimeout(() => setSuccess(null), 3000)
            }
            
            fallbackUtterance.onerror = () => {
              setError(`⚠️ Could not test ${voice.name} - speech synthesis unavailable`)
              setCurrentTestingVoice(null)
              setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
              setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
              setTimeout(() => setError(null), 3000)
            }
            
            // Cancel any ongoing speech and try fallback
            window.speechSynthesis.cancel()
            setTimeout(() => {
              window.speechSynthesis.speak(fallbackUtterance)
            }, 200)
            
          } else {
            setError(`❌ Voice test failed for ${voice.name}. ${event.error || 'Speech synthesis error'}`)
            setCurrentTestingVoice(null)
            setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
            setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
            setTimeout(() => setError(null), 4000)
          }
        }
        
        // Cancel any ongoing speech first, then start new one
        window.speechSynthesis.cancel()
        
        // Small delay to ensure cancellation completes
        setTimeout(() => {
          window.speechSynthesis.speak(utterance)
        }, 100)
        
      } else {
        // Fallback for browsers without Web Speech API
        setError(`❌ Web Speech API not supported in this browser. Cannot test ${voice.name} voice.`)
        setTimeout(() => setError(null), 4000)
      }
      
      } catch (error: any) {
        console.error('Voice test error:', error)
        setError(`❌ Failed to test ${voice.name}. Please try again.`)
        setCurrentTestingVoice(null)
        setVoiceTestStates(prev => ({ ...prev, [voice.id]: 'stopped' }))
        setPlayingStates(prev => ({ ...prev, [`voice_test_${voice.id}`]: false }))
        setTimeout(() => setError(null), 4000)
      }
    }
  }
  
  const filterVoiceLibrary = () => {
    let filtered = [...voiceLibrary]
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(voice => 
        voice.name.toLowerCase().includes(query) ||
        voice.nationality.toLowerCase().includes(query) ||
        voice.accent.toLowerCase().includes(query) ||
        voice.description.toLowerCase().includes(query) ||
        voice.style.some(s => s.toLowerCase().includes(query)) ||
        voice.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    // Filter by gender
    if (selectedGender !== 'All') {
      filtered = filtered.filter(voice => voice.gender === selectedGender)
    }
    
    // Filter by nationality
    if (selectedNationality !== 'All') {
      filtered = filtered.filter(voice => voice.nationality === selectedNationality)
    }
    
    // Filter by style
    if (selectedStyle !== 'All') {
      filtered = filtered.filter(voice => voice.style.includes(selectedStyle))
    }
    
    // Filter by source
    if (selectedSource !== 'All') {
      filtered = filtered.filter(voice => voice.source === selectedSource)
    }
    
    // Filter by featured only
    if (showFeaturedOnly) {
      filtered = filtered.filter(voice => voice.featured)
    }
    
    setFilteredVoices(filtered)
  }
  
  // Get unique values for filters
  const getUniqueGenders = () => Array.from(new Set(voiceLibrary.map(v => v.gender)))
  const getUniqueNationalities = () => Array.from(new Set(voiceLibrary.map(v => v.nationality)))
  const getUniqueStyles = () => Array.from(new Set(voiceLibrary.flatMap(v => v.style)))
  const getUniqueSources = () => Array.from(new Set(voiceLibrary.map(v => v.source)))
  
  // Manually upload/sync local clones to backend if they are missing
  const manualSyncClonesToBackend = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      console.log('🔄 Manual sync: checking backend clones...')
      const resp = await fetch('http://localhost:8001/api/v1/voice-clones')
      const data = resp.ok ? await resp.json() : { voice_clones: [] }
      const backendClones: any[] = Array.isArray(data.voice_clones) ? data.voice_clones : []

      for (const clone of voiceClones) {
        const exists = backendClones.some(bc => bc.name === clone.name || bc.voice_id === clone.backendId)
        if (!exists) {
          console.log(`⬆️ Uploading clone to backend: ${clone.name}`)
          // Upload the first available sample if any
          const sample = clone.samples.find(s => s.audioBlob instanceof Blob)
          if (!sample) {
            console.warn(`⚠️ No audio blob available for ${clone.name}; cannot upload. Please re-record or import a sample.`)
            continue
          }
          const formData = new FormData()
          formData.append('name', clone.name)
          formData.append('transcript', sample.transcript || `Sample for ${clone.name}`)
          formData.append('audio', sample.audioBlob as Blob, `${clone.name}_sample.webm`)

          const createResp = await fetch('http://localhost:8001/api/v1/voice-clone', { method: 'POST', body: formData })
          if (createResp.ok) {
            const result = await createResp.json()
            console.log(`✅ Uploaded ${clone.name} with backend ID ${result.voice_id}`)
            // Update local state immediately
            setVoiceClones(prev => {
              const updatedClones = prev.map(c => 
                c.id === clone.id ? { ...c, backendId: result.voice_id, id: result.voice_id, backendSynced: true } : c
              )
              saveVoiceClones(updatedClones)
              return updatedClones
            })
          } else {
            const errText = await createResp.text().catch(() => 'Unknown error')
            console.error(`❌ Failed to upload ${clone.name}: ${errText}`)
          }
        }
      }
      setSuccess('✅ Manual backend sync complete')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      console.error('Manual sync error:', e)
      setError('Failed to sync clones with backend')
    } finally {
      setIsProcessing(false)
    }
  }

  // Force re-upload all clones (debug helper)
  const forceReUploadAllClones = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      console.log('📦 Force re-upload: Resetting all clone sync status...')
      
      // First, mark all clones as not synced
      setVoiceClones(prev => {
        const resetClones = prev.map(clone => ({ ...clone, backendSynced: false, backendId: undefined }))
        saveVoiceClones(resetClones)
        console.log('🔄 Reset sync status for clones:', resetClones.map(c => `${c.name}: ${c.samples.length} samples`))
        return resetClones
      })
      
      // Small delay to let state update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Now run manual sync
      await manualSyncClonesToBackend()
      
      setSuccess('✅ Forced re-upload completed')
    } catch (e) {
      console.error('Force re-upload error:', e)
      setError('Failed to force re-upload clones')
    }
  }

  // Debug clone status
  const debugCloneStatus = () => {
    console.log('🔍 Debug: Current voice clones status:')
    voiceClones.forEach(clone => {
      const samplesWithAudio = clone.samples.filter(s => s.audioBlob && s.audioBlob instanceof Blob).length
      const samplesWithUrls = clone.samples.filter(s => s.audioUrl).length
      console.log(`\n📋 Clone: ${clone.name}`)
      console.log(`   ID: ${clone.id}`)
      console.log(`   Backend ID: ${clone.backendId || 'none'}`)
      console.log(`   Backend Synced: ${clone.backendSynced}`)
      console.log(`   Total Samples: ${clone.samples.length}`)
      console.log(`   Samples with Audio Blob: ${samplesWithAudio}`)
      console.log(`   Samples with Audio URL: ${samplesWithUrls}`)
      console.log(`   Created: ${clone.createdAt}`)
      
      if (clone.samples.length > 0) {
        console.log(`   Sample details:`)
        clone.samples.forEach((sample, i) => {
          console.log(`     ${i+1}. ${sample.name} - Duration: ${sample.duration}s, Has Blob: ${!!(sample.audioBlob && sample.audioBlob instanceof Blob)}, Has URL: ${!!sample.audioUrl}`)
        })
      }
    })
    
    console.log('\n🔄 Sync Status Summary:')
    console.log(`   Total clones: ${voiceClones.length}`)
    console.log(`   Backend synced: ${voiceClones.filter(c => c.backendSynced).length}`)
    console.log(`   Not synced: ${voiceClones.filter(c => !c.backendSynced).length}`)
    console.log(`   With audio samples: ${voiceClones.filter(c => c.samples.some(s => s.audioBlob instanceof Blob)).length}`)
  }

  // TEST FUNCTION - Verify save/load works
  const testSaveLoadProcess = () => {
    console.log('🧪 TEST: Starting save/load verification...')
    
    // Create a test clone with a dummy sample
    const testClone: VoiceClone = {
      id: 'test_clone_123',
      name: 'Test Clone',
      description: 'Test description',
      samples: [
        {
          id: 'test_sample_456',
          name: 'Test Sample',
          duration: 5.5,
          audioBlob: new Blob(['fake audio data'], { type: 'audio/webm' }),
          audioUrl: 'blob:test-url',
          transcript: 'This is a test transcript',
          quality: 0.85,
          uploadedAt: new Date()
        }
      ],
      createdAt: new Date(),
      status: 'ready',
      quality: 0.85,
      backendSynced: false
    }
    
    console.log('🧪 TEST: Created test clone:', testClone)
    
    // Test save
    const testClones = [testClone]
    console.log('🧪 TEST: Saving test clone...')
    saveVoiceClones(testClones)
    
    // Wait a moment then test load
    setTimeout(() => {
      console.log('🧪 TEST: Loading from localStorage...')
      const saved = localStorage.getItem('voice-clones')
      if (saved) {
        const parsed = JSON.parse(saved)
        console.log('🧪 TEST: Loaded data:', parsed)
        const testResult = parsed.find((c: any) => c.id === 'test_clone_123')
        if (testResult && testResult.samples && testResult.samples.length > 0) {
          console.log('✅ TEST PASSED: Sample data preserved!')
          console.log('  - Sample name:', testResult.samples[0].name)
          console.log('  - Sample duration:', testResult.samples[0].duration)
          console.log('  - Sample transcript:', testResult.samples[0].transcript)
          console.log('  - Sample quality:', testResult.samples[0].quality)
        } else {
          console.log('❌ TEST FAILED: Sample data lost!')
        }
      } else {
        console.log('❌ TEST FAILED: No data saved!')
      }
      
      // Clean up test data
      const currentClones = voiceClones
      saveVoiceClones(currentClones)
      console.log('🧪 TEST: Cleaned up test data')
    }, 100)
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
                
                // Process cached test audio info from backend
                let cachedTestAudio = undefined
                if (matchingBackendClone.cached_test_audio) {
                  cachedTestAudio = {
                    text: matchingBackendClone.cached_test_audio.text,
                    audioSize: matchingBackendClone.cached_test_audio.audio_size,
                    testedAt: matchingBackendClone.cached_test_audio.tested_at,
                    cacheKey: matchingBackendClone.cached_test_audio.cache_key,
                    audioUrl: undefined // Will be loaded on-demand
                  }
                  console.log(`📋 Found cached test audio for "${frontendClone.name}": "${cachedTestAudio.text.substring(0, 50)}..."`)
                }
                
                return {
                  ...frontendClone,
                  id: matchingBackendClone.voice_id, // Update to use backend ID
                  backendId: matchingBackendClone.voice_id,
                  backendSynced: true,
                  status: 'ready' as const,
                  cachedTestAudio
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
      console.log('📰 Loading voice clones from localStorage...')
      if (saved) {
        console.log('📋 Raw localStorage data length:', saved.length)
        const rawParsed = JSON.parse(saved)
        console.log(`📋 Found ${rawParsed.length} clones in storage:`, rawParsed.map(c => `${c.name} (${c.samples?.length || 0} samples)`))
        
        const parsed = rawParsed.map((clone: any) => ({
          ...clone,
          createdAt: new Date(clone.createdAt),
          // Ensure backend sync properties exist (for existing clones)
          backendId: clone.backendId || undefined,
          backendSynced: clone.backendSynced || false,
          customTestText: clone.customTestText || undefined,  // Load saved custom test text
          samples: clone.samples?.map((sample: any) => {
            console.log(`🔍 Loading sample for ${clone.name}:`, {
              name: sample.name,
              hasBlob: !!(sample.audioBlob && sample.audioBlob instanceof Blob),
              duration: sample.duration,
              quality: sample.quality,
              transcript: sample.transcript?.substring(0, 50) + '...'
            })
            return {
              ...sample,
              uploadedAt: new Date(sample.uploadedAt),
              // Handle missing audio gracefully - don't try to create URL from null blob
              audioUrl: sample.audioBlob && sample.audioBlob instanceof Blob ? URL.createObjectURL(sample.audioBlob) : null,
              audioBlob: sample.audioBlob && sample.audioBlob instanceof Blob ? sample.audioBlob : null,
              // Ensure essential metadata is preserved
              duration: sample.duration || 0,
              quality: sample.quality || 0.7,
              name: sample.name || 'Untitled Sample',
              transcript: sample.transcript || '',
              // Add flag to indicate if audio is missing
              audioMissing: !sample.audioBlob || !(sample.audioBlob instanceof Blob),
              // Generate a unique ID if missing
              id: sample.id || Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }
          }) || [] // Keep all samples, not just those with audioUrl
        }))
        setVoiceClones(parsed)
        console.log(`📊 Loaded ${parsed.length} voice clones with sample details:`)
        parsed.forEach(clone => {
          console.log(`  - ${clone.name}: ${clone.samples.length} samples, total duration: ${clone.samples.reduce((total, sample) => total + (sample.duration || 0), 0).toFixed(1)}s`)
        })
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
      console.log(`💾 Saving ${clones.length} voice clones...`)
      clones.forEach(clone => {
        console.log(`  - ${clone.name}: ${clone.samples.length} samples`)
        if (clone.samples.length > 0) {
          clone.samples.forEach((sample, i) => {
            console.log(`    ${i+1}. ${sample.name} (${sample.duration}s, transcript: ${sample.transcript?.substring(0, 30)}...)`)
          })
        }
      })
      
      // Convert for storage (can't store Blob directly)
      const toSave = clones.map(clone => ({
        ...clone,
        samples: clone.samples.map(sample => ({
          ...sample,
          // Preserve essential metadata for statistics
          id: sample.id,
          name: sample.name,
          duration: sample.duration,
          quality: sample.quality,
          transcript: sample.transcript,
          uploadedAt: sample.uploadedAt,
          // Note: We lose audio data on refresh - in production, would upload to server
          audioBlob: null,
          audioUrl: null
        }))
      }))
      localStorage.setItem('voice-clones', JSON.stringify(toSave))
      console.log(`💾 Saved to localStorage with total samples:`, 
        toSave.reduce((total, clone) => total + clone.samples.length, 0))
    } catch (error) {
      console.error('Error saving voice clones:', error)
    }
  }
  
  // Real-time waveform visualization
  const drawRecordingWaveform = () => {
    const canvas = recordingCanvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    const draw = () => {
      if (!isRecording) return
      
      analyser.getByteTimeDomainData(dataArray)
      
      // Calculate audio level
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        const sample = (dataArray[i] - 128) / 128
        sum += sample * sample
      }
      const rms = Math.sqrt(sum / bufferLength)
      setAudioLevel(rms)
      
      // Draw waveform
      ctx.fillStyle = 'rgb(15, 15, 23)' // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgb(147, 51, 234)' // Purple waveform
      ctx.beginPath()
      
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
        
        x += sliceWidth
      }
      
      ctx.stroke()
      
      // Draw level indicator
      const levelHeight = rms * canvas.height
      ctx.fillStyle = `hsl(${Math.max(0, 120 - rms * 120)}, 70%, 50%)`
      ctx.fillRect(canvas.width - 20, canvas.height - levelHeight, 15, levelHeight)
      
      animationFrameRef.current = requestAnimationFrame(draw)
    }
    
    draw()
  }
  
  // Advanced recording function with quality settings
  const getRecordingConstraints = () => {
    const baseConstraints = {
      channelCount: 1,
      echoCancellation: echoCancellation,
      noiseSuppression: noiseReduction,
      autoGainControl: autoGain
    }
    
    switch (recordingQuality) {
      case 'studio':
        return { ...baseConstraints, sampleRate: 48000, bitDepth: 24 }
      case 'high':
        return { ...baseConstraints, sampleRate: 44100, bitDepth: 16 }
      case 'medium':
        return { ...baseConstraints, sampleRate: 22050, bitDepth: 16 }
      case 'low':
        return { ...baseConstraints, sampleRate: 16000, bitDepth: 16 }
      default:
        return baseConstraints
    }
  }
  
  // Recording functions
  const startRecording = async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)
      setRecordingWaveform([])
      setAudioLevel(0)
      
      const constraints = getRecordingConstraints()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
      
      // Set up audio analysis
      const context = audioContext || new AudioContext()
      if (!audioContext) setAudioContext(context)
      
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser
      
      // Start real-time waveform visualization
      drawRecordingWaveform()
      
      // Set up MediaRecorder with quality-based settings
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus'
      ]
      
      let mimeType = 'audio/webm'
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }
      
      const bitrates = {
        studio: 320000,
        high: 256000,
        medium: 128000,
        low: 64000
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType,
        bitsPerSecond: bitrates[recordingQuality]
      })
      
      const audioChunks: BlobPart[] = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // Stop real-time analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        
        // Generate final waveform for the recorded audio
        try {
          const arrayBuffer = await blob.arrayBuffer()
          const audioBuffer = await context.decodeAudioData(arrayBuffer)
          const waveform = await generateWaveform(audioBuffer)
          setRecordingWaveform(waveform)
        } catch (error) {
          console.error('Error generating final waveform:', error)
        }
        
        stream.getTracks().forEach(track => track.stop())
        source.disconnect()
        analyserRef.current = null
      }
      
      mediaRecorderRef.current.start(100) // Collect data every 100ms for smoother analysis
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
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    
    setIsRecording(false)
  }
  
  // Inline editing functions
  const startEditingCloneName = (clone: VoiceClone) => {
    setEditingCloneName(clone.id)
    setTempCloneName(clone.name)
  }
  
  const startEditingCloneDescription = (clone: VoiceClone) => {
    setEditingCloneDescription(clone.id)
    setTempCloneDescription(clone.description || '')
  }
  
  const saveCloneName = () => {
    if (!editingCloneName || !currentClone || !tempCloneName.trim()) return
    
    const updatedClone = {
      ...currentClone,
      name: tempCloneName.trim()
    }
    
    const updatedClones = voiceClones.map(clone => 
      clone.id === editingCloneName ? updatedClone : clone
    )
    
    setVoiceClones(updatedClones)
    setCurrentClone(updatedClone)
    saveVoiceClones(updatedClones)
    setEditingCloneName(null)
    setTempCloneName('')
    setSuccess('Voice clone name updated successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }
  
  const saveCloneDescription = () => {
    if (!editingCloneDescription || !currentClone) return
    
    const updatedClone = {
      ...currentClone,
      description: tempCloneDescription.trim() || undefined
    }
    
    const updatedClones = voiceClones.map(clone => 
      clone.id === editingCloneDescription ? updatedClone : clone
    )
    
    setVoiceClones(updatedClones)
    setCurrentClone(updatedClone)
    saveVoiceClones(updatedClones)
    setEditingCloneDescription(null)
    setTempCloneDescription('')
    setSuccess('Voice clone description updated successfully!')
    setTimeout(() => setSuccess(null), 3000)
  }
  
  const cancelEdit = () => {
    setEditingCloneName(null)
    setEditingCloneDescription(null)
    setTempCloneName('')
    setTempCloneDescription('')
  }
  
  // Audio playback functions
  const stopAllAudio = () => {
    if (currentPlayingAudio) {
      currentPlayingAudio.pause()
      currentPlayingAudio.currentTime = 0
      setCurrentPlayingAudio(null)
    }
    setPlayingStates({})
    setPlaybackProgress(0)
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current)
    }
  }
  
  const startProgressTracking = (audio: HTMLAudioElement, duration: number) => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current)
    }
    
    progressUpdateRef.current = setInterval(() => {
      if (audio && !audio.paused && duration > 0) {
        const progress = (audio.currentTime / duration) * 100
        setPlaybackProgress(progress)
      }
    }, 50) // Update every 50ms for smooth progress
  }
  
  const stopProgressTracking = () => {
    if (progressUpdateRef.current) {
      clearInterval(progressUpdateRef.current)
    }
    setPlaybackProgress(0)
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
    
    console.log('✅ Adding new sample to frontend:', newSample.name, 'Duration:', newSample.duration)
    
    // Use the most current version of voiceClones to avoid overwriting backend sync
    setVoiceClones(prevClones => {
      const mostCurrentClone = prevClones.find(c => 
        c.id === currentClone.id || 
        c.backendId === currentClone.id || 
        c.name === currentClone.name
      ) || currentClone
      
      const updatedClone = {
        ...mostCurrentClone,  // Use the most current version (with backend sync)
        samples: [...mostCurrentClone.samples, newSample]
      }
      
      console.log('✅ Updated clone samples count:', updatedClone.samples.length)
      
      const updatedClones = prevClones.map(clone => {
        if (clone.id === currentClone.id || 
            clone.backendId === currentClone.id || 
            clone.name === currentClone.name) {
          return updatedClone
        }
        return clone
      })
      
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
  
  // Load cached test audio for a voice clone
  const loadCachedTestAudio = async (clone: VoiceClone): Promise<string | null> => {
    if (!clone.cachedTestAudio || !clone.backendId) {
      return null
    }
    
    try {
      console.log(`📋 Loading cached test audio for '${clone.name}'...`)
      const response = await fetch(`http://localhost:8001/api/v1/voice-clone/${clone.backendId}/cached-audio`)
      
      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        
        // Update the clone with the loaded audio URL
        setVoiceClones(prevClones => 
          prevClones.map(c => 
            c.id === clone.id 
              ? { ...c, cachedTestAudio: { ...c.cachedTestAudio!, audioUrl } }
              : c
          )
        )
        
        console.log(`✅ Cached audio loaded: ${Math.round(audioBlob.size / 1024)}KB`)
        return audioUrl
      } else if (response.status === 404) {
        console.log(`📋 No cached audio found for '${clone.name}'`)
        // Clear the cached info since it's stale
        setVoiceClones(prevClones => 
          prevClones.map(c => 
            c.id === clone.id 
              ? { ...c, cachedTestAudio: undefined }
              : c
          )
        )
        return null
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to load cached test audio:', error)
      return null
    }
  }
  
  // Play cached test audio
  const playCachedTestAudio = async (clone: VoiceClone) => {
    if (!clone.cachedTestAudio) {
      console.log('No cached test audio available')
      return
    }
    
    const playingKey = `cached_test_${clone.id}`
    
    // If already playing this audio, pause it
    if (currentPlayingAudio && playingStates[playingKey]) {
      currentPlayingAudio.pause()
      setCurrentPlayingAudio(null)
      setPlayingStates({})
      return
    }
    
    let audioUrl = clone.cachedTestAudio.audioUrl
    
    // Load audio URL if not already loaded
    if (!audioUrl) {
      audioUrl = await loadCachedTestAudio(clone)
      if (!audioUrl) {
        setError('Failed to load cached test audio')
        return
      }
    }
    
    // Stop any currently playing audio
    stopAllAudio()
    
    // Play the cached audio
    const audio = new Audio(audioUrl)
    setCurrentPlayingAudio(audio)
    setPlayingStates({ [playingKey]: true })
    
    audio.oncanplaythrough = () => {
      audio.play().catch(e => console.error('Audio play error:', e))
    }
    
    audio.onended = () => {
      setCurrentPlayingAudio(null)
      setPlayingStates({})
    }
    
    audio.onerror = () => {
      console.error('Audio loading error for cached test audio')
      setCurrentPlayingAudio(null)
      setPlayingStates({})
      setError('Failed to play cached test audio')
    }
    
    const testDate = new Date(clone.cachedTestAudio.testedAt * 1000).toLocaleDateString()
    setSuccess(`📋 Playing cached test audio from ${testDate}: "${clone.cachedTestAudio.text.substring(0, 50)}..."`)
    
    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      setSuccess(null)
    }, 5000)
  }
  
  // Test voice clone with VibeVoice
  const testVoiceClone = async (cloneParam: VoiceClone, customText?: string) => {
    console.log(`🎯 testVoiceClone FUNCTION CALLED:`, {
      cloneName: cloneParam.name,
      cloneId: cloneParam.id,
      samplesCount: cloneParam.samples.length,
      backendSynced: cloneParam.backendSynced,
      customText: customText ? `"${customText}"` : 'none',
      currentIsProcessing: isProcessing
    })
    
    // Always use the most current version from state to ensure we have latest backend sync
    let clone = voiceClones.find(c => c.id === cloneParam.id || c.backendId === cloneParam.id || c.backendId === cloneParam.backendId) || cloneParam
    
    if (clone.samples.length === 0) {
      setError('Please add at least one voice sample to test this clone')
      return
    }
    
    try {
      setIsProcessing(true)
      setCurrentTestingClone(clone.id)
      setError(null)
      
      console.log('🎭 Testing voice clone:', clone.name)
      console.log('📋 Voice samples:', clone.samples.length)
      setPlayingStates(prev => ({ ...prev, [`clone_test_${clone.id}`]: true }))
      
      // Use custom text if provided, otherwise default
      const testText = customText || customTestText || `Hello! This is ${clone.name}, testing my cloned voice. I have ${clone.samples.length} voice samples for training.`
      console.log('📝 Test text:', testText)
      
      // Debug: Log current clone state
      console.log('🔍 Current clone state:', {
        id: clone.id,
        backendId: clone.backendId,
        backendSynced: clone.backendSynced,
        name: clone.name
      })
      
      // Try to reconcile with backend if not synced, but don't block testing
      if (!clone.backendSynced) {
        console.log('⚠️ Clone not synced, attempting reconciliation before test...')
        try {
          await reconcileWithBackend()
          
          // Check again after reconciliation
          const updatedClone = voiceClones.find(c => c.name === clone.name)
          if (updatedClone && updatedClone.backendSynced) {
            clone = updatedClone
            console.log(`✅ Successfully synced ${clone.name} with backend`)
          } else {
            console.log(`⚠️ Could not sync ${clone.name}, will attempt direct backend connection`)
          }
        } catch (syncError) {
          console.error('Sync error:', syncError)
          console.log(`⚠️ Sync failed for ${clone.name}, will attempt direct backend connection`)
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
            console.log(`⚠️ No voice clones found on backend, using local clone ID: ${clone.id}`)
            resolvedVoiceId = clone.id
          } else {
            console.log(`⚠️ Cannot find matching voice clone "${clone.name}" on backend, using local clone ID: ${clone.id}`)
            console.log(`Available backend clones: ${backendClones.map(c => c.name).join(', ')}`)
            resolvedVoiceId = clone.id
          }
        } else {
          throw new Error(`Backend returned ${listResp.status}: ${listResp.statusText}`)
        }
      } catch (reconErr) {
        console.error('❌ Failed to reconcile voice clone with backend:', reconErr)
        console.log(`⚠️ Backend connection failed, will try direct voice clone test anyway...`)
        // Don't return here - continue with the test attempt
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
        
        // Update the clone with new cached test audio info (audio is auto-cached by backend)
        const currentTime = Math.floor(Date.now() / 1000)
        const isCustom = customText || customTestText
        const updatedCachedInfo = {
          text: testText,
          audioUrl, // Store the current audio URL for immediate use
          audioSize: audioBlob.size,
          testedAt: currentTime,
          cacheKey: `${voiceIdToUse}_test_${Math.random().toString(36).substring(7)}`,
          isCustomText: !!isCustom
        }
        
        // Save custom test text to the clone if provided
        if (isCustom) {
          clone.customTestText = testText
        }
        
        // Update the voice clone with cached audio info and custom test text
        setVoiceClones(prevClones => 
          prevClones.map(c => 
            c.id === clone.id 
              ? { ...c, cachedTestAudio: updatedCachedInfo, customTestText: isCustom ? testText : c.customTestText }
              : c
          )
        )
        
        // Update current clone if it matches
        if (currentClone?.id === clone.id) {
          setCurrentClone(prev => prev ? { 
            ...prev, 
            cachedTestAudio: updatedCachedInfo,
            customTestText: isCustom ? testText : prev.customTestText
          } : prev)
        }
        
        setSuccess(`🎉 Voice clone test successful! Generated ${Math.round(audioBlob.size / 1024)}KB audio for ${clone.name} using VibeVoice-Large. 📋 Test audio cached for future playback.`)
        
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
      console.error('😨 Voice clone test error:', error)
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError(`❌ Cannot connect to backend server at localhost:8001.\n\n🔧 Troubleshooting:\n• Ensure your backend server is running\n• Check if port 8001 is accessible\n• Verify VibeVoice API is properly configured\n\nVoice clone testing requires the backend connection for VibeVoice-Large processing.`)
      } else if (error.message.includes('500')) {
        setError(`❌ Server error testing ${clone.name}.\n\n🔧 VibeVoice Configuration Issues:\n• Check VibeVoice-Large model at Z:\\Models\\VibeVoice-Large\n• Verify ONNX Runtime compatibility\n• Check server logs for detailed error information\n\nThe voice clone exists but the TTS engine needs proper setup.`)
      } else if (error.message.includes('404')) {
        setError(`❌ Voice clone "${clone.name}" not found on backend.\n\n🔄 This can happen if:\n• The voice clone needs to be re-synced with backend\n• Backend database was reset\n• Voice clone was created locally but not uploaded\n\nTry adding a new voice sample to re-sync with backend.`)
      } else {
        setError(`❌ Voice clone test failed for ${clone.name}:\n\n${error.message}\n\nCheck browser console for detailed error information.`)
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
      setCurrentTestingClone(null)
      setPlayingStates(prev => ({ ...prev, [`clone_test_${clone.id}`]: false }))
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
  
  const drawWaveform = useCallback(() => {
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
    
    // Draw playback position indicator
    if (playingStates['trimmer-preview'] && trimmedAudioRef.current && !trimmedAudioRef.current.paused) {
      const currentTime = trimmedAudioRef.current.currentTime
      console.log('🔴 Drawing position indicator at time:', currentTime.toFixed(2), 'Range:', trimStart.toFixed(2), '-', trimEnd.toFixed(2))
      
      if (currentTime >= trimStart && currentTime <= trimEnd && (endX - startX) > 0) {
        const playbackX = ((currentTime - trimStart) / (trimEnd - trimStart)) * (endX - startX) + startX
        console.log('🔴 Playback position X:', playbackX, 'Canvas width:', width)
        
        // Draw playback position line
        ctx.strokeStyle = '#ef4444' // Red color for playback position
        ctx.lineWidth = 3
        ctx.setLineDash([])  // Solid line
        ctx.beginPath()
        ctx.moveTo(playbackX, 0)
        ctx.lineTo(playbackX, height)
        ctx.stroke()
        
        // Draw playback position circle at top
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(playbackX, 8, 6, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw playback position circle at bottom
        ctx.beginPath()
        ctx.arc(playbackX, height - 8, 6, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }, [waveformData, trimStart, trimEnd, importedDuration, playingStates, trimmedAudioRef])
  
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
  }, [waveformData, trimStart, trimEnd, importedDuration, drawWaveform])
  
  // Format time display
  const formatTime = (seconds: number): string => {
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
              key="error-message"
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
              key="success-message"
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
                        {editingCloneName === clone.id ? (
                          <div className="mb-2">
                            <input
                              type="text"
                              value={tempCloneName}
                              onChange={(e) => setTempCloneName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCloneName()
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              onBlur={saveCloneName}
                              autoFocus
                              className="w-full px-2 py-1 text-sm font-semibold bg-white dark:bg-gray-700 border border-purple-500 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        ) : (
                          <h3 
                            className="font-semibold text-gray-900 dark:text-gray-100 mb-2 cursor-pointer hover:text-purple-600 transition-colors flex items-center gap-2"
                            onClick={() => startEditingCloneName(clone)}
                            title="Click to edit name"
                          >
                            {clone.name}
                            <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </h3>
                        )}
                        
                        {editingCloneDescription === clone.id ? (
                          <div className="mb-3">
                            <textarea
                              value={tempCloneDescription}
                              onChange={(e) => setTempCloneDescription(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  saveCloneDescription()
                                }
                                if (e.key === 'Escape') cancelEdit()
                              }}
                              onBlur={saveCloneDescription}
                              autoFocus
                              rows={2}
                              placeholder="Enter description..."
                              className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-purple-500 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            />
                          </div>
                        ) : (
                          <p 
                            className="text-sm text-gray-600 dark:text-gray-400 mb-3 cursor-pointer hover:text-purple-600 transition-colors"
                            onClick={() => startEditingCloneDescription(clone)}
                            title="Click to edit description"
                          >
                            {clone.description || 'Click to add description'}
                          </p>
                        )}
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
                        onClick={() => {
                          if (currentTestingClone === currentClone.id) {
                            stopVoiceCloneTest(currentClone.id)
                          } else {
                            testVoiceClone(currentClone)
                          }
                        }}
                        disabled={isProcessing && currentTestingClone !== currentClone.id || currentClone.samples.length === 0}
                        className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                          currentTestingClone === currentClone.id
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'
                        }`}
                      >
                        {currentTestingClone === currentClone.id ? (
                          <>
                            <StopIcon className="h-4 w-4" />
                            Stop Test
                          </>
                        ) : isProcessing && currentTestingClone === currentClone.id ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <SpeakerWaveIcon className="h-4 w-4" />
                            Test Voice
                          </>
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-purple-600">{currentClone.samples.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Voice Samples</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-600">
                          {currentClone.samples.length > 0 ? Math.round(currentClone.samples.reduce((acc, sample) => acc + sample.quality, 0) / currentClone.samples.length * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-600">
                          {(() => {
                            if (currentClone.samples.length === 0) return '0s'
                            const totalSeconds = currentClone.samples.reduce((acc, sample) => acc + sample.duration, 0)
                            const minutes = Math.floor(totalSeconds / 60)
                            const seconds = Math.round(totalSeconds % 60)
                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                          })()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Audio</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {currentClone && (
                <>
                  {/* Professional Recording Interface */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                        <MicrophoneIcon className="h-6 w-6 text-red-600" />
                        Professional Voice Recording Studio
                      </h2>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Studio Ready
                        </div>
                        <button
                          onClick={() => {
                            setShowTrimmer(false)
                            setImportedFile(null)
                            setImportedAudioUrl(null)
                            setAudioBlob(null)
                            setAudioUrl(null)
                            setRecordingWaveform([])
                            setAudioLevel(0)
                          }}
                          className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors"
                        >
                          Reset Studio
                        </button>
                      </div>
                    </div>
                    
                    {/* Recording Quality & Settings Panel */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        Recording Quality & Audio Processing
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Recording Quality */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Quality Preset
                          </label>
                          <select
                            value={recordingQuality}
                            onChange={(e) => setRecordingQuality(e.target.value as 'low' | 'medium' | 'high' | 'studio')}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                          >
                            <option value="low">Low (16kHz, 64kbps)</option>
                            <option value="medium">Medium (22kHz, 128kbps)</option>
                            <option value="high">High (44kHz, 256kbps)</option>
                            <option value="studio">Studio (48kHz, 320kbps)</option>
                          </select>
                        </div>
                        
                        {/* Audio Processing Toggles */}
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={noiseReduction}
                              onChange={(e) => setNoiseReduction(e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Noise Reduction</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={echoCancellation}
                              onChange={(e) => setEchoCancellation(e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Echo Cancellation</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoGain}
                              onChange={(e) => setAutoGain(e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Auto Gain Control</span>
                          </label>
                        </div>
                        
                        {/* Audio Level Meter */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Input Level
                          </label>
                          <div className="relative h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                            <div 
                              className="absolute bottom-0 left-0 w-full transition-all duration-75 ease-out"
                              style={{ 
                                height: `${Math.min(audioLevel * 100, 100)}%`,
                                background: `linear-gradient(to top, #10b981, #f59e0b, #ef4444)`
                              }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                              {Math.round(audioLevel * 100)}%
                            </div>
                          </div>
                        </div>
                        
                        {/* Recording Stats */}
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <div>Duration: {formatTime(recordingTime)}</div>
                            <div>Quality: {recordingQuality.charAt(0).toUpperCase() + recordingQuality.slice(1)}</div>
                            <div>Status: {isRecording ? '🔴 Recording' : '⏸️ Stopped'}</div>
                            {audioUrl && <div>✅ Audio Ready</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Real-time Waveform Display */}
                    {isRecording && (
                      <div className="mb-6 p-4 bg-gray-900 dark:bg-black rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-white flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Live Recording Waveform
                          </h4>
                          <div className="text-xs text-gray-400">
                            {formatTime(recordingTime)} • Level: {Math.round(audioLevel * 100)}%
                          </div>
                        </div>
                        <canvas
                          ref={recordingCanvasRef}
                          width={800}
                          height={120}
                          className="w-full h-20 rounded border border-gray-700"
                        />
                      </div>
                    )}
                    
                    {/* Final Recorded Waveform Display */}
                    {!isRecording && recordingWaveform.length > 0 && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                            Recorded Audio Waveform
                          </h4>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Duration: {formatTime(recordingTime)} • Quality: {recordingQuality}
                          </div>
                        </div>
                        <div className="relative">
                          <canvas
                            width={800}
                            height={100}
                            className="w-full h-16 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600"
                            ref={(canvas) => {
                              if (canvas && recordingWaveform.length > 0) {
                                const ctx = canvas.getContext('2d')
                                if (ctx) {
                                  ctx.fillStyle = '#f3f4f6'
                                  ctx.fillRect(0, 0, canvas.width, canvas.height)
                                  ctx.fillStyle = '#8b5cf6'
                                  const barWidth = canvas.width / recordingWaveform.length
                                  recordingWaveform.forEach((amplitude, i) => {
                                    const barHeight = amplitude * canvas.height
                                    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight)
                                  })
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
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
                          {/* Waveform Instructions */}
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                                💡
                              </div>
                              <div className="text-sm">
                                <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                                  How to use the waveform editor:
                                </p>
                                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                                  <li>• <strong>Click on waveform</strong> to set start/end points</li>
                                  <li>• <strong>Use blue sliders below</strong> for precise timing control</li>
                                  <li>• <strong>Drag numeric inputs</strong> or type exact timestamps</li>
                                  <li>• <strong>Try quick buttons</strong> for common selections</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                          
                          {/* Waveform Canvas */}
                          <div className="relative">
                            <div className="relative group">
                              <canvas
                                ref={canvasRef}
                                width={800}
                                height={200}
                                onClick={handleCanvasClick}
                                className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-crosshair border border-gray-300 dark:border-gray-600 waveform-canvas transition-all duration-200 hover:shadow-lg hover:border-purple-400"
                                style={{ aspectRatio: '4/1' }}
                                title="Click anywhere on the waveform to set trim points. Closer to start = move start time, closer to end = move end time."
                              />
                              
                              {/* Hover tooltip */}
                              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                Click waveform to set trim points • Purple area = selected
                              </div>
                            </div>
                            
                            {/* Time markers */}
                            <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
                              <span>0:00</span>
                              <span>{formatTime(importedDuration / 2)}</span>
                              <span>{formatTime(importedDuration)}</span>
                            </div>
                            
                            {/* Selection indicators */}
                            <div className="flex justify-between text-xs mt-1 px-2">
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Start: {formatTime(trimStart)}</span>
                              </div>
                              <div className="text-purple-600 dark:text-purple-400 font-medium">
                                Selected: {formatTime(trimEnd - trimStart)}
                              </div>
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <span>End: {formatTime(trimEnd)}</span>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Trim Controls */}
                          <div className="space-y-4">
                            {/* Range Sliders */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="group">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg" title="Start point marker"></div>
                                  Start Time: {formatTime(trimStart)}
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={Math.max(0, trimEnd - 0.5)}
                                  step={0.01}
                                  value={trimStart}
                                  onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                                  className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer slider hover:bg-gray-300 transition-colors"
                                  title="Drag to adjust start time of selection"
                                />
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  💡 Drag the blue handle to set where audio starts
                                </div>
                              </div>
                              <div className="group">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full shadow-lg" title="End point marker"></div>
                                  End Time: {formatTime(trimEnd)}
                                </label>
                                <input
                                  type="range"
                                  min={Math.max(0, trimStart + 0.5)}
                                  max={importedDuration}
                                  step={0.01}
                                  value={trimEnd}
                                  onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                                  className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer slider hover:bg-gray-300 transition-colors"
                                  title="Drag to adjust end time of selection"
                                />
                                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  💡 Drag the blue handle to set where audio ends
                                </div>
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
                            
                            <div className="flex flex-col gap-3">
                              {/* Audio Controls */}
                              <div className="flex items-center gap-3">
                                {!playingStates['trimmer-preview'] ? (
                                  <button
                                    onClick={() => {
                                      // Stop any currently playing audio first
                                      stopAllAudio()
                                      
                                      const audio = new Audio(importedAudioUrl!)
                                      trimmedAudioRef.current = audio
                                      setCurrentPlayingAudio(audio)
                                      setPlayingStates({ 'trimmer-preview': true })
                                      setPlaybackProgress(0)
                                      
                                      audio.onloadeddata = () => {
                                        audio.currentTime = trimStart
                                        audio.play().catch(e => console.error('Trimmer preview play error:', e))
                                      }
                                      
                                      // Update progress during playback
                                      const updateProgress = () => {
                                        if (audio && !audio.paused && !audio.ended && playingStates['trimmer-preview']) {
                                          const currentRelative = (audio.currentTime - trimStart) / (trimEnd - trimStart)
                                          setPlaybackProgress(Math.max(0, Math.min(1, currentRelative)))
                                          
                                          console.log('🎵 Playback progress:', Math.round(currentRelative * 100) + '%', 'Time:', audio.currentTime.toFixed(2))
                                          
                                          // Redraw waveform with updated position indicator
                                          setTimeout(() => drawWaveform(), 0)
                                          
                                          // Stop at trim end
                                          if (audio.currentTime >= trimEnd) {
                                            audio.pause()
                                            setCurrentPlayingAudio(null)
                                            setPlayingStates({})
                                            setPlaybackProgress(0)
                                            // Final waveform redraw without position indicator
                                            setTimeout(() => drawWaveform(), 0)
                                          } else {
                                            requestAnimationFrame(updateProgress)
                                          }
                                        }
                                      }
                                      
                                      // Start progress tracking
                                      requestAnimationFrame(updateProgress)
                                      
                                      audio.onended = () => {
                                        setCurrentPlayingAudio(null)
                                        setPlayingStates({})
                                        setPlaybackProgress(0)
                                        // Redraw waveform without position indicator
                                        drawWaveform()
                                      }
                                      
                                      audio.onerror = (e) => {
                                        console.error('Trimmer preview error:', e)
                                        setCurrentPlayingAudio(null)
                                        setPlayingStates({})
                                        setPlaybackProgress(0)
                                        setError('Failed to play audio preview')
                                        // Redraw waveform without position indicator
                                        drawWaveform()
                                      }
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    <PlayIcon className="h-4 w-4" />
                                    Play Selection
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        if (trimmedAudioRef.current) {
                                          trimmedAudioRef.current.pause()
                                        }
                                        setCurrentPlayingAudio(null)
                                        setPlayingStates({})
                                        setPlaybackProgress(0)
                                        // Redraw waveform without position indicator
                                        drawWaveform()
                                      }}
                                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                    >
                                      <PauseIcon className="h-4 w-4" />
                                      Pause
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (trimmedAudioRef.current) {
                                          trimmedAudioRef.current.pause()
                                          trimmedAudioRef.current.currentTime = trimStart
                                        }
                                        setCurrentPlayingAudio(null)
                                        setPlayingStates({})
                                        setPlaybackProgress(0)
                                        // Redraw waveform without position indicator
                                        drawWaveform()
                                      }}
                                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                    >
                                      <StopIcon className="h-4 w-4" />
                                      Stop
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Progress Bar */}
                              {playingStates['trimmer-preview'] && (
                                <div className="w-full">
                                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span>Playing Selection</span>
                                    <span>{Math.round(playbackProgress * 100)}% complete</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full transition-all duration-100 ease-linear"
                                      style={{ width: `${playbackProgress * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Use Trimmed Audio Button */}
                              <div className="flex justify-end">
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
                      placeholder="Enter a name for this voice sample..."
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        !currentSampleName.trim() && (audioUrl || importedAudioUrl)
                          ? 'border-red-300 dark:border-red-600 ring-1 ring-red-300 dark:ring-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {!currentSampleName.trim() && (audioUrl || importedAudioUrl) && (
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        Sample name is required to add this voice sample
                      </p>
                    )}
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
                    
                    {/* Professional Recording Controls */}
                    <div className="mb-8">
                      <div className="flex justify-center items-center gap-6 mb-4">
                        {!isRecording ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startRecording}
                            className="flex items-center justify-center w-24 h-24 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-2xl transition-all duration-200 relative"
                          >
                            <MicrophoneIcon className="h-10 w-10" />
                            <div className="absolute -bottom-2 text-xs font-medium">Record</div>
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={stopRecording}
                            className="flex items-center justify-center w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-full shadow-2xl recording-pulse relative"
                          >
                            <StopIcon className="h-10 w-10" />
                            <div className="absolute -bottom-2 text-xs font-medium">Stop</div>
                          </motion.button>
                        )}
                        
                        {audioUrl && (
                          <>
                            <motion.button
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => toggleAudioPlayback(audioUrl, 'preview')}
                              className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-full shadow-xl transition-all relative"
                              title={playingStates['preview'] ? 'Pause Preview' : 'Play Preview'}
                            >
                              {playingStates['preview'] ? (
                                <PauseIcon className="h-8 w-8" />
                              ) : (
                                <PlayIcon className="h-8 w-8" />
                              )}
                              <div className="absolute -bottom-2 text-xs font-medium">Preview</div>
                            </motion.button>
                            
                            <motion.button
                              initial={{ opacity: 0, x: 25 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={stopAllAudio}
                              className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-full shadow-xl transition-all relative"
                              title="Stop All Audio"
                            >
                              <StopIcon className="h-6 w-6" />
                              <div className="absolute -bottom-2 text-xs font-medium">Stop</div>
                            </motion.button>
                            
                            <motion.button
                              initial={{ opacity: 0, x: 30 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={addVoiceSample}
                              disabled={!currentSampleName.trim()}
                              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-300 disabled:to-green-400 text-white rounded-xl font-bold transition-all flex items-center gap-3 shadow-xl relative"
                            >
                              <CloudArrowUpIcon className="h-6 w-6" />
                              Add to Studio
                            </motion.button>
                          </>
                        )}
                      </div>
                      
                      {/* Advanced Audio Player with Waveform Scrubbing */}
                      {audioUrl && recordingWaveform.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-2xl p-6 border border-purple-300 dark:border-purple-700"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                              <SpeakerWaveIcon className="h-5 w-5 text-purple-600" />
                              Professional Audio Player
                            </h4>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span>Duration: {formatTime(recordingTime)}</span>
                              <span>Quality: {recordingQuality}</span>
                              <span>Format: WebM/Opus</span>
                            </div>
                          </div>
                          
                          {/* Interactive Waveform with Scrubbing */}
                          <div className="relative mb-4 group">
                            <canvas
                              width={800}
                              height={120}
                              className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 transition-colors"
                              onClick={(e) => {
                                if (currentPlayingAudio && recordingTime > 0) {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  const x = e.clientX - rect.left
                                  const clickTime = (x / rect.width) * recordingTime
                                  currentPlayingAudio.currentTime = clickTime
                                }
                              }}
                              ref={(canvas) => {
                                if (canvas && recordingWaveform.length > 0) {
                                  const ctx = canvas.getContext('2d')
                                  if (ctx) {
                                    // Draw waveform background
                                    ctx.fillStyle = '#f3f4f6'
                                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                                    
                                    // Draw waveform bars
                                    ctx.fillStyle = '#8b5cf6'
                                    const barWidth = canvas.width / recordingWaveform.length
                                    recordingWaveform.forEach((amplitude, i) => {
                                      const barHeight = amplitude * canvas.height * 0.8
                                      const y = (canvas.height - barHeight) / 2
                                      ctx.fillRect(i * barWidth, y, Math.max(barWidth - 1, 1), barHeight)
                                    })
                                    
                                    // Draw playback progress if playing
                                    if (currentPlayingAudio && playingStates['preview'] && recordingTime > 0) {
                                      const progress = currentPlayingAudio.currentTime / recordingTime
                                      const progressX = progress * canvas.width
                                      
                                      // Progress overlay
                                      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)'
                                      ctx.fillRect(0, 0, progressX, canvas.height)
                                      
                                      // Progress line
                                      ctx.strokeStyle = '#7c3aed'
                                      ctx.lineWidth = 3
                                      ctx.beginPath()
                                      ctx.moveTo(progressX, 0)
                                      ctx.lineTo(progressX, canvas.height)
                                      ctx.stroke()
                                    }
                                  }
                                }
                              }}
                            />
                            
                            {/* Scrubbing tooltip */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              Click anywhere to seek • Drag to scrub
                            </div>
                          </div>
                          
                          {/* Transport Controls */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  if (currentPlayingAudio) {
                                    currentPlayingAudio.currentTime = Math.max(0, currentPlayingAudio.currentTime - 10)
                                  }
                                }}
                                className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                title="Skip back 10 seconds"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                </svg>
                                -10s
                              </button>
                              
                              <button
                                onClick={() => toggleAudioPlayback(audioUrl, 'preview')}
                                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
                              >
                                {playingStates['preview'] ? (
                                  <PauseIcon className="h-6 w-6" />
                                ) : (
                                  <PlayIcon className="h-6 w-6" />
                                )}
                              </button>
                              
                              <button
                                onClick={() => {
                                  if (currentPlayingAudio) {
                                    currentPlayingAudio.currentTime = Math.min(recordingTime, currentPlayingAudio.currentTime + 10)
                                  }
                                }}
                                className="p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                title="Skip forward 10 seconds"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                </svg>
                                +10s
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                              <span>🎵 Ready to add to voice clone</span>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>High Quality</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
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
                                  onClick={() => {
                                    if (sample.audioUrl) {
                                      toggleAudioPlayback(sample.audioUrl, sample.id)
                                    } else {
                                      setError('Audio not available - sample was recorded in a previous session. Audio playback is only available in the same session or if stored on backend.')
                                      setTimeout(() => setError(null), 5000)
                                    }
                                  }}
                                  className={`p-2 text-white rounded-lg transition-colors ${
                                    sample.audioUrl 
                                      ? 'bg-purple-600 hover:bg-purple-700' 
                                      : 'bg-gray-400 cursor-not-allowed'
                                  }`}
                                  title={
                                    sample.audioUrl 
                                      ? (playingStates[sample.id] ? 'Pause' : 'Play') 
                                      : 'Audio not available - recorded in previous session'
                                  }
                                >
                                  {sample.audioUrl ? (
                                    playingStates[sample.id] ? (
                                      <PauseIcon className="h-4 w-4" />
                                    ) : (
                                      <PlayIcon className="h-4 w-4" />
                                    )
                                  ) : (
                                    <div className="h-4 w-4 flex items-center justify-center">
                                      <span className="text-xs">⏸</span>
                                    </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={testSaveLoadProcess}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                    title="Test if save/load process works correctly"
                  >
                    🧪 Test Save
                  </button>
                  <button
                    onClick={debugCloneStatus}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                    title="Debug: Show clone status in console"
                  >
                    🔍 Debug
                  </button>
                  <button
                    onClick={forceReUploadAllClones}
                    disabled={isProcessing || voiceClones.length === 0}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-xs rounded-lg transition-colors"
                    title="Force re-upload all clones (resets sync status first)"
                  >
                    🔄 Force Re-upload
                  </button>
                  <button
                    onClick={manualSyncClonesToBackend}
                    disabled={isProcessing || voiceClones.filter(c => !c.backendSynced).length === 0}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    title={voiceClones.filter(c => !c.backendSynced).length === 0 ? 'All clones already synced' : `Upload ${voiceClones.filter(c => !c.backendSynced).length} unsynced clones to backend`}
                  >
                    <ArrowUpTrayIcon className={`h-4 w-4 ${isProcessing ? 'animate-bounce' : ''}`} />
                    {isProcessing ? 'Uploading...' : `Upload ${voiceClones.filter(c => !c.backendSynced).length} Clones`}
                  </button>
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
                      
                      {/* Voice Clone Statistics */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="text-2xl font-bold text-purple-600">
                            {clone.samples.length}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Voice Samples</div>
                        </div>
                        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="text-2xl font-bold text-green-600">
                            {clone.samples.length > 0 ? Math.round(clone.samples.reduce((acc, sample) => acc + sample.quality, 0) / clone.samples.length * 100) : 0}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Quality</div>
                        </div>
                        <div className="text-center bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div className="text-2xl font-bold text-blue-600">
                            {(() => {
                              if (clone.samples.length === 0) return '0s'
                              const totalSeconds = clone.samples.reduce((acc, sample) => acc + (sample.duration || 0), 0)
                              const minutes = Math.floor(totalSeconds / 60)
                              const seconds = Math.round(totalSeconds % 60)
                              return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                            })()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Total Audio</div>
                        </div>
                      </div>
                      
                      {/* Additional Statistics Row */}
                      {clone.samples.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-700">
                            <div className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                              {Math.round(clone.samples.reduce((acc, sample) => acc + sample.duration, 0))}s
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400">Total Duration</div>
                          </div>
                          <div className="text-center bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-2 border border-green-200 dark:border-green-700">
                            <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                              {clone.samples.filter(s => s.quality >= 0.8).length}/{clone.samples.length}
                            </div>
                            <div className="text-xs text-green-600 dark:text-green-400">High Quality</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {/* Cached Test Audio Section */}
                        {clone.cachedTestAudio && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                            <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                📋 Cached Test Audio
                                {clone.cachedTestAudio.isCustomText && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <span className="text-blue-500 dark:text-blue-400">
                                {new Date(clone.cachedTestAudio.testedAt * 1000).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {/* Expandable Text Display */}
                            <div className="mb-2">
                              <div className="text-xs text-blue-600 dark:text-blue-400 italic">
                                "{expandedCachedText[clone.id] 
                                  ? clone.cachedTestAudio.text 
                                  : `${clone.cachedTestAudio.text.substring(0, 60)}${clone.cachedTestAudio.text.length > 60 ? '...' : ''}`
                                }"
                              </div>
                              {clone.cachedTestAudio.text.length > 60 && (
                                <button
                                  onClick={() => setExpandedCachedText(prev => ({ ...prev, [clone.id]: !prev[clone.id] }))}
                                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 mt-1"
                                >
                                  {expandedCachedText[clone.id] ? 'Show less' : 'Show full text'}
                                </button>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => playCachedTestAudio(clone)}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                                title="Play the cached test audio from previous test"
                              >
                                {playingStates[`cached_test_${clone.id}`] ? (
                                  <>
                                    <PauseIcon className="h-4 w-4" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <PlayIcon className="h-4 w-4" />
                                    🔁 Play Last Test
                                  </>
                                )}
                              </button>
                              {clone.cachedTestAudio.isCustomText && clone.customTestText && (
                                <button
                                  onClick={() => {
                                    setCustomTestText(clone.customTestText || '')
                                    setCurrentCustomTestClone(clone)
                                    setShowCustomTestInput(true)
                                  }}
                                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                                  title="Reuse this custom test text"
                                >
                                  <DocumentDuplicateIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Custom Test Text Input */}
                        {showCustomTestInput && (
                          <div className="mb-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Custom Test Text for {(currentCustomTestClone || clone).name}
                              </label>
                              <button
                                onClick={() => {
                                  setShowCustomTestInput(false)
                                  setCurrentCustomTestClone(null)
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-3">
                              <textarea
                                value={customTestText}
                                onChange={(e) => setCustomTestText(e.target.value)}
                                placeholder="Enter custom text for voice clone testing..."
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    const targetClone = currentCustomTestClone || clone
                                    if (currentTestingClone === targetClone.id) {
                                      stopVoiceCloneTest(targetClone.id)
                                    } else {
                                      console.log(`🎵 Test with Custom Text clicked for: ${targetClone.name}`)
                                      console.log(`Custom text: "${customTestText}"`)
                                      console.log(`Target clone samples: ${targetClone.samples.length}, backendSynced: ${targetClone.backendSynced}`)
                                      testVoiceClone(targetClone, customTestText)
                                    }
                                  }}
                                  disabled={(isProcessing && currentTestingClone !== (currentCustomTestClone || clone).id) || !customTestText.trim() || ((currentCustomTestClone || clone).samples.length === 0 && !(currentCustomTestClone || clone).backendSynced)}
                                  className={`px-3 py-2 text-white text-xs rounded-lg transition-colors flex items-center gap-2 ${
                                    currentTestingClone === (currentCustomTestClone || clone).id
                                      ? 'bg-red-600 hover:bg-red-700'
                                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed'
                                  }`}
                                >
                                  {currentTestingClone === (currentCustomTestClone || clone).id ? (
                                    <>
                                      <StopIcon className="h-3 w-3" />
                                      Stop Test
                                    </>
                                  ) : (
                                    <>
                                      <PlayIcon className="h-3 w-3" />
                                      Test with Custom Text
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    if (!isSTTForTest) {
                                      setIsSTTForTest(true)
                                      // Here you would implement STT for custom test text
                                      setError('🎤 STT for custom test text coming soon! For now, please type your test text.')
                                      setTimeout(() => setError(null), 4000)
                                    }
                                  }}
                                  disabled={isSTTForTest}
                                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-xs rounded-lg transition-colors flex items-center gap-2"
                                >
                                  <MicrophoneIcon className="h-3 w-3" />
                                  {isSTTForTest ? 'Recording...' : 'Voice Input'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="space-y-2">
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
                              onClick={(e) => {
                                e.preventDefault()
                                if (currentTestingClone === clone.id) {
                                  stopVoiceCloneTest(clone.id)
                                } else {
                                  console.log(`📏 Quick Test clicked for: ${clone.name}`)
                                  console.log(`Clone samples: ${clone.samples.length}, backendSynced: ${clone.backendSynced}`)
                                  testVoiceClone(clone)
                                }
                              }}
                              disabled={(isProcessing && currentTestingClone !== clone.id) || (clone.samples.length === 0 && !clone.backendSynced)}
                              className={`px-4 py-2 text-white text-sm rounded-lg transition-colors flex items-center gap-1 ${
                                currentTestingClone === clone.id
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed'
                              }`}
                              title={
                                currentTestingClone === clone.id ? 'Stop testing voice clone' :
                                (clone.samples.length === 0 && !clone.backendSynced) ? 'Voice clone needs voice samples to test' :
                                clone.backendSynced ? 'Test this voice clone with VibeVoice' :
                                'Test voice clone (will try backend connection)'
                              }
                            >
                              {currentTestingClone === clone.id ? (
                                <>
                                  <StopIcon className="h-3 w-3" />
                                  Stop Test
                                </>
                              ) : isProcessing && currentTestingClone === clone.id ? (
                                'Testing...'
                              ) : (
                                clone.cachedTestAudio ? 'Quick Test' : clone.backendSynced ? 'Test Voice' : '🎵 Test Voice'
                              )}
                            </button>
                            <button
                              onClick={() => deleteVoiceClone(clone.id)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                          {/* Custom Test Button */}
                          {!showCustomTestInput && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                console.log(`📝 Custom Text Test clicked for: ${clone.name}`)
                                console.log(`Clone samples: ${clone.samples.length}, backendSynced: ${clone.backendSynced}`)
                                setShowCustomTestInput(true)
                                setCurrentCustomTestClone(clone)
                              }}
                              disabled={isProcessing || (clone.samples.length === 0 && !clone.backendSynced)}
                              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                              title={(clone.samples.length === 0 && !clone.backendSynced) ? 'Voice clone needs samples to test' : 'Test with custom text instead of default message'}
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                              Custom Test Text
                            </button>
                          )}
                        </div>
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
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <SpeakerWaveIcon className="h-8 w-8 text-blue-600" />
                    Voice Library
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full font-medium">
                      {filteredVoices.length} voices
                    </span>
                    {selectedVoices.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full font-medium">
                          {selectedVoices.length} selected
                        </span>
                        <button
                          onClick={clearVoiceSelection}
                          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg">
                  Discover high-quality, open-source voices from leading AI voice projects. Filter, favorite, and use voices to create your personalized clones.
                </p>
              </div>
              
              {/* Search & Filters */}
              <div className="mb-8 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search voices by name, nationality, style, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                
                {/* Filter Row */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Gender Filter */}
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Genders</option>
                    {getUniqueGenders().map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                  
                  {/* Nationality Filter */}
                  <select
                    value={selectedNationality}
                    onChange={(e) => setSelectedNationality(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Countries</option>
                    {getUniqueNationalities().map(nationality => (
                      <option key={nationality} value={nationality}>{nationality}</option>
                    ))}
                  </select>
                  
                  {/* Style Filter */}
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Styles</option>
                    {getUniqueStyles().map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                  
                  {/* Source Filter */}
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="All">All Sources</option>
                    {getUniqueSources().map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                  
                  {/* Featured Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showFeaturedOnly}
                      onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ⭐ Featured Only
                    </span>
                  </label>
                </div>
              </div>
              
              {/* Voice Cards Grid */}
              {filteredVoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No voices match your criteria
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Try adjusting your filters or search query to find voices.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedGender('All')
                      setSelectedNationality('All')
                      setSelectedStyle('All')
                      setSelectedSource('All')
                      setShowFeaturedOnly(false)
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVoices.map((voice, index) => (
                    <motion.div
                      key={voice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 } }}
                      className={`relative p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                        selectedVoices.includes(voice.id)
                          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <div className="absolute top-4 right-4">
                        <input
                          type="checkbox"
                          checked={selectedVoices.includes(voice.id)}
                          onChange={() => toggleVoiceSelection(voice.id)}
                          className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      
                      {/* Featured Badge */}
                      {voice.featured && (
                        <div className="absolute top-4 left-4">
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full font-semibold flex items-center gap-1">
                            ⭐ Featured
                          </span>
                        </div>
                      )}
                      
                      {/* Voice Quality Badges */}
                      <div className={`absolute ${voice.featured ? 'top-10' : 'top-4'} left-4 space-y-1`}>
                        {availableRealSamples[voice.id] ? (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-semibold flex items-center gap-1" title="Authentic voice sample available">
                            🎤 Real Sample
                          </span>
                        ) : voice.ttsConfig ? (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-semibold flex items-center gap-1" title="Modern TTS available - authentic voice quality">
                            🎵 Modern TTS
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs rounded-full font-semibold flex items-center gap-1" title="System approximation only - may not represent true voice quality">
                            ⚠️ Approximation
                          </span>
                        )}
                      </div>
                      
                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavoriteVoice(voice.id)}
                        className={`absolute top-12 right-4 p-2 rounded-lg transition-colors ${
                          favoriteVoices.includes(voice.id)
                            ? 'text-red-500 hover:text-red-600'
                            : 'text-gray-400 hover:text-red-500'
                        }`}
                        title={favoriteVoices.includes(voice.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <HeartIcon className={`h-5 w-5 ${
                          favoriteVoices.includes(voice.id) ? 'fill-current' : ''
                        }`} />
                      </button>
                      
                      {/* Voice Info */}
                      <div className="mt-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                          {voice.name}
                        </h3>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                            {voice.gender}
                          </span>
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                            {voice.nationality}
                          </span>
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">
                            {voice.accent}
                          </span>
                        </div>
                        
                        {/* Quality Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Quality:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                className={`h-4 w-4 ${
                                  i < voice.quality
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                              ({voice.quality}/5)
                            </span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                          {voice.description}
                        </p>
                        
                        {/* Styles */}
                        <div className="mb-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Styles:</div>
                          <div className="flex flex-wrap gap-1">
                            {voice.style.map(style => (
                              <span key={style} className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded">
                                {style}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* Source & License */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                          <span>{voice.source}</span>
                          <span className={`px-2 py-1 rounded-full font-medium ${
                            voice.license === 'Open Source' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            voice.license === 'Free Commercial' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {voice.license}
                          </span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 flex-1">
                            <button
                              onClick={() => {
                                if (currentTestingVoice === voice.id) {
                                  stopVoiceTest(voice.id)
                                } else {
                                  testLibraryVoice(voice)
                                }
                              }}
                              className={`flex-1 px-3 py-2 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                currentTestingVoice === voice.id
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              {currentTestingVoice === voice.id ? (
                                <>
                                  <StopIcon className="h-4 w-4" />
                                  Stop Test
                                </>
                              ) : (
                                <>
                                  <PlayIcon className="h-4 w-4" />
                                  {availableRealSamples[voice.id] ? '🎤 Authentic Sample' : 
                                   voice.ttsConfig ? '🎵 Modern TTS' : 
                                   '⚠️ System Approx'}
                                </>
                              )}
                            </button>
                          </div>
                          <button
                            onClick={() => useVoiceForClone(voice)}
                            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                            title="Create a new voice clone based on this voice"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            Use Voice
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              
              {/* Quick Actions for Selected Voices */}
              {selectedVoices.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {selectedVoices.length} voices selected:
                    </span>
                    <button
                      onClick={() => {
                        const selectedVoiceObjects = filteredVoices.filter(v => selectedVoices.includes(v.id))
                        selectedVoiceObjects.forEach(voice => {
                          toggleFavoriteVoice(voice.id)
                        })
                      }}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    >
                      <HeartIcon className="h-4 w-4" />
                      Favorite All
                    </button>
                    <button
                      onClick={() => {
                        const selectedVoiceObjects = filteredVoices.filter(v => selectedVoices.includes(v.id))
                        selectedVoiceObjects.forEach(voice => {
                          useVoiceForClone(voice)
                        })
                        clearVoiceSelection()
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                    >
                      <UserPlusIcon className="h-4 w-4" />
                      Create {selectedVoices.length} Clones
                    </button>
                  </div>
                </motion.div>
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
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        !newCloneName.trim()
                          ? 'border-red-300 dark:border-red-600 ring-1 ring-red-300 dark:ring-red-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {!newCloneName.trim() && (
                      <p className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center gap-1">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        Voice clone name is required
                      </p>
                    )}
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