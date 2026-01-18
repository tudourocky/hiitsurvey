import React, { useState, useEffect } from 'react';
import "../pages/SurveySelector.css";
import Navbar from "../components/Navbar";
import Leaderboard from '../components/Leaderboard';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as FiIcons from 'react-icons/fi';
import { extractSurveys, goDown, goLive } from '../shared/supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const SurveyList = () => {

    const [surveys, setSurveys] = useState([]);
    const [liveList, setLiveList] = useState([]);
    const [removeList, setRemoveList] = useState([]);

    const fetchSurveys = async() => {
        try {
            const response = await fetch(`${API_BASE_URL}/surveys`);
            if (!response.ok) {
                throw new Error(`Failed to fetch surveys: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Handle both {surveys: [...], total: N} and direct array responses
            return Array.isArray(data) ? data : (data.surveys || []);
        } catch (error) {
            console.error('Error fetching surveys:', error);
            return [];
        }
    }

  useEffect(()=>{
        fetchSurveys()
        .then((res) => {
            setSurveys(res);
        })
        .catch((error) => {
            console.error('Error in fetchSurveys:', error);
            setSurveys([]);
        });
  }, [])
 

  // Render icon component from icon name
  const renderIcon = (iconName) => {
    if (!iconName) return <FaIcons.FaCircle />;
    
    if (iconName.startsWith('Fa') && FaIcons[iconName]) {
      const IconComponent = FaIcons[iconName];
      return <IconComponent />;
    }
    
    if (iconName.startsWith('Md') && MdIcons[iconName]) {
      const IconComponent = MdIcons[iconName];
      return <IconComponent />;
    }
    
    if (iconName.startsWith('Fi') && FiIcons[iconName]) {
      const IconComponent = FiIcons[iconName];
      return <IconComponent />;
    }
    
    return <FaIcons.FaCircle />;
  };

  const buttonClick = (live, id) => {
    if (live) {
        setRemoveList(prev => prev.includes(id) ? prev.filter(i => i !== id) // REMOVE
        : [...prev, id])    
    }
    else{
        setLiveList(prev => prev.includes(id) ? prev.filter(i => i !== id) // REMOVE
        : [...prev, id])
    }
  }


  return (
    <div className="arcade-container scanlines">
      <Navbar />
      <div className="survey-list-container">
        <div className="arcade-frame neon-border-blue">
          <div className="survey-list-content">
            <h1 className="title neon-text-pink">AVAILABLE SURVEYS</h1>
            <div className="button-list"> 
                {(liveList.length != 0)?
                    <button className="survey-button" onClick={() => {setLiveList([]); goLive(liveList).then((res) => {setSurveys(res)}); }}>SET LIVE</button>    : null
                }
                {(removeList.length != 0)?
                    <button className="survey-button" onClick={() => {setRemoveList([]); goDown(removeList).then((res) => {setSurveys(res)});}}>REMOVE SELECTED</button>    : null
                }
            </div >
             {surveys.length === 0 ? (
              <div className="loading-message">NO SURVEYS AVAILABLE</div>
            ) : (
              <div className="survey-grid">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className="survey-card"
                  >
                    <div className="survey-info">
                      <h3 className="survey-title">{survey.title}</h3>
                      {survey.description && (
                        <p className="survey-artist">{survey.description}</p>
                      )}
                      <div className="survey-meta">
                        {
                            (survey.live) ? 
                                <button className="survey-button" onClick={()=>{setRemoveList([]); goDown([survey.id]).then((res) => {setSurveys(res); }); }}>Remove</button>
                                :
                                <button className="survey-button" onClick={() => { setLiveList([]);  goLive([survey.id]).then((res) => {setSurveys(res);});}}>Go Live</button>
                        }
                        <button className={`survey-button ${(liveList.includes(survey.id) || removeList.includes(survey.id)) ? "active": ""}`} onClick={() => buttonClick(survey.live || false, survey.id)}></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyList;