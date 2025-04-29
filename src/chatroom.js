import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

function Chatroom() {
  const { chatroomId } = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatroomId) return;

    const q = query(
      collection(db, 'chatrooms', chatroomId, 'messages'),
      orderBy('createdAt')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatroomId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await addDoc(collection(db, 'chatrooms', chatroomId, 'messages'), {
        text: message,
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        createdAt: serverTimestamp()
      });
      setMessage('');
    } catch (error) {
      alert('送出失敗：' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>聊天室 ID：{chatroomId}</h2>

      <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '10px' }}>
            <strong>{msg.email}</strong>：{msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={message}
          placeholder="輸入訊息"
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: '300px', padding: '8px' }}
        />
        <button type="submit" style={{ marginLeft: '8px' }}>送出</button>
      </form>
    </div>
  );
}

export default Chatroom;
