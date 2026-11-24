# CommonGround — Community Services Matching Platform (starter MVP)

This project builds on the supplied matcher.py. It includes a Flask API, SQLite persistence, demo workers, service-request creation, weighted match ranking, worker selection, and a responsive React dashboard.

## Run backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python app.py
```
API: http://localhost:5000/api/health

## Run frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Demo notes
- Five synthetic worker profiles are inserted on first run.
- Demo household location defaults to latitude 31.22, longitude 75.77; change these to test other locations.
- Matching score is a weighted demonstration score: experience-derived skill score (0.35), distance within worker radius (0.40), and current availability (0.25).
- This is an MVP, not production-ready authentication. Login, role permissions, booking lifecycle, map tiles, worker acceptance workflow, and the full 1,000-request simulation UI remain to be implemented.
- Worker data and coordinates are synthetic. Do not present demo profiles as real people.
