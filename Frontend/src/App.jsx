import React from 'react';
import './App.css';

import ArcadeSongSelector from './pages/SurveySelector';
import PreferenceForm from './pages/PreferenceForm';
// import Rewards from './pages/Rewards';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={< ArcadeSongSelector/>} />
        <Route path="/preferences" element={<PreferenceForm/>} />
        <Route path="/surveys" element={<ArcadeSongSelector />} />
        {/* <Route path="/rewards" element={<Rewards/>} /> */}
      </Routes>
    </Router>
  );
}

export default App;
