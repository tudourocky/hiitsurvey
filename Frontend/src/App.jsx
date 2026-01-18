import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Import all page components
import Home from './pages/Home';
import PreferenceForm from './pages/PreferenceForm';
import Rewards from './pages/Rewards';
import ArcadeSurveySelector from './pages/SurveySelector';
import Exercise from './pages/Exercise';
import SignIn from './pages/SignIn';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/preferences" element={<PreferenceForm />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/surveys" element={<ArcadeSurveySelector />} />
        <Route path="/exercise" element={<Exercise />} />
        <Route path="/signin" element={<SignIn />} />
        {/* Catch-all route for 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
