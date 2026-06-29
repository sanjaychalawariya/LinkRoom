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

  // Typing states
  const [typingUsers, setTypingUsers] = useState({});
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  const chatBottomRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getTypingText = () => {
    const names = Object.values(typingUsers);
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return 'Several people are typing...';
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
      setTypingUsers((prevTyping) => {
        const next = { ...prevTyping };
        delete next[message.sender.id];
        return next;
      });
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

      // Clear from typing users
      setTypingUsers((prevTyping) => {
        const next = { ...prevTyping };
        delete next[user.id];
        return next;
      });
    });

    // Listen for typing events
    socket.on('user_typing', ({ user }) => {
      setTypingUsers((prevTyping) => ({
        ...prevTyping,
        [user.id]: user.username,
      }));
    });

    socket.on('user_stop_typing', ({ user }) => {
      setTypingUsers((prevTyping) => {
        const next = { ...prevTyping };
        delete next[user.id];
        return next;
      });
    });

    // Clean up on unmount
    return () => {
      socket.emit('leave_room', {
        roomId: room.id,
        user: { id: currentUser.id, username: currentUser.username },
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Remove listeners and disconnect
      socket.off('receive_message');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.disconnect();
    };
  }, [room?.id, currentUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !room || !currentUser) return;

    // Clear typing indicator status
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      socket.emit('stop_typing', {
        roomId: room.id,
        user: { id: currentUser.id, username: currentUser.username },
      });
      isTypingRef.current = false;
    }

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

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !room || !currentUser) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', {
        roomId: room.id,
        user: { id: currentUser.id, username: currentUser.username },
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', {
        roomId: room.id,
        user: { id: currentUser.id, username: currentUser.username },
      });
      isTypingRef.current = false;
    }, 2000);
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fefae0] text-[#2b271d] flex justify-center items-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#4a4538]/70 text-sm font-bold">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fefae0] text-[#2b271d] flex justify-center items-center">
        <div className="bg-[#faedcd]/60 border-2 border-[#ccd5ae]/30 p-8 rounded-[32px] max-w-sm text-center">
          <div className="text-rose-600 mb-4 text-xl font-bold">Access Error</div>
          <p className="text-[#4a4538] text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-white/5 hover:bg-white/10 text-[#4a4538] font-bold py-2 px-4 rounded-full border border-[#ccd5ae]/30 transition-all text-sm cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-[#fefae0] text-[#2b271d] overflow-hidden p-4">
      {/* Sidebar - Participants */}
      <aside className="w-72 bg-[#faedcd]/50 border-2 border-[#ccd5ae]/20 flex flex-col justify-between hidden md:flex z-10 rounded-[32px] p-6 shadow-sm mr-4">
        <div className="overflow-y-auto">
          {/* Room Header Info */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#2b271d] mb-2 text-left truncate">{room?.roomName}</h2>
            <div className="flex items-center justify-between bg-[#fefae0] border border-[#ccd5ae]/40 px-3.5 py-2.5 rounded-2xl">
              <span className="text-xs text-[#4a4538]">Code: <strong className="text-[#d4a373] font-mono font-bold">{room?.roomCode}</strong></span>
              <button
                onClick={handleCopyCode}
                className="text-xs bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] text-[#2b271d] font-black px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div>
            <h3 className="text-xs font-bold text-[#4a4538] uppercase tracking-wider mb-4 text-left">
              Active Members ({room?.participants?.length || 0})
            </h3>
            <ul className="space-y-3">
              {room?.participants?.map((participant) => (
                <li key={participant._id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ccd5ae]/30 border border-[#ccd5ae]/60 text-[#4a4538] flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {participant.username.substring(0, 2)}
                  </div>
                  <span className="text-sm font-semibold text-[#4a4538] truncate">
                    {participant.username}
                    {participant._id === room.owner._id && (
                      <span className="text-[10px] bg-[#d4a373]/15 text-[#d4a373] border border-[#d4a373]/30 px-2 py-0.5 rounded-full ml-2 font-bold">Owner</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#ccd5ae]/20">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-white/5 hover:bg-rose-500/10 hover:text-rose-600 border border-[#ccd5ae]/40 text-[#4a4538] font-bold py-3 px-4 rounded-full text-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            Leave Workspace
          </button>
        </div>
      </aside>

      {/* Main Chat Panel */}
      <section className="flex-1 flex flex-col justify-between overflow-hidden bg-[#faedcd]/20 border-2 border-[#ccd5ae]/20 rounded-[32px] shadow-sm">
        {/* Mobile Header */}
        <header className="p-4 border-b border-[#ccd5ae]/20 bg-[#faedcd]/90 backdrop-blur-md flex justify-between items-center md:hidden rounded-t-[30px]">
          <div className="truncate pr-4 flex-1">
            <h2 className="text-sm font-bold truncate text-left text-[#2b271d]">{room?.roomName}</h2>
            <p className="text-[9px] text-[#4a4538] text-left font-mono">Code: {room?.roomCode}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setShowMobileParticipants(true)}
              className="text-xs bg-white/5 border border-[#ccd5ae]/30 text-[#4a4538] font-bold px-2 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{room?.participants?.length || 0}</span>
            </button>
            <button
              onClick={handleCopyCode}
              className="text-xs bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] text-[#2b271d] font-black px-2.5 py-1.5 rounded-full transition-all cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs bg-white/5 hover:bg-rose-500/10 hover:text-rose-600 border border-[#ccd5ae]/30 text-[#4a4538] font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer"
            >
              Leave
            </button>
          </div>
        </header>

        {/* Message Flow */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center px-4">
              <div className="w-16 h-16 bg-[#faedcd] rounded-full flex items-center justify-center border border-[#ccd5ae]/40 mb-4 text-[#d4a373]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-lg font-black text-[#2b271d] mb-1">No Messages Yet</h4>
              <p className="text-[#4a4538]/70 text-sm max-w-xs leading-relaxed">
                Be the first to send a message in this workspace chat room!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              // System notification style
              if (message.system) {
                return (
                  <div key={message._id} className="flex justify-center my-2">
                    <span className="bg-[#faedcd]/60 border border-[#ccd5ae]/30 text-[#4a4538] text-[11px] font-bold px-4 py-1.5 rounded-full tracking-wide">
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
                      <span className="text-xs text-[#4a4538] font-bold block mb-1 ml-1">
                        {message.sender.username}
                      </span>
                    )}

                    {/* Chat Bubble */}
                    <div
                      className={`px-5 py-3.5 rounded-[24px] text-sm leading-relaxed inline-block shadow-sm ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] text-[#2b271d] font-semibold rounded-tr-none'
                          : 'bg-[#faedcd]/85 border-2 border-[#ccd5ae]/15 text-[#2b271d] rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-[9px] text-[#4a4538]/60 block mt-1 px-1">
                      {formattedTime}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#4a4538] italic bg-[#faedcd]/50 border border-[#ccd5ae]/30 px-4 py-2 rounded-full w-fit animate-pulse my-2">
              <div className="flex gap-1 shrink-0">
                <span className="w-1.5 h-1.5 bg-[#d4a373] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#d4a373] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#d4a373] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>{getTypingText()}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Chat Footer Input */}
        <footer className="p-4 border-t border-[#ccd5ae]/20 bg-[#faedcd]/10">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
              className="flex-1 bg-[#fefae0] text-[#2b271d] placeholder-[#4a4538]/50 border-2 border-[#ccd5ae]/50 px-5 py-3.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#d4a373]/30 focus:border-[#d4a373] transition-all duration-205"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none text-[#2b271d] font-black text-sm px-8 py-3.5 rounded-full shadow-sm shadow-[#d4a373]/10 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Send
            </button>
          </form>
        </footer>
      </section>

      {/* Mobile Participants Overlay Drawer */}
      {showMobileParticipants && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 md:hidden flex justify-end">
          <div className="w-72 bg-[#fefae0] h-full p-6 flex flex-col justify-between border-l-2 border-[#ccd5ae]/30 shadow-2xl rounded-l-[32px] transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[#2b271d]">Room Details</h3>
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
                <h4 className="text-xl font-black text-[#2b271d] mb-2 text-left truncate">{room?.roomName}</h4>
                <div className="flex items-center justify-between bg-[#faedcd]/60 border border-[#ccd5ae]/40 px-3.5 py-2.5 rounded-2xl">
                  <span className="text-xs text-[#4a4538]">Code: <strong className="text-[#d4a373] font-mono font-bold">{room?.roomCode}</strong></span>
                  <button
                    onClick={handleCopyCode}
                    className="text-xs bg-gradient-to-r from-[#ccd5ae] to-[#d4a373] text-[#2b271d] font-black px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Participants List */}
              <div className="font-sans">
                <h3 className="text-xs font-bold text-[#4a4538] uppercase tracking-wider mb-4 text-left">
                  Active Members ({room?.participants?.length || 0})
                </h3>
                <ul className="space-y-3 overflow-y-auto max-h-[50vh]">
                  {room?.participants?.map((participant) => (
                    <li key={participant._id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ccd5ae]/30 border border-[#ccd5ae]/60 text-[#4a4538] flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                        {participant.username.substring(0, 2)}
                      </div>
                      <span className="text-sm font-semibold text-[#4a4538] truncate">
                        {participant.username}
                        {participant._id === room.owner._id && (
                          <span className="text-[10px] bg-[#d4a373]/15 text-[#d4a373] border border-[#d4a373]/30 px-2 py-0.5 rounded-full ml-2 font-bold">Owner</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-[#ccd5ae]/20 pt-4">
              <button
                onClick={() => {
                  setShowMobileParticipants(false);
                  navigate('/dashboard');
                }}
                className="w-full bg-white/5 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 text-[#2b271d] border border-[#ccd5ae]/40 font-bold py-3 px-4 rounded-full text-sm transition-all duration-200 active:scale-95 cursor-pointer"
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
