import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
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
      <div className="App" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
        <h1>{isRegistering ? '註冊' : '登入'}</h1>
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div>
            <label>Email：</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>密碼：</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">{isRegistering ? '註冊' : '登入'}</button>
        </form>
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? '切換到登入' : '沒有帳號？點這裡註冊'}
          </button>
        </div>
      </div>
    );
  }

  // 已經登入的話，顯示聊天室頁面（可以切換不同聊天室）
  return (
    <Router>
      <div style={{ padding: '20px' }}>
        <button onClick={() => signOut(auth)} style={{ marginBottom: '20px' }}>
          登出
        </button>

        <Routes>
          <Route path="/" element={<ChatroomList />} />
          <Route path="/chatroom/:chatroomId" element={<Chatroom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
