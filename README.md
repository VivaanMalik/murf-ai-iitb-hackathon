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

add urls
UI glictches - text on the text area and the transcription visualization and the normal visualization and the color of tehe thing behind the mic and the word wrap and the latex and the spekaing of numbers in a natural way by breaking it down into tiny tiny parts

read documents/pdf
pdf plumber
upload pdf feature      summarize (without loss of info nd generate mermaid markdown)
playwright
interrupt

UI
mermaid markdown and present it
posprocess tool's outputs to put in conversational language
OCR

Qwen instruct