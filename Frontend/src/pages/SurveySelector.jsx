import React, { useState, useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import "./SurveySelector.css"
import ChevronSVG from '../ChevronSVG';
import Navbar from "../components/Navbar"
import Leaderboard from '../components/Leaderboard';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as FiIcons from 'react-icons/fi';
import SurveyList from '../components/SurveyList';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ArcadeSurveySelector = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const params = new URLSearchParams(window.location.search);
  const role = params.get('role');

  // Fetch missions from backend
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/missions`);
        if (!response.ok) {
          throw new Error('Failed to fetch missions');
        }
        const data = await response.json();
        setMissions(data.missions || []);
      } catch (error) {
        console.error('Error fetching missions:', error);
        // Fallback to empty array if API fails
        setMissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, []);

  const navigateCarousel = (direction) => {
    if (missions.length === 0) return;
    setCurrentIndex((prev) => (prev + direction + missions.length) % missions.length);
  };

  const navigateTo = (index) => {
    setCurrentIndex(index);
  };

  const selectMission = () => {
    if (missions.length === 0) return;
    const selectedMission = missions[currentIndex];
    // Navigate to exercise page with survey_id
    navigate(`/exercise?survey_id=${selectedMission.survey_id}`);
  };

  const handleCardClick = () => {
    selectMission();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') navigateCarousel(-1);
      if (e.key === 'ArrowRight') navigateCarousel(1);
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectMission();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, missions]);

  const getCardStyle = (index) => {
    const total = missions.length;
    if (total === 0) return {};
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

  // Render icon component from icon name
  const renderIcon = (iconName) => {
    if (!iconName) return <FaIcons.FaCircle />;
    
    // Try Font Awesome icons first
    if (iconName.startsWith('Fa') && FaIcons[iconName]) {
      const IconComponent = FaIcons[iconName];
      return <IconComponent />;
    }
    
    // Try Material Design icons
    if (iconName.startsWith('Md') && MdIcons[iconName]) {
      const IconComponent = MdIcons[iconName];
      return <IconComponent />;
    }
    
    // Try Feather icons
    if (iconName.startsWith('Fi') && FiIcons[iconName]) {
      const IconComponent = FiIcons[iconName];
      return <IconComponent />;
    }
    
    // Fallback
    return <FaIcons.FaCircle />;
  };
  if(role) {
    return (
      <SurveyList />
    )
  }

  else{
  return (
    <div className="arcade-container scanlines">
      <Navbar />
      <div className="container">
      <div className="arcade-frame neon-border-blue">
        <div className="screen-content">
          <h1 className="title neon-text-pink">MISSION SELECT</h1>
          <p className="subtitle">CHOOSE YOUR CHALLENGE</p>
          
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text neon-text-blue">LOADING MISSIONS...</p>
            </div>
          ) : missions.length === 0 ? (
            <div className="loading-message">NO MISSIONS AVAILABLE</div>
          ) : (
            <div className="carousel-container" onWheel={handleWheel}>
              <button onClick={() => navigateCarousel(-1)} className="chevron left" aria-label="Previous">
                <ChevronSVG direction="left" size={48} />
              </button>
              <div className="carousel">
                {missions.map((mission, index) => {
                  const isActive = index === currentIndex;
                  return (
                    <div
                      key={mission.id}
                      onClick={handleCardClick}
                      className={`card ${isActive ? 'card-active' : ''}`}
                      style={{ ...getCardStyle(index), cursor: 'pointer' }}
                    >
                      <div className={`album-art ${isActive ? 'active' : '' }`} style={{ background: mission.color }}>
                        {renderIcon(mission.icon)}
                      </div>
                      <div className="song-info">
                        <div className={`song-title ${isActive ? 'active' : ''}`}>{mission.title}</div>
                        <div className="song-artist">{mission.artist}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigateCarousel(+1)} className="chevron right" aria-label="Next">
                <ChevronSVG direction="right" size={48} />
              </button>
            </div>
          )}

            <div className="controls">
            </div>
          </div>
        </div>
        <Leaderboard />
        </div>
    </div>
  );
}
};

export default ArcadeSurveySelector;
