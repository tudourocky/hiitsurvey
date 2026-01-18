import React from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { client, insertUser} from "../shared/supabase";

export default function Home() {
  const navigate = useNavigate();
    const date = new Date();

// Listen for future sign-ins
useEffect(()=> {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');

    if (role){
        // Fetch user
        insertUser(role);
    
    }}, [])

  return (
    <div className="arcade-container scanlines">
      <Navbar />
      <main className="home-content">
        <div className="hero-section">
          <div className="retro-header">
            <span className="retro-text">RETRO</span>
            <div className="pacman-icon">ᗧ</div>
            <span className="date-text">{date.toLocaleDateString('en-US', {weekday: 'short'}) + " " + date.getDate()}</span>
          </div>
          
          <h1 className="arcade-title">ARCADE</h1>
          
          <div className="machine-frame neon-border">
            <div className="screen">
              <div className="glitch-container">
                <h2 className="glitch-text" data-text="PRESS START">PRESS START</h2>
              </div>
              
              <div className="game-decoration">
                <span className="alien">👾</span>
                <span className="ghost">👻</span>
              </div>

              <div className="controls-hint">
                <button 
                  className="insert-coin-btn"
                  onClick={() => navigate("/surveys")}
                >
                  INSERT COIN
                </button>
              </div>
            </div>
          </div>
          
          <div className="location-footer">
            <p>University of Ottawa, Ottawa, ON</p>
            <p className="small">EXERCISE WHILE COMPLETING SURVEYS</p>
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
          padding: 20px;
          max-width: 800px;
          width: 100%;
        }

        .retro-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 0;
          font-size: 1.5rem;
          color: #fff;
        }

        .pacman-icon {
          color: var(--neon-yellow);
          font-size: 3rem;
          text-shadow: 0 0 15px var(--neon-yellow);
          animation: chomp 0.5s infinite alternate;
        }

        .arcade-title {
          font-size: 6rem;
          margin: 0 0 2rem 0;
          color: #fff;
          letter-spacing: 10px;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }

        .machine-frame {
          background: #111;
          padding: 10px;
          border-radius: 5px;
          width: 100%;
          max-width: 600px;
          margin-bottom: 2rem;
        }

        .screen {
          background: #000;
          padding: 4rem 2rem;
          border-radius: 3px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
        }

        .glitch-container {
          position: relative;
        }

        .glitch-text {
          font-size: 3.5rem;
          color: #fff;
          position: relative;
          text-shadow: 
            3px 0 var(--glitch-red),
            -3px 0 var(--glitch-cyan);
          animation: glitch-anim 2s infinite linear alternate-reverse;
        }

        .game-decoration {
          display: flex;
          gap: 3rem;
          font-size: 2.5rem;
          margin: 1rem 0;
        }

        .alien { animation: float 2s infinite ease-in-out; }
        .ghost { color: var(--neon-pink); animation: float 2s infinite ease-in-out 1s; }

        .insert-coin-btn {
          font-size: 1.5rem;
          padding: 1.5rem 3rem;
          border-color: var(--neon-blue);
          animation: pulse 1.5s infinite;
        }

        .location-footer {
          color: #fff;
          font-size: 0.8rem;
          line-height: 2;
          letter-spacing: 2px;
        }

        .small {
          font-size: 0.6rem;
          color: var(--neon-blue);
        }

        @keyframes chomp {
          from { transform: rotate(0deg); }
          to { transform: rotate(-30deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes glitch-anim {
          0% { text-shadow: 3px 0 var(--glitch-red), -3px 0 var(--glitch-cyan); }
          25% { text-shadow: -3px 0 var(--glitch-red), 3px 0 var(--glitch-cyan); }
          50% { text-shadow: 3px 3px var(--glitch-red), -3px -3px var(--glitch-cyan); }
          75% { text-shadow: -3px -3px var(--glitch-red), 3px 3px var(--glitch-cyan); }
          100% { text-shadow: 3px 0 var(--glitch-red), -3px 0 var(--glitch-cyan); }
        }

        @media (max-width: 600px) {
          .arcade-title { font-size: 3rem; }
          .glitch-text { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}
