import VoiceRecorder from '../../components/VoiceRecorder'
import { MicrophoneIcon, UserIcon } from '@heroicons/react/24/outline'

export default function VoicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      
      {/* Navigation Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <span className="text-lg">🏠</span>
                </div>
                <span className="font-medium">Home</span>
              </a>
              
              <a 
                href="/voice-clone" 
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors"
              >
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <UserIcon className="h-5 w-5" />
                </div>
                <span className="font-medium">Voice Clone Studio</span>
              </a>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <MicrophoneIcon className="h-5 w-5 text-red-600" />
              </div>
              <span className="font-bold text-gray-900 dark:text-gray-100">Voice Recorder</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <VoiceRecorder />
      </div>
    </div>
  )
}
