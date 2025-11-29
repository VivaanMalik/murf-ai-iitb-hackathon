import os
import requests
import base64
from fastapi import HTTPException
from dotenv import load_dotenv
from groq import Groq

load_dotenv()
client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
)

def generate_murf_speech(text: str):
    """
    Sends text to Murf Falcon API and returns the audio as a Base64 string.
    """
    
    # 1. The Endpoint
    # We use the 'generate' endpoint with Base64 output for simplest frontend integration
    url = "https://global.api.murf.ai/v1/speech/stream"

    # 2. The Headers
    api_key = os.getenv("MURF_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="MURF_API_KEY not found in .env file")
        
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }

    # 3. The Payload (The Rules for Falcon)
    payload = {
        "voice_id": "en-IN-nikhil",
        "style": "Conversational",
        "text": text,
        "multi_native_locale": "en-IN",
        "model": "FALCON",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO"
    }

    # COMMENT ===========================================================================
    # payload = {
    #     "voice_id": "hi-IN-aman",
    #     "style": "Angry",
    #     "text": text,
    #     "multi_native_locale": "hi-IN",
    #     "model": "FALCON",
    #     "format": "MP3",
    #     "sampleRate": 24000,
    #     "channelType": "MONO"
    # }
    # COMMENT ===========================================================================

    try:
        # 4. Make the Request
        print(f"🎤 Sending to Murf Falcon: '{text[:20]}...'")
        response = requests.post(url, headers=headers, json=payload)
        
        # 5. Handle Response
        if response.status_code == 200:
            audio_bytes = response.content
            
            # Convert to Base64 for the frontend
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            print(f"✅ Success! Received {len(audio_bytes)} bytes of audio.")
            return audio_b64
        else:
            # Error Handling
            print(f"❌ Murf API Error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Murf API Error: {response.text}")

    except Exception as e:
        print(f"❌ Connection Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))