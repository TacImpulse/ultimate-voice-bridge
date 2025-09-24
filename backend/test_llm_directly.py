import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.llm_service import LLMService

async def test_llm():
    llm = LLMService()
    await llm.initialize()
    
    # Clear history
    llm.clear_conversation_history()
    
    # Test the exact same messages we use in voice chat
    messages = [
        {
            "role": "system", 
            "content": "You are Ava, a friendly AI assistant. Respond ONLY with natural conversational speech. NEVER include XML, code, technical terms, or structured data. Here are examples:\n\nUser: Hello\nAva: Hi there! How are you doing today?\n\nUser: How's the weather?\nAva: I'm not sure about the weather in your area, but I hope it's nice!\n\nIMPORTANT: Respond with ONLY natural speech like the examples above. No XML, no technical content, no structured data."
        },
        {
            "role": "user",
            "content": "Hi Ava"
        },
        {
            "role": "assistant",
            "content": "Hello! Nice to meet you!"
        },
        {
            "role": "user", 
            "content": "Hello, how are you today?"
        }
    ]
    
    print("🧪 Testing LLM response generation...")
    print("=" * 50)
    
    result = await llm.generate_response(messages=messages)
    
    print(f"📜 RAW LLM Response:")
    print(f"'{result['response']}'")
    print("=" * 50)
    print(f"📏 Length: {len(result['response'])} characters")
    print(f"🔍 First 200 chars: '{result['response'][:200]}'")
    
    await llm.cleanup()

if __name__ == "__main__":
    asyncio.run(test_llm())