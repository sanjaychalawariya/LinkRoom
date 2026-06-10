import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="w-full bg-[#0B0A0F]/80 backdrop-blur-md border-b border-white/10 py-4 px-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Brand/Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-900/30 group-hover:rotate-6 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-xl font-black text-white tracking-wider bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
            LinkRoom
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          {token ? (
            <>
              <Link
                to="/dashboard"
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive('/dashboard') ? 'text-violet-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <div className="h-4 w-px bg-white/10"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  Hi, <strong className="text-gray-200 font-semibold">{user?.username}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-gray-300 border border-white/10 text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive('/login') ? 'text-violet-400' : 'text-gray-300 hover:text-white'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition-all duration-200 active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
