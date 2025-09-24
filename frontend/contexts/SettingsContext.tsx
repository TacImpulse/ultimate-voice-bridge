'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface AudioSettings {
  inputDeviceId: string
  outputDeviceId: string
  recordingQuality: 'low' | 'medium' | 'high'
  noiseReduction: boolean
  echoCancellation: boolean
  autoGainControl: boolean
}

export interface TTSSettings {
  voice: string
  speed: number
  pitch: number
  volume: number
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  fontFamily: string
  showAnimations: boolean
  compactMode: boolean
  showTimestamps: boolean
}

export interface PrivacySettings {
  saveHistory: boolean
  saveFiles: boolean
  maxHistoryEntries: number
  autoDeleteAfterDays: number
  enableAnalytics: boolean
}

export interface KeyboardShortcuts {
  record: string
  stop: string
  process: string
  clear: string
  paste: string
  toggleHistory: string
  toggleSettings: string
  toggleTheme: string
}

export interface AppSettings {
  audio: AudioSettings
  tts: TTSSettings
  ui: UISettings
  privacy: PrivacySettings
  shortcuts: KeyboardShortcuts
  autoSave: boolean
  connectionRetries: number
  requestTimeout: number
}

const defaultSettings: AppSettings = {
  audio: {
    inputDeviceId: 'default',
    outputDeviceId: 'default',
    recordingQuality: 'high',
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true
  },
  tts: {
    voice: 'en-US-AvaNeural',
    speed: 1.0,
    pitch: 1.0,
    volume: 1.0
  },
  ui: {
    theme: 'auto',
    fontSize: 'medium',
    fontFamily: 'Inter, sans-serif',
    showAnimations: true,
    compactMode: false,
    showTimestamps: true
  },
  privacy: {
    saveHistory: true,
    saveFiles: false,
    maxHistoryEntries: 50,
    autoDeleteAfterDays: 30,
    enableAnalytics: false
  },
  shortcuts: {
    record: 'Ctrl+R',
    stop: 'Escape',
    process: 'Ctrl+Enter',
    clear: 'Ctrl+K',
    paste: 'Ctrl+V',
    toggleHistory: 'Ctrl+H',
    toggleSettings: 'Ctrl+,',
    toggleTheme: 'Ctrl+Shift+T'
  },
  autoSave: true,
  connectionRetries: 3,
  requestTimeout: 30000
}

interface SettingsContextType {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
  exportSettings: () => string
  importSettings: (settingsJson: string) => boolean
  isLoading: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('voice-bridge-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        // Merge with defaults to handle new settings added in updates
        setSettings(prev => ({
          ...prev,
          ...parsed,
          audio: { ...prev.audio, ...parsed.audio },
          tts: { ...prev.tts, ...parsed.tts },
          ui: { ...prev.ui, ...parsed.ui },
          privacy: { ...prev.privacy, ...parsed.privacy },
          shortcuts: { ...prev.shortcuts, ...parsed.shortcuts }
        }))
        console.log('🔧 Settings loaded from localStorage')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('voice-bridge-settings', JSON.stringify(settings))
      console.log('💾 Settings saved to localStorage')
    }
  }, [settings, isLoading])

  // Apply theme changes to document
  useEffect(() => {
    const applyTheme = () => {
      const html = document.documentElement
      
      if (settings.ui.theme === 'dark') {
        html.classList.add('dark')
      } else if (settings.ui.theme === 'light') {
        html.classList.remove('dark')
      } else { // auto
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          html.classList.add('dark')
        } else {
          html.classList.remove('dark')
        }
      }
    }

    applyTheme()

    // Listen for system theme changes in auto mode
    if (settings.ui.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addListener(applyTheme)
      return () => mediaQuery.removeListener(applyTheme)
    }
  }, [settings.ui.theme])

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...updates,
      // Handle nested object updates
      ...(updates.audio && { audio: { ...prev.audio, ...updates.audio } }),
      ...(updates.tts && { tts: { ...prev.tts, ...updates.tts } }),
      ...(updates.ui && { ui: { ...prev.ui, ...updates.ui } }),
      ...(updates.privacy && { privacy: { ...prev.privacy, ...updates.privacy } }),
      ...(updates.shortcuts && { shortcuts: { ...prev.shortcuts, ...updates.shortcuts } })
    }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
    localStorage.removeItem('voice-bridge-settings')
    console.log('🔄 Settings reset to defaults')
  }

  const exportSettings = (): string => {
    return JSON.stringify(settings, null, 2)
  }

  const importSettings = (settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson)
      // Validate imported settings structure
      if (typeof imported === 'object' && imported !== null) {
        setSettings(prev => ({
          ...defaultSettings, // Start with defaults
          ...imported,
          // Ensure nested objects exist
          audio: { ...defaultSettings.audio, ...imported.audio },
          tts: { ...defaultSettings.tts, ...imported.tts },
          ui: { ...defaultSettings.ui, ...imported.ui },
          privacy: { ...defaultSettings.privacy, ...imported.privacy },
          shortcuts: { ...defaultSettings.shortcuts, ...imported.shortcuts }
        }))
        console.log('📥 Settings imported successfully')
        return true
      }
    } catch (error) {
      console.error('Error importing settings:', error)
    }
    return false
  }

  const contextValue: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
    isLoading
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}