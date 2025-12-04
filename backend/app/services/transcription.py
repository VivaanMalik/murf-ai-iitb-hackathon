import os
import asyncio
from fastapi import WebSocket
from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
from dotenv import load_dotenv

load_dotenv()
deepgram = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

def get_deepgram_transcription(audio_bytes):
    """
    Sends audio to deepgram (nova 2) and gets text output.
    """
    dg_connection = deepgram.listen.live.v("1")

    AUDIO_URL = "https://static.deepgram.com/examples/bueller-life-moves-pretty-fast.wav"

    try:
        response = deepgram.listen.rest.transcribe_file(
            { "buffer": audio_bytes }, 
            options = {
                "model": "nova-2",
                "smart_format": True,
                "language": "en-US",
                "punctuate": True
            }
        )
        return str(response.results.channels[0].alternatives[0].transcript)

    except Exception as e:
        print(f"Exception: {e}")

async def stream_deepgram_transcription(websocket: WebSocket):
    """
    Connects to Deepgram Live and bridges the WebSocket audio to it.
    """
    queue = asyncio.Queue()
    # FIX: Capture the loop here so the thread knows where to send data
    loop = asyncio.get_running_loop()
    
    try:
        deepgram_live = deepgram.listen.live.v("1")

        # FIX: Add 'self' to args and use 'loop' for threadsafe call
        def on_transcript(self, result, **kwargs):
            try:
                if not result or not result.channel: return
                alternatives = result.channel.alternatives
                if not alternatives: return
                
                sentence = alternatives[0].transcript
                if len(sentence) > 0:
                    is_final = result.is_final
                    asyncio.run_coroutine_threadsafe(
                        queue.put({
                            "transcription": sentence,
                            "status": "final" if is_final else "partial"
                        }),
                        loop # <--- Use the captured loop
                    )
            except Exception as e:
                print(f"Callback Error: {e}")

        deepgram_live.on(LiveTranscriptionEvents.Transcript, on_transcript)
        deepgram_live.on(LiveTranscriptionEvents.Error, lambda s, e, **k: print(f"DG Error: {e}"))

        options = LiveOptions(
            model="nova-2", 
            punctuate=True, 
            language="en-US", 
            encoding="linear16", 
            channels=1, 
            sample_rate=48000, # Ensure matches browser (usually 44100 or 48000)
            interim_results=True,
            smart_format=True,
        )

        if deepgram_live.start(options) is False:
             print("Failed to start Deepgram")
             return

        async def receive_audio():
            try:
                while True:
                    data = await websocket.receive_bytes()
                    deepgram_live.send(data)
            except Exception: pass

        async def send_transcript():
            try:
                while True:
                    data = await queue.get()
                    await websocket.send_json(data)
            except Exception: pass

        await asyncio.gather(receive_audio(), send_transcript())

    except Exception as e:
        print(f"Streaming Error: {e}")
    finally:
        try: deepgram_live.finish()
        except: pass

def get_deepgram_transcription(audio_bytes: bytes):
    try:
        # Simple source config. Deepgram detects mimetype from buffer usually, 
        # but you can specify mimetype="audio/webm" if needed.
        source = {"buffer": audio_bytes}
        
        response = deepgram.listen.prerecorded.v("1").transcribe_file(
            source, 
            {
                "model": "nova-2", 
                "smart_format": True,
                "punctuate": True
            }
        )
        # Extract transcript
        return response["results"]["channels"][0]["alternatives"][0]["transcript"]
    except Exception as e:
        print(f"Deepgram Transcription Error: {e}")
        return ""
