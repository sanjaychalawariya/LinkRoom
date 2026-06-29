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
    <nav className="mx-auto max-w-6xl w-[95%] mt-4 bg-[#e9edc9]/80 backdrop-blur-md border-2 border-[#ccd5ae]/40 py-3.5 px-4 md:px-6 sticky top-4 z-50 rounded-full shadow-md">
      <div className="flex justify-between items-center">
        {/* Brand/Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-gradient-to-tr from-[#ccd5ae] to-[#d4a373] rounded-full flex items-center justify-center shadow-md shadow-[#d4a373]/10 group-hover:rotate-6 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#fefae0]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-lg md:text-xl font-black text-[#2b271d] tracking-wider group-hover:opacity-90 transition-opacity">
            LinkRoom
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-3 md:gap-6">
          {token ? (
            <>
              <Link
                to="/dashboard"
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive('/dashboard') ? 'text-[#d4a373] font-bold' : 'text-[#4a4538] hover:text-[#2b271d]'
                }`}
              >
                Dashboard
              </Link>
              <div className="h-4 w-px bg-[#ccd5ae]/50"></div>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-sm text-[#4a4538] hidden sm:inline">
                  Hi, <strong className="text-[#2b271d] font-bold">{user?.username}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-[#fefae0] hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/25 text-[#4a4538] border border-[#ccd5ae] text-xs font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all duration-200 cursor-pointer active:scale-95"
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 md:gap-4">
              <Link
                to="/login"
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isActive('/login') ? 'text-[#d4a373] font-bold' : 'text-[#4a4538] hover:text-[#2b271d]'
                }`}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] hover:opacity-90 text-[#2b271d] text-xs font-black px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm shadow-[#d4a373]/15 transition-all duration-200 active:scale-95"
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
