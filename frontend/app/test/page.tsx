export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎉 Frontend Test Page</h1>
      <p>If you can see this, Next.js is working!</p>
      <p>Time: {new Date().toLocaleString()}</p>
      <a href="/">Back to Home</a>
    </div>
  )
}