# How to Run the Application

## Frontend (React + Vite)

1. **Navigate to the Frontend directory:**
   ```bash
   cd Frontend
   ```

2. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   The app will be available at `http://localhost:5173` (or the port shown in the terminal)

## Backend (FastAPI - Optional)

The frontend works standalone with localStorage, but if you want to run the backend:

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate  # On macOS/Linux
   # or
   venv\Scripts\activate  # On Windows
   ```

3. **Install dependencies (if needed):**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the FastAPI server:**
   ```bash
   # Using the entry point (backward compatible)
   uvicorn main:app --reload
   
   # Or using the new modular structure directly
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   
   **Note:** The backend has been refactored into a modular structure. See `backend/STRUCTURE.md` for details.

## Quick Start (Frontend Only)

Since the reward system uses localStorage, you can run just the frontend:

```bash
cd Frontend
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser!

## Features

- ✅ Complete workouts by answering all survey questions in order
- ✅ Earn points for completed workouts
- ✅ Track daily completion limits (one reward per workout per day)
- ✅ Streak system with 24-hour rolling window
- ✅ Streak milestone bonuses
- ✅ Badge system
- ✅ Duration-based bonuses
- ✅ Replay workouts (no additional rewards)

