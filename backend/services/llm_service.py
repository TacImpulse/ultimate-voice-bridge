"""
LLM Service with LM Studio Integration
Connects to LM Studio for ByteDance OSS36B model processing
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any
import aiohttp
import json

logger = logging.getLogger(__name__)


class LLMService:
    """LLM Service for connecting to LM Studio"""
    
    def __init__(self):
        self.base_url = "http://localhost:1234/v1"
        self.default_model = "bytedance/seed-oss-36b"
        self.session: Optional[aiohttp.ClientSession] = None
        self.conversation_history: List[Dict[str, str]] = []
        
    async def initialize(self) -> None:
        """Initialize the LLM service"""
        try:
            # Create aiohttp session
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60)
            )
            
            # Test connection to LM Studio
            await self._test_connection()
            
            logger.info("✅ LLM Service initialized successfully with LM Studio")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize LLM service: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            logger.info("🧹 LLM Service cleanup complete")
    
    async def _test_connection(self) -> None:
        """Test connection to LM Studio"""
        try:
            async with self.session.get(f"{self.base_url}/models") as response:
                if response.status == 200:
                    models_data = await response.json()
                    available_models = [model["id"] for model in models_data.get("data", [])]
                    
                    if self.default_model in available_models:
                        logger.info(f"✅ LM Studio connection successful. OSS36B model available.")
                        logger.info(f"📋 Available models: {', '.join(available_models[:3])}...")
                    else:
                        logger.warning(f"⚠️  OSS36B model not found. Available: {available_models}")
                        # Use first available model as fallback
                        if available_models:
                            self.default_model = available_models[0]
                            logger.info(f"🔄 Using fallback model: {self.default_model}")
                else:
                    raise Exception(f"LM Studio API returned status {response.status}")
                    
        except Exception as e:
            raise Exception(f"Cannot connect to LM Studio: {e}")
    
    async def health_check(self) -> bool:
        """Check if LLM service is healthy"""
        try:
            if not self.session:
                return False
                
            async with self.session.get(f"{self.base_url}/models") as response:
                return response.status == 200
                
        except Exception:
            return False
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
        include_reasoning: bool = True,
        use_conversation_history: bool = True
    ) -> Dict[str, Any]:
        """
        Generate LLM response using LM Studio
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model name (defaults to OSS36B)
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            include_reasoning: Whether to include reasoning content (for reasoning models)
            use_conversation_history: Whether to include conversation context
            
        Returns:
            Dictionary containing response, reasoning, and metadata
        """
        start_time = time.time()
        
        try:
            if not self.session:
                raise Exception("LLM service not initialized")
            
            # Use provided model or default
            model_name = model if model and model != "default" else self.default_model
            
            # Build conversation context
            conversation = []
            
            # Add conversation history if enabled
            if use_conversation_history and self.conversation_history:
                conversation.extend(self.conversation_history[-10:])  # Last 10 exchanges
            
            # Add current messages
            conversation.extend(messages)
            
            # Prepare request payload
            payload = {
                "model": model_name,
                "messages": conversation,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False
            }
            
            logger.info(f"🤖 Generating response with {model_name}")
            logger.debug(f"📝 Messages: {len(conversation)} messages, max_tokens: {max_tokens}")
            
            # Make request to LM Studio
            async with self.session.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"LM Studio API error {response.status}: {error_text}")
                
                result = await response.json()
                
                # Extract response data
                choice = result.get("choices", [{}])[0]
                message = choice.get("message", {})
                
                response_text = message.get("content", "")
                reasoning_content = message.get("reasoning_content", "") if include_reasoning else ""
                
                # Extract usage statistics
                usage = result.get("usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)
                total_tokens = usage.get("total_tokens", 0)
                
                processing_time = time.time() - start_time
                
                # Update conversation history
                if use_conversation_history:
                    # Add user message
                    if messages:
                        self.conversation_history.append(messages[-1])
                    
                    # Add assistant response
                    self.conversation_history.append({
                        "role": "assistant",
                        "content": response_text
                    })
                    
                    # Limit history size
                    if len(self.conversation_history) > 20:
                        self.conversation_history = self.conversation_history[-20:]
                
                logger.info(f"✅ LLM response generated in {processing_time:.2f}s")
                logger.info(f"📊 Tokens: {prompt_tokens} prompt + {completion_tokens} completion = {total_tokens} total")
                
                return {
                    "response": response_text,
                    "reasoning": reasoning_content,
                    "model": model_name,
                    "processing_time": processing_time,
                    "usage": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens
                    },
                    "finish_reason": choice.get("finish_reason", "unknown"),
                    "conversation_length": len(self.conversation_history)
                }
                
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"❌ LLM generation failed after {processing_time:.2f}s: {e}")
            raise Exception(f"LLM generation failed: {str(e)}")
    
    async def generate_streaming_response(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ):
        """
        Generate streaming LLM response (async generator)
        
        Yields:
            Dictionary containing partial responses and metadata
        """
        try:
            if not self.session:
                raise Exception("LLM service not initialized")
            
            model_name = model if model and model != "default" else self.default_model
            
            payload = {
                "model": model_name,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True
            }
            
            logger.info(f"🌊 Starting streaming response with {model_name}")
            
            async with self.session.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Streaming API error {response.status}: {error_text}")
                
                accumulated_content = ""
                
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    
                    if line.startswith("data: "):
                        data = line[6:]  # Remove "data: " prefix
                        
                        if data == "[DONE]":
                            break
                        
                        try:
                            chunk = json.loads(data)
                            choice = chunk.get("choices", [{}])[0]
                            delta = choice.get("delta", {})
                            content = delta.get("content", "")
                            
                            if content:
                                accumulated_content += content
                                
                                yield {
                                    "type": "chunk",
                                    "content": content,
                                    "accumulated_content": accumulated_content,
                                    "finish_reason": choice.get("finish_reason"),
                                    "model": model_name
                                }
                        
                        except json.JSONDecodeError:
                            continue
                
                # Final response
                yield {
                    "type": "complete",
                    "content": accumulated_content,
                    "model": model_name
                }
                
        except Exception as e:
            logger.error(f"❌ Streaming generation failed: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }
    
    def clear_conversation_history(self) -> None:
        """Clear conversation history"""
        self.conversation_history.clear()
        logger.info("🗑️  Conversation history cleared")
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get current conversation history"""
        return self.conversation_history.copy()
    
    async def get_available_models(self) -> List[str]:
        """Get list of available models from LM Studio"""
        try:
            if not self.session:
                return []
            
            async with self.session.get(f"{self.base_url}/models") as response:
                if response.status == 200:
                    data = await response.json()
                    return [model["id"] for model in data.get("data", [])]
                return []
                
        except Exception as e:
            logger.error(f"Failed to get available models: {e}")
            return []