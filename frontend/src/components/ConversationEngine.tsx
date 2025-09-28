import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Settings, 
  Users, 
  BarChart3,
  Wand2,
  Upload,
  Volume2,
  FileText,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Home,
  X as XMarkIcon
} from 'lucide-react';

interface ConversationStyle {
  value: string;
  name: string;
  description: string;
}

interface EmotionType {
  value: string;
  name: string;
  description: string;
}

interface ConversationMetadata {
  duration: number;
  speakerCount: number;
  wordCount: number;
  interactionComplexity: number;
  emotionDistribution: Record<string, number>;
  conversationStyle: string;
}

interface SpeakerMapping {
  [speakerName: string]: string; // voice_id
}

const ConversationEngine: React.FC = () => {
  const [script, setScript] = useState('');
  const [speakerMappings, setSpeakerMappings] = useState<SpeakerMapping>({
    'Speaker 1': '',
    'Speaker 2': ''
  });
  const [conversationStyles, setConversationStyles] = useState<ConversationStyle[]>([
    { value: 'natural', name: 'Natural', description: 'Natural conversation flow with pauses and expressions' },
    { value: 'interview', name: 'Interview', description: 'Structured Q&A format with longer thoughtful pauses' },
    { value: 'debate', name: 'Debate', description: 'Fast-paced argumentative style with quick responses' },
    { value: 'podcast', name: 'Podcast', description: 'Professional broadcasting style with clear pacing' },
    { value: 'casual', name: 'Casual', description: 'Relaxed, informal conversation style' },
    { value: 'formal', name: 'Formal', description: 'Professional, structured conversation style' },
    { value: 'dramatic', name: 'Dramatic', description: 'Expressive, theatrical conversation style' }
  ]);
  const [emotions, setEmotions] = useState<EmotionType[]>([]);
  const [selectedStyle, setSelectedStyle] = useState('natural');
  const [voiceClones, setVoiceClones] = useState<any[]>([]);
  
  // Generation settings
  const [addNaturalInteractions, setAddNaturalInteractions] = useState(true);
  const [includeBackgroundSound, setIncludeBackgroundSound] = useState(false);
  const [backgroundSoundVolume, setBackgroundSoundVolume] = useState(50); // 0-100 scale
  const [emotionalIntelligence, setEmotionalIntelligence] = useState(true);
  
  // State management
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [testingVoices, setTestingVoices] = useState<Record<string, boolean>>({});
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [conversationMetadata, setConversationMetadata] = useState<ConversationMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sample conversation templates
  const conversationTemplates = [
    {
      name: "Interview",
      script: `Interviewer: Welcome to our show! Can you tell us about your latest project?

Guest: Thank you for having me! I'm really excited to share what we've been working on. Our latest project focuses on innovative voice technology that can understand and express human emotions naturally.

Interviewer: That sounds fascinating! How does the emotional intelligence aspect work?

Guest: Well, we've developed advanced algorithms that can detect subtle emotional cues in speech patterns and respond accordingly. It's not just about recognizing words, but understanding the feeling behind them.

Interviewer: What challenges did you face during development?

Guest: The biggest challenge was creating natural-sounding conversations. We wanted to avoid that robotic feel you often get with synthetic voices. Our breakthrough came when we started incorporating real human speech patterns and emotional nuances.`
    },
    {
      name: "Debate (Emotion Demo)",
      script: `Speaker A: I strongly believe that artificial intelligence will revolutionize how we communicate and interact with technology. This is absolutely amazing!

Speaker B: While I appreciate the potential benefits, we can't ignore the serious risks that come with advanced AI systems. What about job displacement and privacy concerns? This is really concerning!

Speaker A: Those are valid concerns, but history shows us that technological advancement ultimately creates more opportunities than it destroys. I'm confident that proper regulation and education are the key.

Speaker B: But this time is different! AI is advancing at an unprecedented pace. We're talking about systems that could potentially replace human judgment in critical decisions. That's ridiculous!

Speaker A: Wow, that's exactly why we need to embrace it responsibly now, rather than resist progress. The countries and companies that lead in AI development will have significant advantages.

Speaker B: I agree on responsible development, but unfortunately we need much stronger safeguards and international cooperation to prevent misuse.`
    },
    {
      name: "Podcast",
      script: `Host: Welcome back to TechTalk, the podcast where we explore the cutting edge of technology. I'm your host Sarah, and today we're diving deep into the world of voice synthesis and AI-powered conversations.

Co-host: And I'm Mike, excited to unpack this fascinating topic with our listeners. The technology we're seeing today in voice generation is absolutely mind-blowing.

Host: Absolutely, Mike. Just five years ago, synthetic voices sounded robotic and unnatural. Now we have systems that can capture the subtle emotions, breathing patterns, and even personality quirks of human speech.

Co-host: It's incredible, but it also raises some important questions about authenticity and trust. When voices become indistinguishable from reality, how do we verify what's real?

Host: That's a crucial point. We'll be exploring both the amazing possibilities and the ethical considerations throughout today's episode. Let's start with the technical side - how do these systems actually work?`
    },
    {
      name: "Casual Chat (Interactions Demo)",
      script: `Friend A: Hey! How was your weekend? Did you end up trying that new restaurant?

Friend B: Oh wow, yes! It was absolutely incredible. The food was amazing, and the atmosphere was so cozy.

Friend A: Really? That sounds fantastic! What did you order?

Friend B: Um, well, I had the salmon, and it was perfectly cooked. My partner got the steak, and honestly, it was the best we've ever had.

Friend A: No way! I'm definitely going there next weekend. Was it expensive though?

Friend B: Surprisingly, not too bad! I mean, it's not cheap, but totally worth it for special occasions.

Friend A: Perfect! Thanks for the recommendation. I'm so excited to try it!`
    }
  ];

  useEffect(() => {
    loadConversationStyles();
    loadEmotions();
    loadVoiceClones();
    loadAnalytics();
  }, []);

  const loadConversationStyles = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/conversation/styles');
      if (response.ok) {
        const data = await response.json();
        setConversationStyles(data.styles || []);
      } else {
        // Use fallback styles if backend not available
        setConversationStyles([
          { value: 'natural', name: 'Natural', description: 'Natural conversation flow with pauses and expressions' },
          { value: 'formal', name: 'Formal', description: 'Professional, structured conversation style' },
          { value: 'casual', name: 'Casual', description: 'Relaxed, informal conversation style' },
          { value: 'dramatic', name: 'Dramatic', description: 'Expressive, theatrical conversation style' }
        ]);
      }
    } catch (err) {
      console.error('Failed to load conversation styles:', err);
      // Use fallback styles
      setConversationStyles([
        { value: 'natural', name: 'Natural', description: 'Natural conversation flow with pauses and expressions' },
        { value: 'formal', name: 'Formal', description: 'Professional, structured conversation style' },
        { value: 'casual', name: 'Casual', description: 'Relaxed, informal conversation style' },
        { value: 'dramatic', name: 'Dramatic', description: 'Expressive, theatrical conversation style' }
      ]);
    }
  };

  const loadEmotions = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/conversation/emotions');
      if (response.ok) {
        const data = await response.json();
        setEmotions(data.emotions || []);
      } else {
        // Use fallback emotions if backend not available
        setEmotions([
          { value: 'neutral', name: 'Neutral', description: 'Calm, balanced emotional state' },
          { value: 'happy', name: 'Happy', description: 'Joyful, upbeat, positive energy' },
          { value: 'excited', name: 'Excited', description: 'Enthusiastic, energetic tone' },
          { value: 'serious', name: 'Serious', description: 'Focused, professional demeanor' },
          { value: 'concern', name: 'Concerned', description: 'Thoughtful, worried undertones' },
          { value: 'confident', name: 'Confident', description: 'Assertive, self-assured delivery' }
        ]);
      }
    } catch (err) {
      console.error('Failed to load emotions:', err);
      // Use fallback emotions
      setEmotions([
        { value: 'neutral', name: 'Neutral', description: 'Calm, balanced emotional state' },
        { value: 'happy', name: 'Happy', description: 'Joyful, upbeat, positive energy' },
        { value: 'excited', name: 'Excited', description: 'Enthusiastic, energetic tone' },
        { value: 'serious', name: 'Serious', description: 'Focused, professional demeanor' },
        { value: 'concern', name: 'Concerned', description: 'Thoughtful, worried undertones' },
        { value: 'confident', name: 'Confident', description: 'Assertive, self-assured delivery' }
      ]);
    }
  };

  const loadVoiceClones = async () => {
    try {
      // Always try localStorage first since that's where voice clones are typically stored
      console.log('📁 Loading voice clones from localStorage...');
      const localClones = localStorage.getItem('voice-clones');
      if (localClones) {
        const parsedClones = JSON.parse(localClones);
        // Filter only clones that have samples and are ready
        const readyClones = parsedClones
          .filter(clone => clone.samples && clone.samples.length > 0)
          .map(clone => ({
            voice_id: clone.backendId || clone.id,
            id: clone.id,
            name: clone.name,
            status: clone.status || 'ready',
            samples_count: clone.samples ? clone.samples.length : 0,
            backend_synced: clone.backendSynced || false
          }));
        
        if (readyClones.length > 0) {
          console.log('📋 Loaded voice clones from localStorage:', readyClones.length);
          setVoiceClones(readyClones);
          return;
        }
      }
      
      // Fallback: try to load from backend API if localStorage is empty
      console.log('🔗 Trying backend API fallback for voice clones...');
      const response = await fetch('http://localhost:8001/api/v1/voice-clones');
      if (response.ok) {
        const data = await response.json();
        const clones = data.voice_clones || [];
        console.log('📋 Loaded voice clones from backend:', clones.length);
        setVoiceClones(clones);
      } else {
        console.warn('⚠️ No voice clones found in localStorage or backend');
        setVoiceClones([]);
      }
    } catch (err) {
      console.error('❌ Failed to load voice clones:', err);
      // Try localStorage as final fallback
      try {
        const localClones = localStorage.getItem('voice-clones');
        if (localClones) {
          const parsedClones = JSON.parse(localClones);
          const readyClones = parsedClones
            .filter(clone => clone.samples && clone.samples.length > 0)
            .map(clone => ({
              voice_id: clone.backendId || clone.id,
              id: clone.id,
              name: clone.name,
              status: clone.status || 'ready',
              samples_count: clone.samples ? clone.samples.length : 0,
              backend_synced: clone.backendSynced || false
            }));
          
          console.log('📋 Emergency fallback: loaded voice clones from localStorage:', readyClones.length);
          setVoiceClones(readyClones);
        } else {
          setVoiceClones([]);
        }
      } catch (fallbackErr) {
        console.error('❌ Final fallback failed:', fallbackErr);
        setVoiceClones([]);
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/conversation/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        // Set fallback analytics
        setAnalytics({
          total_conversations: 0,
          average_duration: 0
        });
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      // Set fallback analytics
      setAnalytics({
        total_conversations: 0,
        average_duration: 0
      });
    }
  };

  const addSpeaker = () => {
    const speakerNumber = Object.keys(speakerMappings).length + 1;
    const newSpeakerName = `Speaker ${speakerNumber}`;
    setSpeakerMappings(prev => ({
      ...prev,
      [newSpeakerName]: ''
    }));
  };

  const removeSpeaker = (speakerName: string) => {
    if (Object.keys(speakerMappings).length > 2) {
      setSpeakerMappings(prev => {
        const updated = { ...prev };
        delete updated[speakerName];
        return updated;
      });
    }
  };

  const updateSpeakerMapping = (oldName: string, newName: string, voiceId: string) => {
    setSpeakerMappings(prev => {
      const updated = { ...prev };
      if (oldName !== newName) {
        delete updated[oldName];
      }
      updated[newName] = voiceId;
      return updated;
    });
  };

  const testVoiceMapping = async (speakerName: string, voiceId: string) => {
    const voiceKey = `${speakerName}-${voiceId}`;
    const isCurrentlyTesting = testingVoices[voiceKey];
    
    if (isCurrentlyTesting) {
      // Stop current test
      console.log(`🛑 Stopping voice test for ${speakerName}`);
      
      // Stop any audio playback
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      
      // Stop Web Speech API
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      // Update button state
      setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
      return;
    }
    
    try {
      // Start testing - update button state
      setTestingVoices(prev => ({ ...prev, [voiceKey]: true }));
      
      // Stop any other currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
      
      // Stop any ongoing speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      // Create clean, brief test text using actual voice clone name
      const voiceClone = voiceClones.find(clone => (clone.voice_id || clone.id) === voiceId);
      const actualVoiceName = voiceClone ? voiceClone.name : voiceId.replace(/vibevoice-/g, '').replace(/[-_]/g, ' ').replace(/\d+/g, '').trim();
      const testText = `Hello! This is ${speakerName} testing the ${actualVoiceName} voice.`;
      
      console.log(`🎤 Testing voice mapping: ${speakerName} -> ${voiceId}`);
      console.log(`🧹 Actual voice name: "${actualVoiceName}"`);
      console.log(`📝 Test text: "${testText}"`);
      
      // Try backend TTS test first (for VibeVoice and custom voices)
      try {
        const response = await fetch('http://localhost:8001/api/v1/tts/test-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: testText,
            voice_id: voiceId,
            speaker_name: speakerName
          })
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          
          // Set as current audio for stopping
          setCurrentAudio(audio);
          
          audio.onplay = () => {
            console.log(`🎵 Playing backend voice test for ${speakerName} (${voiceId})`);
          };
          
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setCurrentAudio(null);
            setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
            console.log(`✅ Voice test completed for ${speakerName}`);
          };
          
          audio.onerror = () => {
            console.error(`❌ Voice test playback failed for ${speakerName}`);
            URL.revokeObjectURL(audioUrl);
            setCurrentAudio(null);
            setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
          };
          
          await audio.play();
          return;
        } else {
          console.log(`Backend voice test failed (${response.status}), trying Web Speech API fallback`);
        }
      } catch (backendError) {
        console.log('Backend voice test not available, trying Web Speech API fallback:', backendError);
      }
      
      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        // Wait for voices to load
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          await new Promise(resolve => {
            const loadVoices = () => {
              voices = window.speechSynthesis.getVoices();
              if (voices.length > 0) {
                window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
                resolve(undefined);
              }
            };
            window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
            setTimeout(() => {
              window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
              resolve(undefined);
            }, 1000);
          });
        }
        
        const utterance = new SpeechSynthesisUtterance(testText);
        
        // Try to find a suitable voice based on voice ID
        let targetVoice = null;
        if (voiceId.includes('alice') || voiceId.includes('female')) {
          targetVoice = voices.find(v => /female|woman|alice|aria|jenny|samantha/i.test(v.name));
        } else if (voiceId.includes('andrew') || voiceId.includes('male')) {
          targetVoice = voices.find(v => /male|man|andrew|alex|guy|brian/i.test(v.name));
        } else {
          // For custom voices, try to find best match or use default
          targetVoice = voices.find(v => v.default) || voices[0];
        }
        
        if (targetVoice) {
          utterance.voice = targetVoice;
          console.log(`🎵 Using system voice: ${targetVoice.name} for ${speakerName}`);
        } else {
          console.log(`🎵 Using default system voice for ${speakerName}`);
        }
        
        utterance.rate = 1.0;
        utterance.pitch = voiceId.includes('alice') ? 1.1 : voiceId.includes('andrew') ? 0.9 : 1.0;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
          console.log(`🎵 Testing ${speakerName} voice preview with Web Speech API...`);
        };
        
        utterance.onend = () => {
          setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
          console.log(`✅ Voice preview completed for ${speakerName}`);
        };
        
        utterance.onerror = (event) => {
          setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
          console.error(`❌ Voice preview failed for ${speakerName}:`, event.error);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
        console.error('Web Speech API not supported');
        alert('Voice preview not available - Web Speech API not supported in this browser');
      }
      
    } catch (error) {
      setTestingVoices(prev => ({ ...prev, [voiceKey]: false }));
      console.error('Voice test failed:', error);
      alert(`Failed to test voice for ${speakerName}. Please try again.`);
    }
  };

  const loadTemplate = (template: typeof conversationTemplates[0]) => {
    setScript(template.script);
    
    // Auto-detect speakers from the script
    const speakerMatches = template.script.match(/^([^:]+):/gm) || [];
    const uniqueSpeakers = Array.from(new Set(speakerMatches.map(match => match.replace(':', ''))));
    
    const newMappings: SpeakerMapping = {};
    uniqueSpeakers.forEach((speaker, index) => {
      newMappings[speaker.trim()] = speakerMappings[`Speaker ${index + 1}`] || '';
    });
    
    setSpeakerMappings(newMappings);
  };

  const generateConversation = async () => {
    if (!script.trim()) {
      setError('Please enter a conversation script');
      return;
    }

    // Validate speaker mappings
    const unmappedSpeakers = Object.entries(speakerMappings).filter(([_, voiceId]) => !voiceId);
    if (unmappedSpeakers.length > 0) {
      setError(`Please select voices for all speakers: ${unmappedSpeakers.map(([name]) => name).join(', ')}`);
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('script', script);
      formData.append('speaker_mapping', JSON.stringify(speakerMappings));
      formData.append('conversation_style', selectedStyle);
      formData.append('add_natural_interactions', addNaturalInteractions.toString());
      formData.append('include_background_sound', includeBackgroundSound.toString());
      formData.append('background_sound_volume', backgroundSoundVolume.toString());
      formData.append('emotional_intelligence', emotionalIntelligence.toString());

      const response = await fetch('http://localhost:8001/api/v1/conversation/create', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Generation failed: ${response.status}`);
      }

      // Extract metadata from headers
      const metadata: ConversationMetadata = {
        duration: parseFloat(response.headers.get('X-Conversation-Duration') || '0'),
        speakerCount: parseInt(response.headers.get('X-Speaker-Count') || '0'),
        wordCount: parseInt(response.headers.get('X-Word-Count') || '0'),
        interactionComplexity: parseFloat(response.headers.get('X-Interaction-Complexity') || '0'),
        emotionDistribution: JSON.parse(response.headers.get('X-Emotion-Distribution') || '{}'),
        conversationStyle: response.headers.get('X-Conversation-Style') || selectedStyle
      };

      setConversationMetadata(metadata);

      // Create audio blob and URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Clean up previous audio URL
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
      
      setGeneratedAudioUrl(audioUrl);
      
      // Reload analytics
      await loadAnalytics();
      
    } catch (err) {
      console.error('Conversation generation failed:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!generatedAudioUrl || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const downloadConversation = () => {
    if (generatedAudioUrl) {
      const a = document.createElement('a');
      a.href = generatedAudioUrl;
      a.download = `conversation_${selectedStyle}_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const clearHistory = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/conversation/clear-history', { method: 'POST' });
      if (response.ok) {
        await loadAnalytics();
      }
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Navigation Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Home className="w-5 h-5" />
                </div>
                <span className="font-medium">Home</span>
              </a>
              
              <a 
                href="/voice-clone" 
                className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="font-medium">Voice Clones</span>
              </a>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-bold text-gray-900">Multi-Speaker Engine</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-600" />
            Multi-Speaker Conversation Engine
          </h1>
          <p className="text-gray-600">Create dynamic conversations with emotion detection and natural speech patterns</p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Demo & Testing Features */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              🧪 Demo Features - Test Natural Interactions & Emotions
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-100 rounded-lg">
                <strong className="text-blue-800">📊 How to test features:</strong>
                <ul className="mt-2 space-y-1 text-blue-700">
                  <li>• <strong>Natural Interactions:</strong> Enable "Natural interactions & interruptions" - adds "Mm-hmm", "Right", "Really?" reactions</li>
                  <li>• <strong>Emotion Detection:</strong> Enable "Emotion detection & response" - detects emotions from text like "amazing!", "unfortunately", "what?!"</li>
                  <li>• <strong>Background Ambience:</strong> Enable for synthetic ambience (studio, cafe, office) - now with volume control! TTS also adds natural room tone.</li>
                  <li>• <strong>Conversation Styles:</strong> Try "Debate" (fast), "Podcast" (professional), "Casual" (relaxed)</li>
                </ul>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-2 bg-green-100 rounded border border-green-200">
                  <strong className="text-green-800">✨ Emotion Test Words:</strong>
                  <p className="text-green-700 text-xs mt-1">"Wow!", "Amazing!", "Unfortunately", "What?!", "Absolutely", "Um, well..."</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded border border-yellow-200">
                  <strong className="text-yellow-800">🎭 Try Different Styles:</strong>
                  <p className="text-yellow-700 text-xs mt-1">Podcast = professional, Debate = energetic, Casual = relaxed with interruptions</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Conversation Templates */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quick Templates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {conversationTemplates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => loadTemplate(template)}
                  className="p-3 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="font-medium text-gray-800">{template.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {template.script.split('\n\n')[0].substring(0, 50)}...
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Script Editor */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Conversation Script
            </h3>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Enter your conversation script here. Use format like:
              
Speaker 1: Hello, how are you today?
Speaker 2: I'm doing great, thanks for asking!"
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
              <span>{script.split(' ').filter(word => word.length > 0).length} words</span>
              <span>{script.split('\n\n').length} segments</span>
            </div>
          </div>

          {/* Speaker Configuration */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Speaker Voice Mapping
                <span className="text-sm text-gray-500 font-normal">({voiceClones.length} voices available)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadVoiceClones}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                  title="Refresh voice clones list"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
                <button
                  onClick={addSpeaker}
                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                >
                  Add Speaker
                </button>
              </div>
            </div>
            
            {/* Voice Selection Info */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600">🎤</span>
                <span className="text-blue-800 font-medium">Voice Selection Options</span>
              </div>
              <div className="text-blue-700 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span><strong>Custom Voice Clones:</strong></span>
                  <span className="font-mono">{voiceClones.length} available</span>
                </div>
                <div className="flex justify-between items-center">
                  <span><strong>Default VibeVoice:</strong></span>
                  <span className="font-mono text-green-600">✅ Always available</span>
                </div>
                {voiceClones.length === 0 ? (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                    <p className="text-yellow-800 text-xs mb-2">
                      <strong>No custom voice clones found.</strong> The system will use high-quality default VibeVoice speakers (Alice & Andrew) for multi-speaker conversations.
                    </p>
                    <a 
                      href="/voice-clone" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-900 underline"
                    >
                      🎙️ Create custom voice clones for personalized conversations
                    </a>
                  </div>
                ) : (
                  <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded">
                    <p className="text-green-800 text-xs">
                      <strong>✅ Voice clones ready!</strong> You can assign custom voices to speakers or use default VibeVoice as fallback.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Voice Clone Management Integration */}
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-purple-600">✨</span>
                  <span className="text-purple-800 font-medium">Custom Voice Clones</span>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href="/voice-clone" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                  >
                    🎤 Manage Voice Clones
                  </a>
                  <button
                    onClick={loadVoiceClones}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded hover:bg-purple-200 transition-colors flex items-center gap-1"
                    title="Refresh voice clones from voice clone page"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Sync
                  </button>
                </div>
              </div>
              <div className="text-purple-700 text-sm">
                {voiceClones.length > 0 ? (
                  <div className="space-y-2">
                    <p><strong>Available custom voices:</strong></p>
                    <div className="flex flex-wrap gap-2">
                      {voiceClones.map(clone => (
                        <span key={clone.voice_id || clone.id} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {clone.backend_synced ? '✅' : '⚠️'} {clone.name}
                          {clone.samples_count && <span className="text-purple-600">({clone.samples_count})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-purple-600 text-lg">🎙️</span>
                    <div>
                      <p className="font-medium mb-1">Create personalized voice clones for authentic multi-speaker conversations!</p>
                      <ul className="text-xs space-y-1 text-purple-600">
                        <li>• Record your own voice or others (with permission)</li>
                        <li>• Upload existing audio samples with transcripts</li>
                        <li>• Choose from 100+ professional voice library options</li>
                        <li>• Test and preview voices before using in conversations</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(speakerMappings).map(([speakerName, voiceId], index) => {
                const isVoiceSelected = !!voiceId;
                const isDefaultVoice = voiceId?.startsWith('vibevoice-');
                const isCustomVoice = voiceId && !isDefaultVoice;
                
                return (
                  <div key={index} className={`flex items-center gap-3 p-3 border rounded-lg ${
                    isCustomVoice ? 'border-green-300 bg-green-50' : 
                    isDefaultVoice ? 'border-blue-300 bg-blue-50' : 
                    'border-gray-200 bg-white'
                  }`}>
                  <input
                    type="text"
                    value={speakerName}
                    onChange={(e) => updateSpeakerMapping(speakerName, e.target.value, voiceId)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Speaker name"
                  />
                  <select
                    value={voiceId}
                    onChange={(e) => updateSpeakerMapping(speakerName, speakerName, e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      voiceId ? (voiceId.startsWith('vibevoice-') ? 'border-blue-300 bg-blue-50' : 'border-green-300 bg-green-50') : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select voice...</option>
                    
                    {/* Default VibeVoice Options (Always Available) */}
                    <optgroup label="🎙️ Default VibeVoice Speakers (High Quality)">
                      <option value="vibevoice-alice">🎤 Alice (Female, British) - VibeVoice Default</option>
                      <option value="vibevoice-andrew">🎤 Andrew (Male, American) - VibeVoice Default</option>
                      <option value="vibevoice-large-alice">⭐ Alice Large (Ultra Quality) - VibeVoice Large Model</option>
                    </optgroup>
                    
                    {/* Custom Voice Clones (If Available) */}
                    {voiceClones.length > 0 && (
                      <optgroup label="✨ Your Custom Voice Clones">
                        {voiceClones.map((clone) => {
                          const syncStatus = clone.backend_synced ? '✅' : '⚠️';
                          const sampleInfo = clone.samples_count ? ` (${clone.samples_count} samples)` : '';
                          return (
                            <option key={clone.voice_id || clone.id} value={clone.voice_id || clone.id}>
                              {syncStatus} {clone.name}{sampleInfo}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>
                  
                  {/* Voice Preview Button */}
                  {voiceId && (() => {
                    const voiceKey = `${speakerName}-${voiceId}`;
                    const isCurrentlyTesting = testingVoices[voiceKey];
                    
                    return (
                      <button
                        onClick={() => testVoiceMapping(speakerName, voiceId)}
                        className={`px-3 py-2 rounded transition-colors flex items-center gap-1 text-sm ${
                          isCurrentlyTesting 
                            ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        title={isCurrentlyTesting ? `Stop testing ${voiceId} voice` : `Test ${voiceId} voice`}
                      >
                        {isCurrentlyTesting ? (
                          <>
                            <Square className="w-3 h-3" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Test
                          </>
                        )}
                      </button>
                    );
                  })()}
                  
                  {/* Remove Speaker Button */}
                  {Object.keys(speakerMappings).length > 2 && (
                    <button
                      onClick={() => removeSpeaker(speakerName)}
                      className="px-3 py-2 text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 text-sm"
                      title="Remove this speaker"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generation Controls */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Generation Controls
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conversation Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversation Style
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {conversationStyles.map((style) => (
                    <option key={style.value} value={style.value}>
                      {style.name}
                    </option>
                  ))}
                </select>
                {conversationStyles.find(s => s.value === selectedStyle) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {conversationStyles.find(s => s.value === selectedStyle)?.description}
                  </p>
                )}
              </div>

              {/* Advanced Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Advanced Settings
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={addNaturalInteractions}
                      onChange={(e) => setAddNaturalInteractions(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm">Natural interactions & interruptions</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={emotionalIntelligence}
                      onChange={(e) => setEmotionalIntelligence(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm">Emotion detection & response</span>
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeBackgroundSound}
                        onChange={(e) => setIncludeBackgroundSound(e.target.checked)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm">Background ambience</span>
                    </label>
                    {includeBackgroundSound && (
                      <div className="ml-6 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Volume:</span>
                          <span className="text-xs text-purple-600 font-medium">{backgroundSoundVolume}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={backgroundSoundVolume}
                          onChange={(e) => setBackgroundSoundVolume(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${backgroundSoundVolume}%, #e5e7eb ${backgroundSoundVolume}%, #e5e7eb 100%)`
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Subtle</span>
                          <span>Prominent</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="mt-6">
              <button
                onClick={generateConversation}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-transparent hover:border-white/20 animate-pulse hover:animate-none"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span className="text-lg">🎭 Generating Conversation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <span className="text-lg">🚀 Generate Dynamic Conversation</span>
                    <Wand2 className="w-6 h-6" />
                  </>
                )}
              </button>
              <div className="text-center mt-2 text-sm text-gray-500">
                ✨ Create realistic multi-speaker conversations with emotion & natural speech patterns
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Audio Player */}
          {generatedAudioUrl && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Generated Conversation
              </h3>
              
              <audio
                ref={audioRef}
                src={generatedAudioUrl}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="hidden"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayback}
                    className="flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <button
                    onClick={stopPlayback}
                    className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </div>
                
                <button
                  onClick={downloadConversation}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Metadata & Analytics */}
        <div className="space-y-6">
          
          {/* Conversation Metadata */}
          {conversationMetadata && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Conversation Stats
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{conversationMetadata.duration.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Speakers:</span>
                  <span className="font-medium">{conversationMetadata.speakerCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Words:</span>
                  <span className="font-medium">{conversationMetadata.wordCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Complexity:</span>
                  <span className="font-medium">{(conversationMetadata.interactionComplexity * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Style:</span>
                  <span className="font-medium capitalize">{conversationMetadata.conversationStyle}</span>
                </div>
              </div>

              {/* Emotion Distribution */}
              {Object.keys(conversationMetadata.emotionDistribution).length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Emotion Distribution</h4>
                  <div className="space-y-1">
                    {Object.entries(conversationMetadata.emotionDistribution)
                      .filter(([_, score]) => score > 0)
                      .sort(([_, a], [__, b]) => b - a)
                      .map(([emotion, score]) => (
                        <div key={emotion} className="flex justify-between items-center text-sm">
                          <span className="capitalize text-gray-600">{emotion}:</span>
                          <span className="font-medium">{(score * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Available Emotions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Supported Emotions
            </h3>
            <div className="space-y-2">
              {emotions.slice(0, 6).map((emotion) => (
                <div key={emotion.value} className="text-sm">
                  <div className="font-medium capitalize text-gray-700">{emotion.name}</div>
                  <div className="text-gray-500 text-xs">{emotion.description}</div>
                </div>
              ))}
              {emotions.length > 6 && (
                <div className="text-xs text-gray-400">
                  +{emotions.length - 6} more emotions available
                </div>
              )}
            </div>
          </div>

          {/* Global Analytics */}
          {analytics && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Usage Analytics
                </h3>
                <button
                  onClick={clearHistory}
                  className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 border border-gray-300 rounded"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Conversations:</span>
                  <span className="font-medium">{analytics.total_conversations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Duration:</span>
                  <span className="font-medium">{analytics.average_duration?.toFixed(1) || 0}s</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </div>
  );
};

export default ConversationEngine;