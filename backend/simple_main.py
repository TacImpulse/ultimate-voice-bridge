"""
Ultimate Voice Bridge - Simplified Backend
A working version to get started quickly
"""

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Ultimate Voice Bridge API",
    description="State-of-the-art STT-TTS-LLM bridge (Simplified Version)",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "🎙️ Ultimate Voice Bridge API",
        "version": "1.0.0",
        "description": "State-of-the-art STT-TTS-LLM bridge",
        "status": "ready",
        "gpu_available": check_gpu_available()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        gpu_info = get_gpu_info()
        return {
            "status": "healthy",
            "services": {
                "api": "healthy",
                "gpu": "available" if gpu_info["cuda_available"] else "unavailable"
            },
            "gpu_info": gpu_info,
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy", 
            "error": str(e),
            "version": "1.0.0"
        }

@app.post("/api/v1/test-upload")
async def test_upload(audio: UploadFile = File(...)):
    """Test endpoint for file uploads"""
    try:
        # Read the file
        content = await audio.read()
        
        return {
            "message": "File uploaded successfully!",
            "filename": audio.filename,
            "content_type": audio.content_type,
            "size": len(content),
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Upload test failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "status": "failed"}
        )

def check_gpu_available():
    """Check if GPU is available"""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False

def get_gpu_info():
    """Get detailed GPU information"""
    try:
        import torch
        if torch.cuda.is_available():
            return {
                "cuda_available": True,
                "device_name": torch.cuda.get_device_name(0),
                "memory_gb": torch.cuda.get_device_properties(0).total_memory // 1024**3,
                "device_count": torch.cuda.device_count()
            }
        else:
            return {"cuda_available": False}
    except ImportError:
        return {"cuda_available": False, "error": "PyTorch not available"}

if __name__ == "__main__":
    logger.info("🚀 Starting Ultimate Voice Bridge (Simplified)...")
    logger.info(f"🎯 GPU Available: {check_gpu_available()}")
    
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )