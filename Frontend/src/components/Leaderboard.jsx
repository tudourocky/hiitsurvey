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
            <svg className="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Error loading leaderboard</p>
            <button onClick={fetchLeaderboard} className="retry-btn">Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-card">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">
            <svg className="trophy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            </svg>
            Leaderboard
          </h1>
          <p className="leaderboard-subtitle">Top performers this month</p>
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
                        {index}
                    </div>
                </div>
                <div className="table-cell name-col">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.Name.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name">{user.Name}</span>
                  </div>
                </div>
                <div className="table-cell score-col">
                  <div className="score-badge">
                    {user.score.toLocaleString()}
                  </div>
                </div>
                <div className="table-cell surveys-col">
                  <div className="surveys-badge">
                    {user.completed_surveys}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {leaderboardData.length === 0 && (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No users on the leaderboard yet</p>
          </div>
        )}
      </div>
    </div>
  );
}