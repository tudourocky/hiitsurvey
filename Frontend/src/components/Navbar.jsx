import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <Link to="/">Home</Link> 
      <Link to="/rewards">rewards</Link>
      <Link to="/preferences">Workout preferences</Link>
      <Link to="/surveys">surveys</Link>
    </nav>
  );
}