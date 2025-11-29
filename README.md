uvicorn app.main:app --reload   
run this in backend

curl -X POST "http://localhost:8000/api/chat" -H "Content-Type: application/json" -d "{\"user_message\": \"You're so gay omgggg\"}" > /dev/null
use for testing