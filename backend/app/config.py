"""
Application configuration using Pydantic Settings
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    app_name: str = Field(default="Ultimate Voice Bridge", env="NEXT_PUBLIC_APP_NAME")
    debug: bool = Field(default=True, env="DEBUG")
    reload: bool = Field(default=True, env="RELOAD")
    
    # Server
    backend_host: str = Field(default="0.0.0.0", env="BACKEND_HOST")
    backend_port: int = Field(default=8000, env="BACKEND_PORT")
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