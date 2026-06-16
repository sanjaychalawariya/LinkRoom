import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../socket';
import { API_BASE_URL } from '../api';

const Room = () => {
  const { roomId } = useParams(); // Can be roomId or roomCode
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chat states
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Copy status
  const [copied, setCopied] = useState(false);
  const [showMobileParticipants, setShowMobileParticipants] = useState(false);

  const chatBottomRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Room Info
  useEffect(() => {
    const fetchRoom = async () => {
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');

      if (!token || !userString) {
        navigate('/login');
        return;
      }

      const parsedUser = JSON.parse(userString);
      setCurrentUser(parsedUser);

      try {
        const response = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const roomData = response.data.room;
        setRoom(roomData);

        // Fetch messages history
        try {
          const messagesResponse = await axios.get(`${API_BASE_URL}/api/messages/${roomData.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const formattedMessages = messagesResponse.data.messages.map((msg) => ({
            _id: msg._id,
            content: msg.text,
            sender: {
              id: msg.sender._id,
              username: msg.sender.username,
            },
            createdAt: msg.createdAt,
          }));
          setMessages(formattedMessages);
        } catch (msgErr) {
          console.error('Failed to fetch messages history:', msgErr);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load room details.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, navigate]);

  // Setup Socket Connection
  useEffect(() => {
    if (!room || !currentUser) return;

    // Connect to backend server socket
    socket.connect();

    // Join room
    socket.emit('join_room', {
      roomId: room.id,
      user: { id: currentUser.id, username: currentUser.username },
    });

    // Listen for incoming messages
    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Listen for presence events
    socket.on('user_joined', ({ user, message }) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: Math.random().toString(),
          content: message,
          system: true,
          createdAt: new Date(),
        },
      ]);

      // Add user to participants locally if not present
      setRoom((prevRoom) => {
        if (!prevRoom) return prevRoom;
        const exists = prevRoom.participants.some((p) => p._id === user.id);
        if (exists) return prevRoom;
        return {
          ...prevRoom,
          participants: [...prevRoom.participants, { _id: user.id, username: user.username }],
        };
      });
    });

    socket.on('user_left', ({ user, message }) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: Math.random().toString(),
          content: message,
          system: true,
          createdAt: new Date(),
        },
      ]);

      // Remove user from participants locally
      setRoom((prevRoom) => {
        if (!prevRoom) return prevRoom;
        return {
          ...prevRoom,
          participants: prevRoom.participants.filter((p) => p._id !== user.id),
        };
      });
    });

    // Clean up on unmount
    return () => {
      socket.emit('leave_room', {
        roomId: room.id,
        user: { id: currentUser.id, username: currentUser.username },
      });
      // Remove listeners and disconnect
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.disconnect();
    };
  }, [room?.id, currentUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !room || !currentUser) return;

    // Emit message to Socket Server
    socket.emit('send_message', {
      roomId: room.id,
      content: newMessage,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
      },
    });

    setNewMessage('');
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A0F] text-white flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0A0F] text-white flex justify-center items-center">
        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl max-w-sm text-center">
          <div className="text-red-400 mb-4 text-xl font-semibold">Access Error</div>
          <p className="text-gray-300 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-2 px-4 rounded-xl border border-white/10 transition-all text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-69px)] bg-[#0B0A0F] text-white overflow-hidden">
      {/* Sidebar - Participants */}
      <aside className="w-72 bg-[#100D1B]/60 border-r border-white/10 flex flex-col justify-between hidden md:flex z-10">
        <div className="p-6 overflow-y-auto">
          {/* Room Header Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-2 text-left truncate">{room?.roomName}</h2>
            <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <span className="text-xs text-gray-400">Code: <strong className="text-violet-400 font-mono">{room?.roomCode}</strong></span>
              <button
                onClick={handleCopyCode}
                className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-left">
              Active Members ({room?.participants?.length || 0})
            </h3>
            <ul className="space-y-3">
              {room?.participants?.map((participant) => (
                <li key={participant._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {participant.username.substring(0, 2)}
                  </div>
                  <span className="text-sm font-semibold text-gray-300 truncate">
                    {participant.username}
                    {participant._id === room.owner._id && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md ml-2 font-medium">Owner</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            Leave Workspace
          </button>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <section className="flex-1 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#0B0A0F] to-[#120F24]">
        {/* Mobile Header */}
        <header className="p-4 border-b border-white/10 bg-[#100D1B]/80 backdrop-blur-md flex justify-between items-center md:hidden">
          <div className="truncate pr-4 flex-1">
            <h2 className="text-sm font-bold truncate text-left">{room?.roomName}</h2>
            <p className="text-[9px] text-gray-400 text-left font-mono">Code: {room?.roomCode}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setShowMobileParticipants(true)}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold px-2 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{room?.participants?.length || 0}</span>
            </button>
            <button
              onClick={handleCopyCode}
              className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 text-gray-300 font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Leave
            </button>
          </div>
        </header>

        {/* Message Flow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center px-4">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 mb-4 text-violet-400 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white mb-1">No Messages Yet</h4>
              <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                Be the first to send a message in this workspace chat room!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              // System notification style
              if (message.system) {
                return (
                  <div key={message._id} className="flex justify-center my-2">
                    <span className="bg-white/5 border border-white/5 text-gray-400 text-[11px] font-semibold px-3 py-1 rounded-full tracking-wide">
                      {message.content}
                    </span>
                  </div>
                );
              }

              // Normal message style
              const isOwnMessage = message.sender.id === currentUser?.id;
              const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={message._id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {/* Sender username */}
                    {!isOwnMessage && (
                      <span className="text-xs text-gray-400 font-semibold block mb-1 ml-1">
                        {message.sender.username}
                      </span>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed inline-block shadow-md ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none'
                          : 'bg-[#151221] border border-white/5 text-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] text-gray-500 block mt-1 px-1">
                      {formattedTime}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Chat Footer Input */}
        <footer className="p-6 border-t border-white/10 bg-[#0B0A0F]/65 backdrop-blur-md">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-[#13111A] text-white placeholder-gray-500 border border-white/10 px-5 py-3.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Send
            </button>
          </form>
        </footer>
      </section>

      {/* Mobile Participants Overlay Drawer */}
      {showMobileParticipants && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden flex justify-end">
          <div className="w-72 bg-[#100D1B] h-full p-6 flex flex-col justify-between border-l border-white/10 shadow-2xl transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Room Details</h3>
                <button
                  onClick={() => setShowMobileParticipants(false)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Room Header Info */}
              <div className="mb-8 font-sans">
                <h4 className="text-xl font-black text-white mb-2 text-left truncate">{room?.roomName}</h4>
                <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                  <span className="text-xs text-gray-400">Code: <strong className="text-violet-400 font-mono">{room?.roomCode}</strong></span>
                  <button
                    onClick={handleCopyCode}
                    className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Participants List */}
              <div className="font-sans">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 text-left">
                  Active Members ({room?.participants?.length || 0})
                </h3>
                <ul className="space-y-3 overflow-y-auto max-h-[50vh]">
                  {room?.participants?.map((participant) => (
                    <li key={participant._id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {participant.username.substring(0, 2)}
                      </div>
                      <span className="text-sm font-semibold text-gray-300 truncate">
                        {participant.username}
                        {participant._id === room.owner._id && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md ml-2 font-medium">Owner</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <button
                onClick={() => {
                  setShowMobileParticipants(false);
                  navigate('/dashboard');
                }}
                className="w-full bg-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-gray-300 border border-white/10 font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 active:scale-95 cursor-pointer"
              >
                Leave Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;
