'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '@/contexts/SettingsContext'
import { useToastHelpers } from '@/contexts/ToastContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useSettings()
  const toast = useToastHelpers()
  const [activeTab, setActiveTab] = useState<'general' | 'audio' | 'voice' | 'privacy' | 'shortcuts'>('general')
  const [audioDevices, setAudioDevices] = useState<{ input: MediaDeviceInfo[], output: MediaDeviceInfo[] }>({ input: [], output: [] })

  // Load available audio devices
  useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const input = devices.filter(device => device.kind === 'audioinput')
        const output = devices.filter(device => device.kind === 'audiooutput')
        setAudioDevices({ input, output })
      }).catch(console.error)
    }
  }, [isOpen])

  const tabs = [
    { id: 'general' as const, label: '🎨 General', icon: '⚙️' },
    { id: 'audio' as const, label: '🎤 Audio', icon: '🔊' },
    { id: 'voice' as const, label: '🗣️ Voice', icon: '🎙️' },
    { id: 'privacy' as const, label: '🔒 Privacy', icon: '🛡️' },
    { id: 'shortcuts' as const, label: '⌨️ Shortcuts', icon: '🚀' }
  ]

  const handleExportSettings = () => {
    const settingsJson = exportSettings()
    const blob = new Blob([settingsJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `voice-bridge-settings-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Settings Exported', 'Settings have been saved to your downloads folder')
  }

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        if (importSettings(content)) {
          toast.success('Settings Imported', 'Your settings have been successfully imported')
        } else {
          toast.error('Import Failed', 'The settings file appears to be invalid')
        }
      } catch (error) {
        toast.error('Import Error', 'Failed to read the settings file')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
      resetSettings()
      toast.info('Settings Reset', 'All settings have been restored to defaults')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Settings
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Customize your Voice Bridge experience
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="h-6 w-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex h-[70vh]">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Actions */}
              <div className="mt-8 space-y-2">
                <button
                  onClick={handleExportSettings}
                  className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  💾 Export Settings
                </button>
                <label className="w-full block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportSettings}
                    className="hidden"
                  />
                  <div className="w-full px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer text-center">
                    📥 Import Settings
                  </div>
                </label>
                <button
                  onClick={handleResetSettings}
                  className="w-full px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  🔄 Reset to Default
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">General Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Theme
                      </label>
                      <select
                        value={settings.ui.theme}
                        onChange={(e) => updateSettings({ ui: { ...settings.ui, theme: e.target.value as any } })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="auto">🌓 Auto (System)</option>
                        <option value="light">☀️ Light</option>
                        <option value="dark">🌙 Dark</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Font Size
                      </label>
                      <select
                        value={settings.ui.fontSize}
                        onChange={(e) => updateSettings({ ui: { ...settings.ui, fontSize: e.target.value as any } })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="small">📝 Small</option>
                        <option value="medium">📄 Medium</option>
                        <option value="large">📰 Large</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Show Animations
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Enable smooth transitions and effects
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.ui.showAnimations}
                          onChange={(e) => updateSettings({ ui: { ...settings.ui, showAnimations: e.target.checked } })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Auto-save
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Automatically save your work
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.autoSave}
                          onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audio Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Input Device (Microphone)
                      </label>
                      <select
                        value={settings.audio.inputDeviceId}
                        onChange={(e) => updateSettings({ audio: { ...settings.audio, inputDeviceId: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="default">🎤 Default Microphone</option>
                        {audioDevices.input.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            🎙️ {device.label || `Microphone ${device.deviceId.substr(0, 8)}...`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recording Quality
                      </label>
                      <select
                        value={settings.audio.recordingQuality}
                        onChange={(e) => updateSettings({ audio: { ...settings.audio, recordingQuality: e.target.value as any } })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="low">📡 Low (8kHz)</option>
                        <option value="medium">📶 Medium (16kHz)</option>
                        <option value="high">📶 High (44kHz)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'noiseReduction', label: 'Noise Reduction', desc: 'Reduce background noise' },
                        { key: 'echoCancellation', label: 'Echo Cancellation', desc: 'Cancel audio echoes' },
                        { key: 'autoGainControl', label: 'Auto Gain Control', desc: 'Automatically adjust input levels' }
                      ].map(setting => (
                        <div key={setting.key} className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {setting.label}
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {setting.desc}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.audio[setting.key as keyof typeof settings.audio] as boolean}
                              onChange={(e) => updateSettings({ 
                                audio: { 
                                  ...settings.audio, 
                                  [setting.key]: e.target.checked 
                                } 
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Voice & TTS Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        TTS Voice
                      </label>
                      <select
                        value={settings.tts.voice}
                        onChange={(e) => updateSettings({ tts: { ...settings.tts, voice: e.target.value } })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="en-US-AvaNeural">👩 Ava (US English)</option>
                        <option value="en-US-BrianNeural">👨 Brian (US English)</option>
                        <option value="en-GB-SoniaNeural">👩 Sonia (UK English)</option>
                        <option value="en-AU-NatashaNeural">👩 Natasha (Australian)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Speech Speed: {settings.tts.speed.toFixed(1)}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={settings.tts.speed}
                        onChange={(e) => updateSettings({ tts: { ...settings.tts, speed: parseFloat(e.target.value) } })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Slow</span>
                        <span>Normal</span>
                        <span>Fast</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Volume: {Math.round(settings.tts.volume * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={settings.tts.volume}
                        onChange={(e) => updateSettings({ tts: { ...settings.tts, volume: parseFloat(e.target.value) } })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Privacy Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Save Conversation History
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Store conversations locally for review
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.saveHistory}
                          onChange={(e) => updateSettings({ privacy: { ...settings.privacy, saveHistory: e.target.checked } })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Maximum History Entries: {settings.privacy.maxHistoryEntries}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        step="10"
                        value={settings.privacy.maxHistoryEntries}
                        onChange={(e) => updateSettings({ privacy: { ...settings.privacy, maxHistoryEntries: parseInt(e.target.value) } })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>10</span>
                        <span>100</span>
                        <span>200</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h3>
                  
                  <div className="space-y-4">
                    {Object.entries(settings.shortcuts).map(([key, shortcut]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                        </div>
                        <div className="px-3 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-sm font-mono">
                          {shortcut}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 Keyboard shortcuts are currently view-only. Customization coming in a future update!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Settings are automatically saved
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default SettingsModal