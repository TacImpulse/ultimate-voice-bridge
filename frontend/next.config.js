/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_NAME: 'Ultimate Voice Bridge',
    NEXT_PUBLIC_API_URL: 'http://localhost:8000',
  },
  images: {
    domains: ['localhost'],
  },
  
  // Fix Windows watchpack errors by excluding system files
  webpack: (config, { dev, isServer }) => {
    // Only apply this in development mode
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        // Exclude common Windows system files that cause watchpack errors
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          // Windows system files - be very specific about C: drive
          'C:/pagefile.sys',
          'C:/hiberfil.sys', 
          'C:/swapfile.sys',
          'C:\\pagefile.sys',
          'C:\\hiberfil.sys',
          'C:\\swapfile.sys',
          '**/pagefile.sys',
          '**/hiberfil.sys',
          '**/swapfile.sys',
          '**/System Volume Information/**',
          '**/$RECYCLE.BIN/**',
          '**/Recovery/**',
          '**/Windows/**',
          '**/Program Files/**',
          '**/Program Files (x86)/**',
          '**/ProgramData/**',
          // Additional Windows system file patterns
          '**/*.sys',
          '**/*.tmp',
          '**/Temp/**'
        ]
      }
    }
    return config
  },
  
  // Additional optimizations
  experimental: {
    // Reduce memory usage and improve performance
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', '@heroicons/react']
  },
  
  // Ensure CSS is properly handled
  poweredByHeader: false,
  compress: true,
  generateEtags: false,

  // Improve build performance
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  }
}

module.exports = nextConfig
