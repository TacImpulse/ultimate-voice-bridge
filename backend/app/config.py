"""
Application configuration using Pydantic Settings
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    app_name: str = Field(default="Ultimate Voice Bridge", env="NEXT_PUBLIC_APP_NAME")
    debug: bool = Field(default=True, env="DEBUG")
    reload: bool = Field(default=True, env="RELOAD")
    
    # Server
    backend_host: str = Field(default="0.0.0.0", env="BACKEND_HOST")
    backend_port: int = Field(default=8001, env="BACKEND_PORT")
    secret_key: str = Field(default="your-super-secret-key-change-this", env="SECRET_KEY")
    
    # Database
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    database_url: str = Field(default="sqlite:///./voice_bridge.db", env="DATABASE_URL")
    
    # AI Services
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    
    # LM Studio Configuration
    lm_studio_base_url: str = Field(default="http://localhost:1234/v1", env="LM_STUDIO_BASE_URL")
    lm_studio_api_key: str = Field(default="lm-studio", env="LM_STUDIO_API_KEY")
    
    # Whisper Configuration
    whisper_model: str = Field(default="base", env="WHISPER_MODEL")
    whisper_device: str = Field(default="cpu", env="WHISPER_DEVICE")  # cpu, cuda
    whisper_language: str = Field(default="auto", env="WHISPER_LANGUAGE")
    
    # TTS Configuration
    tts_model: str = Field(default="tts_models/en/ljspeech/tacotron2-DDC", env="TTS_MODEL")
    tts_vocoder: str = Field(default="vocoder_models/en/ljspeech/hifigan_v2", env="TTS_VOCODER")
    tts_speaker_id: int = Field(default=0, env="TTS_SPEAKER_ID")
    enable_voice_cloning: bool = Field(default=False, env="ENABLE_VOICE_CLONING")
    
    # Audio Configuration
    max_audio_duration: int = Field(default=300, env="MAX_AUDIO_DURATION")  # seconds
    audio_sample_rate: int = Field(default=16000, env="AUDIO_SAMPLE_RATE")
    audio_chunk_size: int = Field(default=1024, env="AUDIO_CHUNK_SIZE")
    
    # Security Configuration
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        env="CORS_ORIGINS"
    )
    allowed_hosts: List[str] = Field(
        default=["localhost", "127.0.0.1"],
        env="ALLOWED_HOSTS"
    )
    
    # Logging Configuration
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    enable_performance_logging: bool = Field(default=True, env="ENABLE_PERFORMANCE_LOGGING")
    
    # Feature Flags
    enable_real_time_stt: bool = Field(default=True, env="ENABLE_REAL_TIME_STT")
    enable_streaming_tts: bool = Field(default=True, env="ENABLE_STREAMING_TTS")
    enable_voice_activity_detection: bool = Field(default=True, env="ENABLE_VOICE_ACTIVITY_DETECTION")
    enable_noise_reduction: bool = Field(default=True, env="ENABLE_NOISE_REDUCTION")
    
    # Rate Limiting
    rate_limit_requests_per_minute: int = Field(default=60, env="RATE_LIMIT_REQUESTS_PER_MINUTE")
    rate_limit_concurrent_sessions: int = Field(default=10, env="RATE_LIMIT_CONCURRENT_SESSIONS")
    
    # RTX 5090 GPU Acceleration Configuration
    gpu_acceleration_enabled: bool = Field(default=True, env="GPU_ACCELERATION_ENABLED")
    gpu_device_id: int = Field(default=0, env="GPU_DEVICE_ID")
    gpu_memory_fraction: float = Field(default=0.8, env="GPU_MEMORY_FRACTION")  # Use 80% of GPU memory
    gpu_allow_growth: bool = Field(default=True, env="GPU_ALLOW_GROWTH")
    
    # ONNX Runtime Configuration
    onnx_optimization_level: str = Field(default="all", env="ONNX_OPTIMIZATION_LEVEL")  # Options: disable, basic, extended, all
    onnx_intra_op_num_threads: int = Field(default=0, env="ONNX_INTRA_OP_NUM_THREADS")  # 0 = auto-detect
    onnx_inter_op_num_threads: int = Field(default=0, env="ONNX_INTER_OP_NUM_THREADS")  # 0 = auto-detect
    onnx_enable_profiling: bool = Field(default=False, env="ONNX_ENABLE_PROFILING")
    
    # Model Caching Configuration
    onnx_model_cache_dir: str = Field(default="./models/onnx_cache", env="ONNX_MODEL_CACHE_DIR")
    onnx_model_cache_size_mb: int = Field(default=2048, env="ONNX_MODEL_CACHE_SIZE_MB")  # 2GB cache
    
    # Batch Processing Configuration
    default_batch_size: int = Field(default=16, env="DEFAULT_BATCH_SIZE")  # Optimized for RTX 5090
    max_batch_size: int = Field(default=64, env="MAX_BATCH_SIZE")
    batch_timeout_ms: int = Field(default=100, env="BATCH_TIMEOUT_MS")  # Max wait time for batch formation
    
    # Performance Monitoring
    enable_gpu_monitoring: bool = Field(default=True, env="ENABLE_GPU_MONITORING")
    performance_logging: bool = Field(default=True, env="PERFORMANCE_LOGGING")
    benchmark_mode: bool = Field(default=False, env="BENCHMARK_MODE")
    
    @field_validator('gpu_acceleration_enabled', 'gpu_allow_growth', 'onnx_enable_profiling', 
                     'enable_gpu_monitoring', 'performance_logging', 'benchmark_mode',
                     'debug', 'reload', 'enable_voice_cloning', 'enable_performance_logging',
                     'enable_real_time_stt', 'enable_streaming_tts', 'enable_voice_activity_detection',
                     'enable_noise_reduction', mode='before')
    @classmethod
    def validate_booleans(cls, v):
        """Strip whitespace from boolean environment variables"""
        if isinstance(v, str):
            v = v.strip()
            if v.lower() in ('true', '1', 'on', 'yes'):
                return True
            elif v.lower() in ('false', '0', 'off', 'no', ''):
                return False
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False
        
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return not self.debug
        
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as list"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",")]
        return self.cors_origins
        
    def get_allowed_hosts(self) -> List[str]:
        """Get allowed hosts as list"""
        if isinstance(self.allowed_hosts, str):
            return [host.strip() for host in self.allowed_hosts.split(",")]
        return self.allowed_hosts


# Global settings instance
settings = Settings()