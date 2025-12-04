import json
import requests
import base64
import os
from typing import List
from fastapi import HTTPException
from .text_utils import process_speech, smart_split

def stream_audio_from_list(full_text: str, settings: dict):
    """
    Takes a LIST of sentences -> Generates Audio for each -> Yields chunks.
    """
    # process and adjust first
    full_text_new = process_speech(full_text)
    text_list = smart_split(full_text_new)


    first_sentence = text_list[0] if text_list else ""
    first_audio_b64 = None
    
    try:
        first_audio_b64 = generate_murf_speech(first_sentence, settings)
    except Exception as e:
        print(f"⚠️ Error generating first audio chunk: {e}")
        
    first_chunk_data = {
        "full_text": full_text,
        "audio_chunk": first_audio_b64,
        "text_chunk": first_sentence,
        "index": 0,
        "status": "playing"
    }
    yield json.dumps(first_chunk_data) + "\n"

    for idx, sentence in enumerate(text_list[1:]):
        if not sentence.strip():
            chunk_data = {
                "audio_chunk": None,
                "text_chunk": sentence, # Likely "\n"
                "index": idx + 1,
                "status": "playing"
            }
            yield json.dumps(chunk_data) + "\n"
            continue

        # Handle text (Audio)
        try:
            audio_b64 = generate_murf_speech(sentence, settings)
            chunk_data = {
                "audio_chunk": audio_b64,
                "text_chunk": "",
                "index": idx + 1,
                "status": "playing"
            }
            yield json.dumps(chunk_data) + "\n"
        except Exception as e:
            print(f"⚠️ Error chunk {idx}: {e}")
            continue

    yield json.dumps({"status": "done"}) + "\n"

def generate_murf_speech(text: List[str], settings):
    """
    Sends text to Murf Falcon API and returns the audio as a Base64 string.
    """

    url = "https://global.api.murf.ai/v1/speech/stream"

    api_key = os.getenv("MURF_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="MURF_API_KEY not found in .env file")
        
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json"
    }

    # setup stuff for the voice
    payload = {
        "voice_id": "en-IN-nikhil",
        "style": "Conversational",
        "text": text,
        "multi_native_locale": "en-IN",
        "model": "FALCON",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO",
        "rate": settings.get("rate", 0),
        "pitch": settings.get("pitch", 0),
        "style": settings.get("style", "Conversational")
    }
    
    # one for hindi
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
        print(f"🎤 Sending to Murf Falcon: '{text[:20]}...'")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            audio_bytes = response.content
            
            # base64
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            print(f"Success! Received {len(audio_bytes)} bytes of audio.")
            return audio_b64
        else:
            # Error Handling
            print(f"Murf API Error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Murf API Error: {response.text}")

    except Exception as e:
        print(f"Connection Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))