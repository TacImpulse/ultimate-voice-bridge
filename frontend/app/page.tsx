'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface HealthStatus {
  status: string
  services: {
    stt: string
    tts: string
    llm: string
    gpu_acceleration: string
    vibevoice_gpu: string
  }
  version: string
}

interface SystemStats {
  gpu: {
    name: string
    memory: string
    status: string
  }
  services: {
    total: number
    healthy: number
  }
}

export default function HomePage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch('http://localhost:8001/health')
        const data = await response.json()
        setHealthStatus(data)
        
        // Calculate system stats
        const services = Object.values(data.services)
        const healthyCount = services.filter(status => status === 'healthy').length
        
        setSystemStats({
          gpu: {
            name: "NVIDIA GeForce RTX 5090",
            memory: "31.8GB VRAM", 
            status: data.services.gpu_acceleration === 'healthy' ? 'Active' : 'Unavailable'
          },
          services: {
            total: services.length,
            healthy: healthyCount
          }
        })
      } catch (error) {
        console.error('Failed to fetch health status:', error)
        setSystemStats({
          gpu: { name: "Detection Failed", memory: "Unknown", status: "Offline" },
          services: { total: 0, healthy: 0 }
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchHealthStatus()
    const interval = setInterval(fetchHealthStatus, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'degraded': return 'text-yellow-400'
      case 'unhealthy': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢'
      case 'degraded': return '🟡'
      case 'unhealthy': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        >
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-16 pb-8"
        >
          <motion.div 
            className="inline-block mb-6"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <span className="text-8xl filter drop-shadow-lg">🎙️</span>
          </motion.div>
          
          <motion.h1 
            className="text-6xl md:text-7xl font-black bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 bg-clip-text text-transparent mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Ultimate Voice Bridge
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            🚀 Enterprise-grade voice processing powered by <span className="text-green-400 font-bold">RTX 5090</span>
          </motion.p>
        </motion.div>

        {/* System Status Dashboard */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12"
          >
            {/* GPU Status */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-green-400">🎮 GPU Acceleration</h3>
                <span className={`text-2xl ${systemStats?.gpu.status === 'Active' ? 'animate-pulse' : ''}`}>
                  {systemStats?.gpu.status === 'Active' ? '🚀' : '💻'}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-gray-300">
                  <span className="font-semibold">GPU:</span> {systemStats?.gpu.name || 'Loading...'}
                </p>
                <p className="text-gray-300">
                  <span className="font-semibold">Memory:</span> {systemStats?.gpu.memory || 'Loading...'}
                </p>
                <p className="text-gray-300">
                  <span className="font-semibold">Status:</span> 
                  <span className={`ml-2 font-bold ${
                    systemStats?.gpu.status === 'Active' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {systemStats?.gpu.status || 'Loading...'}
                  </span>
                </p>
              </div>
            </div>

            {/* Services Status */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-400">⚙️ Services</h3>
                <span className="text-2xl">
                  {isLoading ? '⏳' : systemStats?.services.healthy === systemStats?.services.total ? '✅' : '⚠️'}
                </span>
              </div>
              <div className="space-y-2">
                {healthStatus ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">STT (Whisper):</span>
                      <span className={getStatusColor(healthStatus.services.stt)}>
                        {getStatusIcon(healthStatus.services.stt)} {healthStatus.services.stt}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">TTS (Coqui):</span>
                      <span className={getStatusColor(healthStatus.services.tts)}>
                        {getStatusIcon(healthStatus.services.tts)} {healthStatus.services.tts}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">LLM Studio:</span>
                      <span className={getStatusColor(healthStatus.services.llm)}>
                        {getStatusIcon(healthStatus.services.llm)} {healthStatus.services.llm}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">GPU Accel:</span>
                      <span className={getStatusColor(healthStatus.services.gpu_acceleration)}>
                        {getStatusIcon(healthStatus.services.gpu_acceleration)} {healthStatus.services.gpu_acceleration}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">VibeVoice:</span>
                      <span className={getStatusColor(healthStatus.services.vibevoice_gpu)}>
                        {getStatusIcon(healthStatus.services.vibevoice_gpu)} {healthStatus.services.vibevoice_gpu}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    {isLoading ? '🔄 Loading services...' : '❌ Failed to load status'}
                  </div>
                )}
              </div>
            </div>

            {/* Overall System Health */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-purple-400">🏥 System Health</h3>
                <motion.span 
                  className="text-3xl"
                  animate={healthStatus?.status === 'healthy' ? { 
                    scale: [1, 1.2, 1], 
                    rotate: [0, 10, -10, 0] 
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {healthStatus?.status === 'healthy' ? '💚' : 
                   healthStatus?.status === 'degraded' ? '💛' : '❤️'}
                </motion.span>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold mb-2 ${
                  healthStatus?.status === 'healthy' ? 'text-green-400' : 
                  healthStatus?.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {systemStats?.services.healthy || 0}/{systemStats?.services.total || 5}
                </div>
                <p className="text-gray-300 text-sm">Services Healthy</p>
                <div className={`mt-3 px-4 py-2 rounded-full text-sm font-bold ${
                  healthStatus?.status === 'healthy' ? 'bg-green-500/20 text-green-400' : 
                  healthStatus?.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {healthStatus?.status?.toUpperCase() || 'LOADING'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {[
              {
                icon: '🎤',
                title: 'Voice Recording',
                desc: 'Real-time STT with GPU acceleration',
                color: 'from-red-500 to-pink-500',
                href: '/voice'
              },
              {
                icon: '🎭',
                title: 'Voice Cloning',
                desc: 'VibeVoice-powered voice synthesis',
                color: 'from-purple-500 to-indigo-500',
                href: '/voice-clone'
              },
              {
                icon: '🧠',
                title: 'AI Chat',
                desc: 'LM Studio LLM integration',
                color: 'from-blue-500 to-cyan-500',
                href: '/test'
              },
              {
                icon: '📊',
                title: 'API Docs',
                desc: 'FastAPI interactive documentation',
                color: 'from-green-500 to-emerald-500',
                href: 'http://localhost:8001/docs',
                external: true
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group"
              >
                {feature.external ? (
                  <a
                    href={feature.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block p-6 bg-gradient-to-br ${feature.color} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105`}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/90 text-sm">{feature.desc}</p>
                  </a>
                ) : (
                  <Link
                    href={feature.href}
                    className={`block p-6 bg-gradient-to-br ${feature.color} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform group-hover:scale-105`}
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/90 text-sm">{feature.desc}</p>
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Tech Stack */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30"
          >
            <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              🚀 Powered by Cutting-Edge Technology
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                { name: 'Next.js 14', emoji: '⚛️', color: 'text-blue-400' },
                { name: 'FastAPI', emoji: '⚡', color: 'text-green-400' },
                { name: 'RTX 5090', emoji: '🎮', color: 'text-purple-400' },
                { name: 'Whisper AI', emoji: '🎤', color: 'text-red-400' },
                { name: 'VibeVoice', emoji: '🎭', color: 'text-yellow-400' },
                { name: 'LM Studio', emoji: '🧠', color: 'text-cyan-400' }
              ].map((tech, index) => (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className="text-center p-4 rounded-xl bg-gray-700/30 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300"
                >
                  <div className="text-3xl mb-2">{tech.emoji}</div>
                  <div className={`text-sm font-semibold ${tech.color}`}>{tech.name}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center pb-16"
        >
          <div className="max-w-2xl mx-auto px-4">
            <p className="text-gray-400 mb-4">
              Built with ❤️ for enterprise-scale voice processing
            </p>
            <div className="flex justify-center space-x-4 text-sm text-gray-500">
              <span>🔬 Research Ready</span>
              <span>•</span>
              <span>🏢 Production Scale</span>
              <span>•</span>
              <span>🚀 RTX 5090 Optimized</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
