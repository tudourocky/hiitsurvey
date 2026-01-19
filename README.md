# HIITSurvey - Gamified Fitness Meets Survey Completion

A gamified fitness web application that transforms survey completion into an engaging physical activity. Users complete surveys from SurveyMonkey while performing exercises tracked in real-time through their webcam.

🔗 **Devpost**: [https://devpost.com/software/hiitsurvey](https://devpost.com/software/hiitsurvey)

## Features

- **Real-time Exercise Detection**: Uses MediaPipe Pose Landmarker to count exercises from webcam video (~10 FPS) with custom computer vision algorithms
- **Auto-advancing Surveys**: Questions automatically advance after completing 5 reps of the mapped exercise
- **Retro Arcade UI**: Pixel-art inspired interface with nostalgic gaming aesthetics
- **Comprehensive Rewards System**: Points, streaks, badges, and leaderboards to drive engagement
- **Social Competition**: Leaderboard integration via Supabase to compete with friends
- **AI-Powered Workouts**: OpenAI integration generates personalized workout plans
- **Text-to-Speech**: ElevenLabs integration provides audio guidance during exercises

## How to Run

### Prerequisites

- Python 3.14.2
- Node.js 25.2.1
- MongoDB (local or remote)
- Webcam

### Setup

1. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Frontend Setup**
   ```bash
   cd Frontend
   npm install
   ```

3. **Environment Variables**

   Create `backend/.env`:
   ```env
   SURVEYMONKEY_ACCESS_TOKEN=your_token
   OPENAI_API_KEY=your_key
   ELEVENLABS_API_KEY=your_key
   MONGODB_URL=mongodb://localhost:27017
   MONGODB_DATABASE=uottahack
   ```

   Create `Frontend/.env`:
   ```env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

### Running

**Backend** (from `backend` directory):
```bash
uvicorn app.main:app --reload
```
API available at `http://localhost:8000`

**Frontend** (from `Frontend` directory):
```bash
npm run dev
```
App available at `http://localhost:5173`

---

**Built with ❤️ for uOttahack**
