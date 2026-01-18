import { useState, useEffect } from 'react';
import { client, getTopUsers} from '../shared/supabase';
import './Leaderboard.css';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Fetch users sorted by score (descending)
      const {data, error} = await client 
        .from('Users')
        .select('*')

      if (error) throw error;


      setLeaderboardData(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-card">
          <div className="error-state">
            <p className="neon-text-red">ERROR: SYSTEM FAILURE</p>
            <p className="small-text">UNABLE TO RETRIEVE DATA</p>
            <button onClick={fetchLeaderboard} className="retry-btn">REBOOT</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title glitch" data-text="LEADERBOARD">
            LEADERBOARD
          </h1>
          <p className="leaderboard-subtitle">TOP PERFORMERS</p>
        </div>

    

        {/* Leaderboard Table */}
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="header-cell rank-col">Rank</div>
            <div className="header-cell name-col">Name</div>
            <div className="header-cell score-col">Score</div>
            <div className="header-cell surveys-col">Surveys</div>
          </div>

          <div className="table-body">
            {leaderboardData.map((user, index) => (
              <div 
                key={index} 
                className={`table-row`}
              >
                <div className="table-cell rank-col">
                    <div className="rank-number">
                        {index + 1}
                    </div>
                </div>
                <div className="table-cell name-col">
                  <div className="user-info">
                    <div className="user-avatar">
                      {(user.Name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name">{user.Name || 'Unknown User'}</span>
                  </div>
                </div>
                <div className="table-cell score-col">
                  <div className="score-badge">
                    {(user.score || 0).toLocaleString()}
                  </div>
                </div>
                <div className="table-cell surveys-col">
                  <div className="surveys-badge">
                    {user.completed_surveys || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {leaderboardData.length === 0 && (
          <div className="empty-state">
            <p>NO DATA FOUND</p>
            <p className="small-text">BE THE FIRST TO JOIN!</p>
          </div>
        )}
      </div>
    </div>
  );
}