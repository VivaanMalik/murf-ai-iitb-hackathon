source venv/bin/activate
cd ./backend
pip install -r requirements.txt
uvicorn app.main:app --reload