import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';

import {
  BrowserRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';

import ChatroomList from './ChatroomList';
import Chatroom from './chatroom';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState(null);

  // 監聽登入狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
      .then(() => alert('登入成功！'))
      .catch((error) => alert('登入失敗：' + error.message));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        alert('註冊成功！');
        setIsRegistering(false);
      })
      .catch((error) => alert('註冊失敗：' + error.message));
  };

  if (!user) {
    // 還沒登入的話顯示登入／註冊頁
    return (
      <div className="App" style={{ 
        maxWidth: '400px', 
        margin: '40px auto',
        padding: '40px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        background: 'white'
      }}>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '30px',
          color: '#2c3e50'
        }}>{isRegistering ? '註冊' : '登入'}</h1>
        <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <label style={{
              fontSize: '16px',
              color: '#2c3e50'
            }}>Email：</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <label style={{
              fontSize: '16px',
              color: '#2c3e50'
            }}>密碼：</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <button 
            type="submit" 
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              background: '#FFF18A',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px',
              transition: 'background 0.3s ease',
              color: '#2c3e50',
              fontWeight: '500'
            }}
          >
            {isRegistering ? '註冊' : '登入'}
          </button>
        </form>
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'underline',
              padding: '8px'
            }}
          >
            {isRegistering ? '切換到登入' : '沒有帳號？點這裡註冊'}
          </button>
        </div>
      </div>
    );
  }

  // 已經登入的話，顯示聊天室頁面（可以切換不同聊天室）
  return (
    <Router>
      <div style={{ 
        padding: '0', 
        height: '100vh',
        display: 'flex',
        gap: '0',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <style>{`
          @media (min-width: 1400px) {
            .chatroom-list-container {
              width: 25% !important;
              min-width: 300px !important;
              max-width: 450px !important;
            }
          }
          @media (min-width: 992px) and (max-width: 1399px) {
            .chatroom-list-container {
              width: 30% !important;
              min-width: 280px !important;
              max-width: 400px !important;
            }
          }
          @media (min-width: 768px) and (max-width: 991px) {
            .chatroom-list-container {
              width: 35% !important;
              min-width: 250px !important;
              max-width: 350px !important;
            }
          }
          @media (max-width: 767px) {
            .chatroom-list-container {
              width: 120px !important;
              min-width: 120px !important;
            }
            .main-content {
              flex: 1 !important;
              min-width: 0 !important;
            }
          }
        `}</style>
        <div className="chatroom-list-container" style={{ 
          width: '30%',
          minWidth: '280px',
          maxWidth: '400px',
          display: 'flex', 
          flexDirection: 'column',
          borderRight: '1px solid #e0e0e0'
        }}>
          <ChatroomList />
        </div>
        
        <div className="main-content" style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0
        }}>
          <Routes>
            <Route path="/" element={
              <div style={{ 
                height: '100%',
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                color: '#666'
              }}>
                請選擇或建立一個聊天室
              </div>
            } />
            <Route path="/chatroom/:chatroomId" element={<Chatroom />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
