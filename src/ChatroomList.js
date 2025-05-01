import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase'; // ⚡ 加 auth，因為要拿登入者資訊
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

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

    console.log('建立聊天室時的 user:', auth.currentUser);
    if (!auth.currentUser || !auth.currentUser.email) {
      alert('尚未登入或使用者資料尚未載入，請稍後再試');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'chatrooms'), {
        name: newChatroomName,
        members: [auth.currentUser.email]
      });
      setNewChatroomName('');
      navigate(`/chatroom/${docRef.id}`);
    } catch (error) {
      alert('建立失敗：' + error.message);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      borderRight: '1px solid #e0e0e0'
    }}>
      <div style={{ padding: '40px 24px 24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{ 
            margin: 0,
            fontSize: '20px',
            fontWeight: '500',
            letterSpacing: '0.3px'
          }}>聊天室列表</h3>
          <button 
            onClick={() => signOut(auth)}
            style={{
              padding: '4px 12px',
              background: '#FFF18A',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#000',
              fontSize: '12px',
              fontWeight: '500',
              minWidth: 'auto',
              marginLeft: '16px'
            }}
          >
            登出
          </button>
        </div>

        <form onSubmit={createChatroom}>
          <input
            type="text"
            value={newChatroomName}
            placeholder="輸入新的聊天室名稱"
            onChange={(e) => setNewChatroomName(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 12px',
              boxSizing: 'border-box',
              marginBottom: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button 
            type="submit" 
            style={{ 
              width: '100%',
              padding: '8px',
              background: '#FFF18A',
              color: '#000000',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            新增聊天室
          </button>
        </form>
      </div>

      <div style={{ 
        flex: 1,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          overflowY: 'scroll',
          paddingRight: '20px',
          boxSizing: 'border-box'
        }}>
          {chatrooms.map((room) => (
            <button
              key={room.id}
              onClick={() => navigate(`/chatroom/${room.id}`)}
              style={{ 
                padding: '15px 20px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid #e0e0e0',
                cursor: 'pointer',
                width: '100%',
                fontSize: '14px',
                display: 'block',
                margin: 0,
                boxSizing: 'border-box'
              }}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChatroomList;
