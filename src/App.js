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
  useNavigate
} from 'react-router-dom';

import ChatroomList from './ChatroomList';
import Chatroom from './chatroom';

function AuthGate() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 監聽登入狀態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

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
    return (
      <div className="App">
        <h1>{isRegistering ? '註冊' : '登入'}</h1>
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div>
            <label>Email：</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label>密碼：</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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

  return (
    <div>
      <button onClick={() => signOut(auth)}>登出</button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<><AuthGate /><ChatroomList /></>} />
        <Route path="/chatroom/:chatroomId" element={<><AuthGate /><Chatroom /></>} />
      </Routes>
    </Router>
  );
}

export default App;
