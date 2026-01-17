
import { RewardProvider } from './contexts/RewardContext';
import WorkoutSelector from './components/WorkoutSelector';
import Navbar from "../components/Navbar"


export default function Rewards(){
    return (
        <>
            <RewardProvider>
                <Navbar />
            <WorkoutSelector />
            </RewardProvider>
        </>

    )
}