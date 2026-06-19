import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Create/Join states
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Rooms states
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [copiedRoomCode, setCopiedRoomCode] = useState('');

  const fetchRooms = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setRooms(response.data.rooms);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserAndRooms = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data.user);
        await fetchRooms();
      } catch (err) {
        console.error(err);
        setError('Session expired. Please log in again.');
        // Clean stale data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndRooms();
  }, [navigate]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      setCreateError('Room name cannot be empty');
      return;
    }

    setCreateLoading(true);
    setCreateError('');
    setCreateSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/rooms/create`,
        { roomName: newRoomName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const createdRoom = response.data.room;
      setCreateSuccess(`Room "${createdRoom.roomName}" created! Code: ${createdRoom.roomCode}`);
      setNewRoomName('');
      await fetchRooms();
      // Clear success message after 5 seconds
      setTimeout(() => setCreateSuccess(''), 5000);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create room.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) {
      setJoinError('Room code cannot be empty');
      return;
    }

    setJoinLoading(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/rooms/join`,
        { roomCode: joinRoomCode.toUpperCase() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const joinedRoom = response.data.room;
      setJoinSuccess(`Successfully joined room "${joinedRoom.roomName}"! Redirecting...`);
      setJoinRoomCode('');
      setTimeout(() => {
        navigate(`/room/${joinedRoom.id}`);
      }, 1000);
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Failed to join room.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete the room "${roomName}"? This action will delete all messages in this room.`
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/rooms/${roomId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      await fetchRooms();
    } catch (err) {
      console.error('Failed to delete room:', err);
      alert(err.response?.data?.message || 'Failed to delete room. Please try again.');
    }
  };

  const handleCopyRoomCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedRoomCode(code);
    setTimeout(() => {
      setCopiedRoomCode('');
    }, 2000);
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      'Are you sure you want to permanently delete your account? This action cannot be undone.'
    );
    if (!confirmDelete) return;

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/auth/delete`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/signup');
    } catch (err) {
      setDeleteError(
        err.response?.data?.message || 'Failed to delete account. Please try again.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A0F] text-white flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0A0F] text-white flex justify-center items-center">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl max-w-sm text-center">
          <div className="text-red-400 mb-4 text-xl font-semibold">Error</div>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0A0F] bg-gradient-to-b from-[#110D23] to-[#0B0A0F] text-white">
      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 text-left bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Welcome, {user?.username || 'User'}!
          </h1>
          <p className="text-gray-400 text-left text-sm md:text-base">
            Create or join a workspace chat room to begin messaging in real time.
          </p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Room Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-xl hover:border-violet-500/30 transition-all duration-300 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-left">Create a New Room</h3>
              <p className="text-gray-400 text-sm mb-6 text-left leading-relaxed">
                Start a new chat room, get a unique room ID, and invite your team members.
              </p>
            </div>
            <div>
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-lg mb-4 text-center">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-2.5 rounded-lg mb-4 text-center font-medium">
                  {createSuccess}
                </div>
              )}
              <form onSubmit={handleCreateRoom} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter room name..."
                  value={newRoomName}
                  onChange={(e) => {
                    setNewRoomName(e.target.value);
                    if (createError) setCreateError('');
                  }}
                  className="flex-1 bg-[#13111A] text-white placeholder-gray-500 border border-white/10 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </form>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-xl hover:border-indigo-500/30 transition-all duration-300 group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013-3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-left">Join Existing Room</h3>
              <p className="text-gray-400 text-sm mb-6 text-left leading-relaxed">
                Connect to an active room using a shared room ID from your teammate.
              </p>
            </div>
            <div>
              {joinError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-lg mb-4 text-center">
                  {joinError}
                </div>
              )}
              {joinSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-2.5 rounded-lg mb-4 text-center font-medium">
                  {joinSuccess}
                </div>
              )}
              <form onSubmit={handleJoinRoom} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter room ID..."
                  value={joinRoomCode}
                  onChange={(e) => {
                    setJoinRoomCode(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  className="flex-1 bg-[#13111A] text-white placeholder-gray-500 border border-white/10 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {joinLoading ? 'Joining...' : 'Join'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Rooms Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-xl mb-12">
          <h3 className="text-2xl font-bold mb-6 text-left border-b border-white/10 pb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-violet-500 animate-pulse"></span>
            Rooms You Created ({rooms.length})
          </h3>
          {roomsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm italic">
              No workspace rooms created yet. Use the card above to create your first room!
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-1">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-[#13111A] border border-white/5 p-5 rounded-xl flex flex-col justify-between gap-4 hover:border-violet-500/30 hover:bg-[#161320] transition-all duration-300"
                >
                  <div className="text-left truncate">
                    <h4 className="font-bold text-lg text-white truncate">{room.roomName}</h4>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Code:{' '}
                      <span className="font-mono text-violet-400 select-all font-semibold bg-violet-500/10 px-2 py-0.5 rounded-md">{room.roomCode}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleCopyRoomCode(room.roomCode)}
                      className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 font-semibold px-3 py-2 rounded-lg border border-white/10 transition-colors cursor-pointer"
                    >
                      {copiedRoomCode === room.roomCode ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button
                      onClick={() => navigate(`/room/${room.id}`)}
                      className="text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer font-bold"
                    >
                      Enter Room
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id, room.roomName)}
                      className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile Card */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl max-w-md">
          <h4 className="text-lg font-bold mb-4 text-left border-b border-white/10 pb-2">Your Profile</h4>
          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-400">Account ID:</span>
              <span className="font-mono text-violet-400">{user?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Username:</span>
              <span className="font-semibold">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-gray-300">{user?.email}</span>
            </div>
          </div>

          {deleteError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-lg mb-4 text-center">
              {deleteError}
            </div>
          )}

          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 text-xs font-semibold py-3 px-4 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {deleteLoading ? 'Deleting Account...' : 'Delete Account'}
          </button>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
