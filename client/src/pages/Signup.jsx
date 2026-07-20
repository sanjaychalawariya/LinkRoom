import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { username, email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('All fields are required');
      return;
    }

    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(email)) {
      setError('Email must be a valid @gmail.com address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        username,
        email,
        password,
      });

      setSuccess('User registered successfully! Redirecting to login...');
      setFormData({ username: '', email: '', password: '' });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error("Signup error details:", err);
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fefae0] bg-gradient-to-tr from-[#e9edc9]/50 to-[#fefae0] flex flex-col justify-center items-center px-4">
      {/* Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#ccd5ae]/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#faedcd]/60 backdrop-blur-xl border-2 border-[#ccd5ae]/30 p-8 rounded-[32px] shadow-xl shadow-[#ccd5ae]/10 z-10">
        <h2 className="text-3xl font-extrabold text-[#2b271d] text-center mb-2 tracking-tight">
          Create Account
        </h2>
        <p className="text-[#4a4538]/80 text-center mb-8 text-sm">
          Join LinkRoom and connect with friends in real time
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-550 text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm p-3 rounded-lg mb-6 text-center font-medium animate-pulse">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[#2b271d] text-xs font-bold uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={username}
              onChange={handleChange}
              placeholder="username"
              className="w-full bg-[#fefae0] text-[#2b271d] placeholder-[#4a4538]/50 border-2 border-[#ccd5ae]/40 px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#d4a373]/30 focus:border-[#d4a373] transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-[#2b271d] text-xs font-bold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="email@gmail.com"
              className="w-full bg-[#fefae0] text-[#2b271d] placeholder-[#4a4538]/50 border-2 border-[#ccd5ae]/40 px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#d4a373]/30 focus:border-[#d4a373] transition-all duration-200"
              required
            />
          </div>

          <div>
            <label className="block text-[#2b271d] text-xs font-bold uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full bg-[#fefae0] text-[#2b271d] placeholder-[#4a4538]/50 border-2 border-[#ccd5ae]/40 px-5 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#d4a373]/30 focus:border-[#d4a373] transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] hover:opacity-90 text-[#2b271d] font-black py-3.5 px-4 rounded-full shadow-md shadow-[#d4a373]/15 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-[#4a4538]/80 text-center mt-8 text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#d4a373] hover:underline font-bold transition-colors duration-200"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
