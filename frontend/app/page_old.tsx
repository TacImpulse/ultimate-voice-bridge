'use client'

export default function HomePage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#2563eb', fontSize: '3rem', marginBottom: '20px' }}>
        🎙️ Ultimate Voice Bridge
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>
        State-of-the-art STT-TTS-LLM voice bridge with real-time voice processing
      </p>
      
      <div style={{ 
        backgroundColor: '#f0f9ff', 
        padding: '20px', 
        borderRadius: '10px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2>🎯 System Status</h2>
        <p>✅ Frontend: Running on Next.js 14</p>
        <p>✅ Backend: Ready at http://localhost:8000</p>
        <p>🚀 Your RTX 5090 is detected and ready!</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>🚧 Coming Soon:</h3>
        <p>Voice recording, real-time processing, and full AI pipeline!</p>
      </div>

      <div style={{ marginTop: '40px' }}>
        <a 
          href="http://localhost:8000/docs" 
          target="_blank"
          style={{ 
            color: '#2563eb', 
            textDecoration: 'underline',
            marginRight: '20px'
          }}
        >
          API Documentation
        </a>
        <a 
          href="/test"
          style={{ 
            color: '#2563eb', 
            textDecoration: 'underline'
          }}
        >
          Test Page
        </a>
      </div>
    </div>
  )
}