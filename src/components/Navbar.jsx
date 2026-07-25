import { NavLink } from 'react-router-dom';
import { FiFileText, FiGrid, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <div className="navbar-logo-icon">
            <FiFileText />
          </div>
          <span className="navbar-title">SHREEJI MOTORS</span>
        </div>
        <div className="navbar-links">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end
          >
            <FiFileText className="nav-link-icon" />
            <span>New Bill</span>
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <FiGrid className="nav-link-icon" />
            <span>Admin Panel</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{ background: 'transparent', cursor: 'pointer', border: 'none' }}
            title="Log Out"
          >
            <FiLogOut className="nav-link-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
