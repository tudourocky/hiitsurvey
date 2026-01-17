import React, { useState, useEffect } from 'react';
import "./SurveySelector.css"

const ArcadeSongSelector = () => {
  const songs = [
    { title: "Electric Dreams", artist: "Neon Pulse", difficulty: 3, icon: "⚡", color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    { title: "Cyber Rush", artist: "Digital Storm", difficulty: 5, icon: "🎮", color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { title: "Tokyo Nights", artist: "Synthwave City", difficulty: 4, icon: "🌃", color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
    { title: "Laser Show", artist: "Beat Master", difficulty: 5, icon: "✨", color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
    { title: "Retro Wave", artist: "80s Kid", difficulty: 2, icon: "🎹", color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
    { title: "Pixel Paradise", artist: "Chip Tune", difficulty: 3, icon: "👾", color: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
    { title: "Bass Drop", artist: "Club Remix", difficulty: 4, icon: "🔊", color: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
    { title: "Starlight", artist: "Cosmic DJ", difficulty: 3, icon: "⭐", color: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)" }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-800 to-purple-950 flex items-center justify-center overflow-hidden relative">
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
      `}</style>
      
      <div className="scanlines absolute inset-0 pointer-events-none" />
      
      <div className="bg-gradient-to-br from-fuchsia-500 to-cyan-500 p-2 rounded-3xl shadow-[0_0_50px_rgba(255,0,255,0.5)]">
        <div className="bg-black rounded-2xl px-5 py-10 min-h-[500px] flex flex-col items-center justify-center">
          <h1 className="text-white text-4xl font-black mb-2 glow-text uppercase">♪ Song Select ♪</h1>
          <p className="text-cyan-400 text-sm mb-10 tracking-[3px]">Choose Your Rhythm</p>
          
          <div className="w-full max-w-4xl h-[350px] relative" style={{ perspective: '1000px' }}>
            <div className="w-full h-full relative transition-transform duration-500" style={{ transformStyle: 'preserve-3d' }}>
              {songs.map((song, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={index}
                    onClick={() => navigateTo(index)}
                    className={`absolute left-1/2 top-1/2 -ml-[110px] -mt-[140px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 cursor-pointer transition-all duration-500 flex flex-col items-center justify-between ${
                      isActive 
                        ? 'w-[260px] h-[320px] -ml-[130px] -mt-[160px] border-[3px] border-fuchsia-500 shadow-[0_0_40px_rgba(255,0,255,0.6),inset_0_0_20px_rgba(255,0,255,0.1)]' 
                        : 'w-[220px] h-[280px] border-2 border-slate-700'
                    }`}
                    style={getCardStyle(index)}
                  >
                    <div 
                      className={`w-full aspect-square rounded-xl flex items-center justify-center text-5xl mb-4 transition-all duration-300 ${
                        isActive ? 'shadow-[0_5px_20px_rgba(255,0,255,0.4)]' : ''
                      }`}
                      style={{ background: song.color }}
                    >
                      {song.icon}
                    </div>
                    
                    <div className="text-center w-full">
                      <div className={`font-bold mb-2 ${isActive ? 'text-fuchsia-500 text-lg' : 'text-white text-base'}`}>
                        {song.title}
                      </div>
                      <div className="text-gray-400 text-sm">{song.artist}</div>
                      <div className="flex gap-1 mt-2 justify-center">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={isActive ? 'text-yellow-400' : 'text-gray-600'}>
                            {i < song.difficulty ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 flex gap-5">
            <button
              onClick={() => navigate(-1)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-10 py-4 text-xl font-bold rounded-full shadow-[0_5px_15px_rgba(0,255,255,0.4)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(0,255,255,0.6)] active:translate-y-0 transition-all uppercase"
            >
              ◄ PREV
            </button>
            <button
              onClick={selectSong}
              className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white px-10 py-4 text-xl font-bold rounded-full shadow-[0_5px_15px_rgba(255,0,255,0.4)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(255,0,255,0.6)] active:translate-y-0 transition-all uppercase"
            >
              ▶ PLAY
            </button>
            <button
              onClick={() => navigate(1)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-10 py-4 text-xl font-bold rounded-full shadow-[0_5px_15px_rgba(0,255,255,0.4)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(0,255,255,0.6)] active:translate-y-0 transition-all uppercase"
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