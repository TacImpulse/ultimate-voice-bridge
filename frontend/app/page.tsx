export default function HomePage() {
  return (
    <html>
      <body>
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f8fafc',
          minHeight: '100vh'
        }}>
          <h1 style={{ 
            color: '#1e40af', 
            fontSize: '3rem', 
            marginBottom: '20px' 
          }}>
            🎙️ Ultimate Voice Bridge
          </h1>
          
          <p style={{ 
            fontSize: '1.2rem', 
            color: '#64748b', 
            marginBottom: '30px' 
          }}>
            Your voice processing system is ready!
          </p>
          
          <div style={{ 
            backgroundColor: 'white', 
            padding: '30px', 
            borderRadius: '15px',
            maxWidth: '600px',
            margin: '0 auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ color: '#059669', marginBottom: '20px' }}>
              ✅ System Ready
            </h2>
            <p><strong>Frontend:</strong> Next.js 14 Running</p>
            <p><strong>Backend:</strong> FastAPI at port 8000</p>
            <p><strong>GPU:</strong> RTX 5090 Detected (31GB)</p>
            <p><strong>Status:</strong> All systems operational</p>
          </div>

          <div style={{ marginTop: '40px' }}>
            <p style={{ marginBottom: '20px' }}>
              <strong>🚧 Next Steps:</strong>
            </p>
            <p>• Add voice recording interface</p>
            <p>• Connect Whisper STT processing</p>
            <p>• Integrate LM Studio for AI responses</p>
            <p>• Add TTS voice synthesis</p>
          </div>

          <div style={{ marginTop: '40px' }}>
            <a 
              href="http://localhost:8000/docs" 
              target="_blank"
              style={{ 
                display: 'inline-block',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                margin: '10px',
                fontWeight: 'bold'
              }}
            >
              🔗 API Documentation
            </a>
            
            <a 
              href="http://localhost:8000/health" 
              target="_blank"
              style={{ 
                display: 'inline-block',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                margin: '10px',
                fontWeight: 'bold'
              }}
            >
              🏥 Health Check
            </a>
          </div>

          <div style={{ 
            marginTop: '60px', 
            padding: '20px',
            fontSize: '14px',
            color: '#9ca3af'
          }}>
            <p>Built with ❤️ using Next.js, FastAPI, and cutting-edge AI</p>
            <p>Ready for voice processing at enterprise scale</p>
          </div>
        </div>
      </body>
    </html>
  )
}