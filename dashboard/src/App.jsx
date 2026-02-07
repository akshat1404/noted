import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ExternalLink, Clock, LogOut, Copy, Check } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(localStorage.getItem('noted_user') || '');
  const [token, setToken] = useState(localStorage.getItem('noted_token') || '');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (token) {
      fetchNotes();
      // Sync with extension if already logged in
      window.dispatchEvent(new CustomEvent('NOTED_AUTH_SYNC', { detail: { token } }));
    }
  }, [token]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/notes`, {
        headers: { Authorization: token }
      });
      setNotes(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/auth`, { username: user });
      setToken(res.data.token);
      localStorage.setItem('noted_token', res.data.token);
      localStorage.setItem('noted_user', user);
      // Notify extension
      window.dispatchEvent(new CustomEvent('NOTED_AUTH_SYNC', { detail: { token: res.data.token } }));
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    setUser('');
    setToken('');
    localStorage.removeItem('noted_token');
    localStorage.removeItem('noted_user');
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="login-card">
          <h1>Noted Dashboard</h1>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Enter your name" 
              value={user} 
              onChange={(e) => setUser(e.target.value)}
              required
            />
            <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" width="20" alt="G" />
              Sign in with Google
            </button>
          </form>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
            Enter any username to create your unique dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="header">
        <div>
          <h1>Your Notes</h1>
          <p>Logged in as <strong>{user}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ color: '#059669', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={14} /> Extension Synced
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {loading ? (
        <p>Loading notes...</p>
      ) : (
        <div className="notes-grid">
          {notes.length === 0 ? (
            <p>No notes saved yet. Start saving from the extension!</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="note-card">
                <div className="domain">
                  <a href={note.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={12} style={{ marginRight: '4px' }} />
                    {note.domain}
                  </a>
                </div>
                <div className="content" dangerouslySetInnerHTML={{ __html: note.content }} />
                <div className="time">
                  <Clock size={12} style={{ marginRight: '4px' }} />
                  {new Date(note.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default App;
