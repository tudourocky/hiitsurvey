import React, { useState, useEffect, useRef} from 'react';
import "./SurveySelector.css"
import ChevronSVG from './ChevronSVG';
// Throttle scrolling
const ArcadeSongSelector = () => {
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

  const navigate = (direction) => {
    setCurrentIndex((prev) => (prev + direction + songs.length) % songs.length);
  };

  const navigateTo = (index) => {
    setCurrentIndex(index);
  };

  const selectSong = () => {
    const song = songs[currentIndex];
    alert(`🎵 Now Playing: ${song.title} by ${song.artist}\nDifficulty: ${'★'.repeat(song.difficulty)}`);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
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
    const distance = Math.abs(offset) * 80 + (isActive ? 0 : 200);
    const scale = isActive ? 1 : 0.7 - Math.abs(offset) * 0.1;
    const opacity = isActive ? 1 : Math.max(0.3, 1 - Math.abs(offset) * 0.2);
    const angle = offset * 25;
    
    return {
      transform: `translateX(${offset * 220}px) translateZ(${-distance}px) scale(${Math.max(0.4, scale)}) rotateY(${-angle}deg)`,
      opacity: opacity,
      zIndex: 10 - Math.abs(offset)
    };
  };

  // Throttle scrolling 
  const wheelLock = useRef(false);

  // Scroll through the carousel
  const handleWheel = (e) => {
    // Smoother scrolling
    if (wheelLock.current) return;

    // const delta = Math.sign(e.deltaX);
    // if (Math.abs(e.deltaX) < 20) return;

    wheelLock.current = true;

    if (e.deltaX < 0) navigate(-1);
    else navigate(1);

    setTimeout(() => {
      wheelLock.current = false;
    }, 100); // match animation duration
  }


  return (
    <div className="container">
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        @keyframes glow {
          from { text-shadow: 0 0 20px #ff00ff, 0 0 40px #ff00ff; }
          to { text-shadow: 0 0 30px #00ffff, 0 0 60px #00ffff; }
        }
        .scanlines::before {
          content: '';
          position: absolute;
          width: 200%;
          height: 200%;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 0, 255, 0.03) 2px,
            rgba(255, 0, 255, 0.03) 4px
          );
          animation: scan 8s linear infinite;
          pointer-events: none;
        }
        .glow-text {
          animation: glow 2s ease-in-out infinite alternate;
        }
        .btn:hover {
          transform: translateY(-2px);
        }
        .btn:active {
          transform: translateY(0);
        }
        .btn-secondary:hover {
          box-shadow: 0 8px 25px rgba(0, 255, 255, 0.6);
        }
        .btn-primary:hover {
          box-shadow: 0 8px 25px rgba(255, 0, 255, 0.6);
        }
      `}</style>
      
      <div className="scanlines" />
      
      <div className="arcadeFrame">
        <div className="screen">
          <h1 className="title">HIT Survey</h1>
          <p className="subtitle">Select Your Survey</p>
          
          <div className="carousel-container" style={{ perspective: '1000px' }}
            onWheel={handleWheel}>
              <button
              onClick={() => navigate(-1)}
              className="chevron left"
            ><ChevronSVG /></button>
            <div className="carousel" style={{ transformStyle: 'preserve-3d' }}>
              {songs.map((song, index) => {
                const isActive = index === currentIndex;

                return (
                  <div
                    key={index}
                    onClick={() => navigateTo(index)}
                    className={`card ${isActive ? 'card=active' : ''} ${getCardStyle(index)}`}
                    style={
                      getCardStyle(index)
                    }
                  >
                    <div 
                      className={`album-art ${isActive ? 'album-art-active' : '' }`}
                      style={{
                        background: song.color,
                      }}
                    >
                      {song.icon}
                    </div>
                    
                    <div className="songInfo">
                      <div className={` ${isActive ? 'songTitleActive' : 'songTitle'}`}>
                        {song.title}
                      </div>
                      <div className="songArtist">{song.artist}</div>
                      
                    </div>
                  </div>
                );
              })}
              
            </div>
            <button
              onClick={() => navigate(+1)}
              className="chevron right"
            ><ChevronSVG /></button>
          </div>

          <div className="controls">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              ◄ PREV
            </button>
            <button
              onClick={selectSong}
              className="btn btn-primary"
            >
              ▶ PLAY
            </button>
            <button
              onClick={() => navigate(1)}
              className="btn btn-secondary"
            >
              NEXT ►
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArcadeSongSelector;