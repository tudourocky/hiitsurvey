import React from 'react';
import './App.css';
import { RewardProvider } from './contexts/RewardContext';
import WorkoutSelector from './components/WorkoutSelector';
import ArcadeSongSelector from './SurveySelector';
import PreferenceForm from './pages/PreferenceForm';

function App() {
  return (
    <RewardProvider>
      <WorkoutSelector />
    </RewardProvider>
  );
}

export default App;
