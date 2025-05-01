import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import {
  doc,
  setDoc
} from 'firebase/firestore';

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
      .then(async (result) => {
        // 創建或更新使用者資訊
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          lastLogin: new Date()
        }, { merge: true });
        alert('登入成功！');
      })
      .catch((error) => alert('登入失敗：' + error.message));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (result) => {
        // 創建使用者資訊
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          createdAt: new Date(),
          lastLogin: new Date()
        });
        alert('註冊成功！');
        setIsRegistering(false);
      })
      .catch((error) => alert('註冊失敗：' + error.message));
  };

  const handleGoogleLogin = () => {
    signInWithPopup(auth, googleProvider)
      .then(async (result) => {
        console.log('Google 登入成功！', result.user);
        // 創建或更新使用者資訊
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          lastLogin: new Date()
        }, { merge: true });
      })
      .catch((error) => {
        console.error('Google 登入失敗：', {
          code: error.code,
          message: error.message,
          email: error.email,
          credential: error.credential
        });
        
        let errorMessage = '登入失敗';
        switch (error.code) {
          case 'auth/operation-not-allowed':
            errorMessage = 'Google 登入尚未在 Firebase Console 中啟用';
            break;
          case 'auth/popup-blocked':
            errorMessage = '登入視窗被瀏覽器阻擋，請允許彈出視窗';
            break;
          case 'auth/popup-closed-by-user':
            errorMessage = '登入視窗被關閉，請重試';
            break;
          default:
            errorMessage = `登入失敗：${error.message}`;
        }
        alert(errorMessage);
      });
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
          color: '#2c3e50',
          textAlign: 'center'
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

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
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

        <div style={{
          textAlign: 'center',
          margin: '20px 0',
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
          <span>或</span>
          <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
        </div>

        {/* Google 登入按鈕 */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}
        >
          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          使用 Google 帳號登入
        </button>
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
