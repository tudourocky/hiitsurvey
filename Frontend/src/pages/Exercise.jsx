import React from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoBox from '../VideoBox';
import Navbar from '../components/Navbar';

export default function Exercise() {
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('survey_id');

  return (
    <>
      <Navbar />
      <VideoBox surveyId={surveyId} />
    </>
  );
}
