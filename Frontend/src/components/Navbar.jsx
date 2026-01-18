import { Link } from "react-router-dom";
import "./Navbar.css";
import { user,} from "../shared/supabase"; 
import SignIn from "../pages/SignIn";
import { signOut } from "../shared/supabase";

export default function Navbar() {

  return (
    <nav className="arcade-navbar">
      <div className="navbar-links">
        <Link to="/" className="nav-link">Home</Link> 
        <Link to="/surveys" className="nav-link">Surveys</Link>
        <Link to="/preferences" className="nav-link">Workout Settings</Link>
        <Link to="/rewards" className="nav-link">Rewards</Link>
        <Link to="/exercise" className="nav-link">Go!</Link>
        { user.data.user ? 
          <Link to="/" className="nav-link" onClick={signOut}>Log Out</Link>: 
          <Link to="/signin" className="nav-link" reloadDocument>Log In</Link>
        }
      </div>
    </nav>
  );
}
