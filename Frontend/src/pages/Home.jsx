import React from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="arcade-container scanlines">
      <Navbar />
      <main className="home-content">
        <div className="hero-section">
          <h1 className="title-large">HIIT ARCADE</h1>
          <p className="hero-subtitle">Level up your fitness.</p>
          
          <div className="arcade-frame neon-border-blue">
            <div className="screen-content">
              <h2>Insert Coin to Begin</h2>
              <div className="button-group">
                <button 
                  className="start-button"
                  onClick={() => navigate("/surveys")}
                >
                  Start Workout
                </button>
                <button 
                  className="settings-button"
                  onClick={() => navigate("/preferences")}
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .home-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .hero-section {
          padding: 2rem;
        }

        .title-large {
          font-size: 4rem;
          margin-bottom: 1rem;
          color: #fff;
          text-shadow: 0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink), 0 0 60px var(--neon-pink);
          animation: titleGlow 2s ease-in-out infinite alternate;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: var(--neon-blue);
          margin-bottom: 3rem;
          letter-spacing: 4px;
        }

        .arcade-frame {
          background: #000;
          padding: 3rem;
          border-radius: 20px;
          max-width: 600px;
          width: 100%;
        }

        .screen-content h2 {
          font-size: 1.5rem;
          color: var(--neon-yellow);
          margin-bottom: 2rem;
          animation: blink 1s infinite;
        }

        .button-group {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .start-button {
          font-size: 1.2rem;
          padding: 1.5rem;
          border-color: var(--neon-pink);
          color: var(--neon-pink);
          box-shadow: 0 0 15px var(--neon-pink);
        }

        .start-button:hover {
          background: var(--neon-pink);
          color: #000;
          box-shadow: 0 0 30px var(--neon-pink);
        }

        @keyframes titleGlow {
          from { text-shadow: 0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink); }
          to { text-shadow: 0 0 30px var(--neon-blue), 0 0 60px var(--neon-blue); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
