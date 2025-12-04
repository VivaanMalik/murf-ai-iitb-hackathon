import os
import asyncio
from fastapi import WebSocket
from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents
from dotenv import load_dotenv

load_dotenv()
deepgram = DeepgramClient(os.getenv("DEEPGRAM_API_KEY"))

def get_deepgram_transcription(audio_bytes: bytes):
    try:
        source = {"buffer": audio_bytes}

        response = deepgram.listen.prerecorded.v("1").transcribe_file(
            source,
            {
                "model": "nova-2",
                "smart_format": True,
                "punctuate": True,
            }
        )

        return response["results"]["channels"][0]["alternatives"][0]["transcript"]

    except Exception as e:
        print("Deepgram Transcription Error:", e)
        return ""

async def stream_deepgram_transcription(websocket: WebSocket):
    """
    Bridges browser → Deepgram Live → Browser
    """
    
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    try:
        deepgram_live = deepgram.listen.live.v("1")

        # Deepgram callback
        def on_transcript(self, result, **kwargs):
            try:
                alts = result.channel.alternatives
                if not alts: return

                text = alts[0].transcript
                if not text: return

                asyncio.run_coroutine_threadsafe(
                    queue.put({
                        "transcript": text,
                        "is_final": result.is_final
                    }),
                    loop
                )
            except Exception as e:
                print("Callback Error:", e)

        deepgram_live.on(LiveTranscriptionEvents.Transcript, on_transcript)
        deepgram_live.on(LiveTranscriptionEvents.Error, lambda s, e, **k: print("DG Error:", e))

        # IMPORTANT: Browser sends OPUS, not PCM
        options = LiveOptions(
            model="nova-2",
            encoding="linear16",
            sample_rate=48000,
            channels=1,
            interim_results=True,
            smart_format=True,
            punctuate=True,
        )

        if deepgram_live.start(options) is False:
            print("❌ Failed to start Deepgram session")
            return

        async def recv_audio():
            while True:
                data = await websocket.receive_bytes()
                deepgram_live.send(data)

        async def send_text():
            while True:
                msg = await queue.get()
                await websocket.send_json(msg)

        await asyncio.gather(recv_audio(), send_text())

    except Exception as e:
        print("Deepgram streaming error:", e)

    finally:
        try:
            deepgram_live.finish()
        except:
            pass