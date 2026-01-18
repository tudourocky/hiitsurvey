import React, { useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import "./SurveySelector.css"
import ChevronSVG from '../ChevronSVG';
import Navbar from "../components/Navbar"
import Leaderboard from '../components/Leaderboard';

const ArcadeSurveySelector = () => {
  const navigate = useNavigate();
  const songs = [
    { title: "Electric Dreams", artist: "Neon Pulse",  icon: "⚡", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { title: "Cyber Rush", artist: "Digital Storm",  icon: "🎮", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { title: "Tokyo Nights", artist: "Synthwave City",  icon: "🌃", color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { title: "Laser Show", artist: "Beat Master",  icon: "✨", color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
    { title: "Retro Wave", artist: "80s Kid",  icon: "🎹", color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
    { title: "Pixel Paradise", artist: "Chip Tune",  icon: "👾", color: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
    { title: "Bass Drop", artist: "Club Remix",  icon: "🔊", color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
    { title: "Starlight", artist: "Cosmic DJ",  icon: "⭐", color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" }
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  const navigateCarousel = (direction) => {
    setCurrentIndex((prev) => (prev + direction + songs.length) % songs.length);
  };

  const navigateTo = (index) => {
    setCurrentIndex(index);
  };

  const selectSong = () => {
    navigate('/exercise');
  };

  const handleCardClick = () => {
    navigate('/exercise');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') navigateCarousel(-1);
      if (e.key === 'ArrowRight') navigateCarousel(1);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSong();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const getCardStyle = (index) => {
    const total = songs.length;
    let offset = index - currentIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    const isActive = offset === 0;
    const distance = Math.abs(offset) * 500 + (isActive ? 0 : 200);
    const scale = isActive ? 1 : 1.0 - Math.abs(offset) * 0.1;
    const opacity = isActive ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.2);
    const angle = offset * 25;
    return {
      transform: `translateX(${offset * 220}px) translateZ(${-distance}px) scale(${Math.max(0.4, scale)}) rotateY(${-angle}deg)`,
      opacity: opacity,
      zIndex: 10 - Math.abs(offset)
    };
  };

  const wheelLock = useRef(false);
  const handleWheel = (e) => {
    if (wheelLock.current) return;
    wheelLock.current = true;
    if (e.deltaX < 0 || e.deltaY < 0) navigateCarousel(-1);
    else navigateCarousel(1);
    setTimeout(() => { wheelLock.current = false; }, 300);
  }

  return (
    <div className="arcade-container scanlines">
      <Navbar />
      <div className="container">
        <Leaderboard />
        <div className="arcade-frame neon-border-blue">
          <div className="screen-content">
            <h1 className="title neon-text-pink">MISSION SELECT</h1>
            <p className="subtitle">CHOOSE YOUR CHALLENGE</p>
            
            <div className="carousel-container" onWheel={handleWheel}>
              <button onClick={() => navigateCarousel(-1)} className="chevron left" aria-label="Previous">
                <ChevronSVG direction="left" size={48} />
              </button>
              <div className="carousel">
                {songs.map((song, index) => {
                  const isActive = index === currentIndex;
                  return (
                    <div
                      key={index}
                      onClick={handleCardClick}
                      className={`card ${isActive ? 'card-active' : ''}`}
                      style={{ ...getCardStyle(index), cursor: 'pointer' }}
                    >
                      <div className={`album-art ${isActive ? 'active' : '' }`} style={{ background: song.color }}>{song.icon}</div>
                      <div className="song-info">
                        <div className={`song-title ${isActive ? 'active' : ''}`}>{song.title}</div>
                        <div className="song-artist">{song.artist}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigateCarousel(+1)} className="chevron right" aria-label="Next">
                <ChevronSVG direction="right" size={48} />
              </button>
            </div>

            <div className="controls">
            </div>
          </div>
        </div>
        </div>
    </div>
  );
};

export default ArcadeSurveySelector;
