uvicorn app.main:app --reload   
lsof -ti:8000 | xargs kill -9
run this in backend

curl -X POST "http://localhost:8000/api/chat" -H "Content-Type: application/json" -d "{\"user_message\": \"You're so gay omgggg\"}" > /dev/null
use for testing

TODO
implement the other funcs
deal with that 429 bs


Search for the 'Attention Is All You Need' paper and show me the formula for Scaled Dot-Product Attention.

Search for patents on a Perpetual Motion Machine.

wrap text




TODO:

Use PDF Better
adjust rag viewer

playwright
interrupt

UI - mid
mermaid markdown and present it
posprocess tool's outputs to put in conversational language
OCR

Qwen instruct

Help pdf be better