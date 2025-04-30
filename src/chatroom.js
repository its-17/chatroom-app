import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

function Chatroom() {
  const { chatroomId } = useParams();
  const navigate = useNavigate();
  const [chatroomName, setChatroomName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState([]);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let unsubMessages = null;

    const checkPermission = async () => {
      const chatroomRef = doc(db, 'chatrooms', chatroomId);
      const chatroomSnap = await getDoc(chatroomRef);

      if (chatroomSnap.exists()) {
        const data = chatroomSnap.data();
        setChatroomName(data.name || '');

        if (!Array.isArray(data.members) || !data.members.includes(auth.currentUser.email)) {
          if (!hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            alert('你不是這個聊天室的成員！');
            navigate('/');
          }
          return;
        }

        setMembers(data.members || []);

        const q = query(
          collection(db, 'chatrooms', chatroomId, 'messages'),
          orderBy('createdAt')
        );
        unsubMessages = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(msgs);
        });
      } else {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          alert('聊天室不存在！');
          navigate('/');
        }
        return;
      }
    };

    checkPermission();

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [chatroomId, navigate]);

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

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (inviteEmail === auth.currentUser.email) {
      alert('不能邀請自己！');
      setInviteEmail('');
      return;
    }

    try {
      const chatroomRef = doc(db, 'chatrooms', chatroomId);
      const chatroomSnap = await getDoc(chatroomRef);

      if (chatroomSnap.exists()) {
        const existingMembers = chatroomSnap.data().members || [];
        if (!existingMembers.includes(inviteEmail)) {
          await updateDoc(chatroomRef, {
            members: [...existingMembers, inviteEmail]
          });
          setMembers(prev => [...prev, inviteEmail]);
          alert(`成功邀請 ${inviteEmail} 加入聊天室！`);
          setInviteEmail('');
        } else {
          alert('此使用者已經是成員！');
          setInviteEmail('');
        }
      }
    } catch (error) {
      alert('邀請失敗：' + error.message);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      height: '100vh', 
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 上方返回與標題 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => auth.signOut()}>登出</button>
          <button onClick={() => navigate(-1)}>⬅ 返回至聊天列表</button>
        </div>
        <h2 style={{ flex: 1, textAlign: 'center', margin: 0 }}>{chatroomName || '聊天室'}</h2>
      </div>

      {/* 主體左右區塊 */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* 左側訊息區 */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{
            flex: 1,
            border: '1px solid #ccc',
            padding: '10px',
            overflowY: 'auto',
            marginBottom: 0,
            minHeight: 0
          }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: '10px' }}>
                <strong>{msg.email}</strong>：{msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage} style={{ display: 'flex', borderTop: '1px solid #ccc', padding: '8px 0', background: '#fff' }}>
            <input
              type="text"
              value={message}
              placeholder="輸入訊息"
              onChange={(e) => setMessage(e.target.value)}
              style={{ flex: 1, padding: '8px' }}
            />
            <button type="submit" style={{ marginLeft: '8px' }}>送出</button>
          </form>
        </div>

        {/* 右側成員與邀請區 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ 
            maxHeight: 'calc(100vh - 300px)', 
            overflowY: 'auto',
            border: '1px solid #ccc',
            padding: '10px',
            marginBottom: '10px'
          }}>
            <h4>聊天室成員：</h4>
            {members.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {members.map((member, index) => (
                  <li key={index}>{member}</li>
                ))}
              </ul>
            ) : (
              <p>暫無成員</p>
            )}
          </div>

          <form onSubmit={inviteMember}>
            <input
              type="email"
              placeholder="輸入要邀請的 Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
            />
            <button type="submit" style={{ width: '100%' }}>邀請成員</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chatroom;
