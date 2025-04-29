import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function ChatroomList() {
  const [chatrooms, setChatrooms] = useState([]);
  const [newChatroomName, setNewChatroomName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'chatrooms'), (snapshot) => {
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatrooms(rooms);
    });

    return () => unsubscribe();
  }, []);

  const createChatroom = async (e) => {
    e.preventDefault();
    if (!newChatroomName.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'chatrooms'), {
        name: newChatroomName
      });
      setNewChatroomName('');
      navigate(`/chatroom/${docRef.id}`);
    } catch (error) {
      alert('建立失敗：' + error.message);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>聊天室列表</h1>

      <form onSubmit={createChatroom} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newChatroomName}
          placeholder="輸入新的聊天室名稱"
          onChange={(e) => setNewChatroomName(e.target.value)}
          style={{ width: '250px', padding: '8px' }}
        />
        <button type="submit" style={{ marginLeft: '8px' }}>新增聊天室</button>
      </form>

      <div>
        {chatrooms.map((room) => (
          <div key={room.id} style={{ marginBottom: '12px' }}>
            <button
              onClick={() => navigate(`/chatroom/${room.id}`)}
              style={{ fontSize: '18px', padding: '8px 16px' }}
            >
              {room.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatroomList;
