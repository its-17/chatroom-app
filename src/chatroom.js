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
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  where,
  deleteDoc
} from 'firebase/firestore';

function Chatroom() {
  const { chatroomId } = useParams();
  const navigate = useNavigate();
  const [chatroomName, setChatroomName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState([]);
  const [blockedUids, setBlockedUids] = useState([]);
  const [blockedByUids, setBlockedByUids] = useState([]);
  const hasRedirectedRef = useRef(false);
  const [searchText, setSearchText] = useState('');
  const messagesEndRef = useRef(null);
  const [memberUids, setMemberUids] = useState({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 當訊息更新時自動滾動
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 監聽自己 block list
  useEffect(() => {
    if (!auth.currentUser) return;
    const ref = doc(db, 'userBlockLists', auth.currentUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setBlockedUids(snap.exists() ? (snap.data().blockedUids || []) : []);
    });
    return unsub;
  }, []);

  // 監聽所有 block list，找出封鎖自己的 user
  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'userBlockLists'));
    const unsub = onSnapshot(q, (snap) => {
      const blockedBy = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (Array.isArray(data.blockedUids) && data.blockedUids.includes(auth.currentUser.uid)) {
          blockedBy.push(docSnap.id);
        }
      });
      setBlockedByUids(blockedBy);
    });
    return unsub;
  }, []);

  // 訊息過濾
  useEffect(() => {
    let unsubMessages = null;
    const checkPermission = async () => {
      const chatroomRef = doc(db, 'chatrooms', chatroomId);
      const chatroomSnap = await getDoc(chatroomRef);
      if (chatroomSnap.exists()) {
        const data = chatroomSnap.data();
        console.log('聊天室資料:', data);
        console.log('目前使用者:', auth.currentUser.email);
        console.log('成員列表:', data.members);
        setChatroomName(data.name || '');
        if (!Array.isArray(data.members) || !data.members.includes(auth.currentUser.email)) {
          console.log('成員檢查失敗:', {
            isArray: Array.isArray(data.members),
            members: data.members,
            currentUser: auth.currentUser.email
          });
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
          // 過濾：不是你封鎖的，也不是封鎖你的
          const filteredMsgs = msgs.filter(msg => {
            return !blockedUids.includes(msg.uid) && !blockedByUids.includes(msg.uid);
          });
          setMessages(filteredMsgs);
        });
      } else {
        console.log('聊天室不存在:', chatroomId);
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          alert('聊天室不存在！');
          navigate('/');
        }
        return;
      }
    };
    checkPermission();
    return () => { if (unsubMessages) unsubMessages(); };
  }, [chatroomId, navigate, blockedUids, blockedByUids]);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        if (typeof Notification === 'undefined') {
          console.log('此瀏覽器不支援通知功能');
          return;
        }
        
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          console.log('通知權限狀態:', permission);
        }
      } catch (error) {
        console.log('請求通知權限時發生錯誤:', error);
      }
    };
    
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    
    const showNotification = async (msg) => {
      try {
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted' &&
          msg.email !== auth.currentUser.email &&
          document.visibilityState !== 'visible'
        ) {
          await new Notification(`來自 ${msg.email} 的新訊息`, {
            body: msg.text,
            icon: '/favicon.ico' // 使用網站的 favicon 作為通知圖示
          });
        }
      } catch (error) {
        console.log('顯示通知時發生錯誤:', error);
      }
    };

    const latestMsg = messages[messages.length - 1];
    showNotification(latestMsg);
  }, [messages]);

  // 在 useEffect 中獲取所有成員的 uid
  useEffect(() => {
    const fetchMemberUids = async () => {
      const uidMap = {};
      for (const memberEmail of members) {
        const q = query(
          collection(db, 'users'),
          where('email', '==', memberEmail)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          uidMap[memberEmail] = snapshot.docs[0].id;
        }
      }
      setMemberUids(uidMap);
    };
    
    if (members.length > 0) {
      fetchMemberUids();
    }
  }, [members]);

  // block/unblock
  const toggleBlockUser = async (targetEmail, targetUid) => {
    if (targetEmail === auth.currentUser.email) {
      alert('不能封鎖自己');
      return;
    }
    const myBlockRef = doc(db, 'userBlockLists', auth.currentUser.uid);
    if (blockedUids.includes(targetUid)) {
      await updateDoc(myBlockRef, { blockedUids: arrayRemove(targetUid) });
      alert(`已解除封鎖 ${targetEmail}`);
    } else {
      await setDoc(myBlockRef, { blockedUids: arrayUnion(targetUid) }, { merge: true });
      alert(`已封鎖 ${targetEmail}`);
    }
  };

  // 修改發送訊息功能
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

  // 收回訊息功能
  const unsendMessage = async (msgId, text) => {
    const msgRef = doc(db, 'chatrooms', chatroomId, 'messages', msgId);
    await updateDoc(msgRef, {
      originalText: text,
      text: '此訊息已被收回',
      retracted: true
    });
  };

  // 復原訊息功能
  const restoreMessage = async (msgId, originalText) => {
    const msgRef = doc(db, 'chatrooms', chatroomId, 'messages', msgId);
    await updateDoc(msgRef, {
      text: originalText,
      retracted: false,
      originalText: ''
    });
  };

  const deleteChatroom = async (chatroomId) => {
    if (!window.confirm('確定要刪除這個聊天室嗎？此動作無法復原！')) return;
    try {
      await deleteDoc(doc(db, 'chatrooms', chatroomId));
      alert('聊天室已刪除');
    } catch (error) {
      alert('刪除失敗：' + error.message);
    }
  };

  return (
    <>
      {console.log('渲染時的成員列表:', members)}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        .message-item {
          animation: slideIn 0.3s ease-out;
        }

        .block-button {
          transition: all 0.3s ease;
        }

        .block-button:hover {
          transform: scale(1.1);
        }

        .block-button.blocked {
          animation: shake 0.5s ease-in-out;
        }

        .retracted-message {
          animation: fadeIn 0.3s ease-out;
        }

        .chatroom-container {
          animation: fadeIn 0.5s ease-out;
        }

        .chatroom-memberlist {
          animation: slideIn 0.5s ease-out;
        }

        .chatroom-input input:focus {
          animation: pulse 0.3s ease-out;
        }

        @media (max-width: 768px) {
          .chatroom-container {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
          }
          .chatroom-header {
            flex: 0 0 auto !important;
            padding: 10px !important;
          }
          .chatroom-main {
            flex: 1 0 0 !important;
            min-height: 0 !important;
            flex-direction: column !important;
            gap: 10px !important;
            padding: 10px !important;
          }
          .chatroom-left {
            flex: 1 0 0 !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .chatroom-msglist {
            flex: 1 0 0 !important;
            min-height: 0 !important;
            padding: 10px !important;
          }
          .chatroom-input {
            flex: 0 0 auto !important;
            padding: 10px !important;
          }
          .chatroom-right {
            flex: 0 0 auto !important;
            height: auto !important;
            max-height: 200px !important;
            overflow-y: auto !important;
            width: 100% !important;
          }
          .chatroom-memberlist {
            max-height: none !important;
          }
        }
      `}</style>
      <div className="chatroom-container" style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="chatroom-header" style={{ 
          padding: '20px',
          borderBottom: '1px solid #e0e0e0',
          flex: '0 0 auto'
        }}>
          <h2 style={{ 
            margin: '0', 
            fontSize: '24px',
            fontWeight: '500',
            color: '#2c3e50'
          }}>
            {chatroomName || '未命名聊天室'}
          </h2>
        </div>

        <div className="chatroom-main" style={{ 
          display: 'flex',
          gap: '20px',
          padding: '20px',
          flex: '1 0 0',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          <div className="chatroom-left" style={{ 
            flex: '1 0 0',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="chatroom-msglist" style={{
              flex: '1 0 0',
              minHeight: 0,
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '20px',
              marginBottom: '20px',
              background: 'white',
              overflowY: 'auto'
            }}>
              <div style={{
                position: 'sticky',
                top: 0,
                background: 'white',
                marginBottom: '20px',
                zIndex: 1
              }}>
                <input
                  type="text"
                  placeholder="搜尋訊息內容"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages
                  .filter(msg => 
                    searchText === '' || 
                    msg.text.toLowerCase().includes(searchText.toLowerCase())
                  )
                  .map((msg) => (
                    <div key={msg.id} className="message-item" style={{ 
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <strong style={{ 
                          whiteSpace: 'nowrap',
                          color: '#2c3e50'
                        }}>
                          {msg.email}
                        </strong>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {msg.retracted ? (
                          <div className="retracted-message">
                            <span style={{ color: '#888', fontStyle: 'italic' }}>{msg.text}</span>
                            {msg.email === auth.currentUser.email && msg.originalText && (
                              <button 
                                onClick={() => restoreMessage(msg.id, msg.originalText)}
                                style={{ 
                                  marginLeft: '8px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '4px',
                                  background: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                復原
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
                            {msg.email === auth.currentUser.email && (
                              <button 
                                onClick={() => unsendMessage(msg.id, msg.text)}
                                style={{ 
                                  marginLeft: '8px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  border: '1px solid #e0e0e0',
                                  borderRadius: '4px',
                                  background: 'white',
                                  cursor: 'pointer'
                                }}
                              >
                                收回
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="chatroom-input" style={{ 
              flex: '0 0 auto'
            }}>
              <form 
                onSubmit={sendMessage} 
                style={{ 
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <input
                  type="text"
                  value={message}
                  placeholder={`以 ${auth.currentUser.email} 的身分輸入訊息...`}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ 
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <button 
                  type="submit"
                  style={{ 
                    padding: '0 24px',
                    whiteSpace: 'nowrap',
                    background: '#FFF18A',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  送出
                </button>
              </form>
            </div>
          </div>

          <div className="chatroom-right" style={{ 
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: '0 0 auto'
          }}>
            <div className="chatroom-memberlist" style={{ 
              flex: 1,
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '20px',
              overflowY: 'auto',
              background: 'white',
              minHeight: '300px'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Chat 成員</h4>
              {members.length > 0 ? (
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {members.map((member, index) => {
                    const memberUid = memberUids[member];
                    
                    return (
                      <div 
                        key={index}
                        style={{
                          padding: '8px 12px',
                          background: '#f8f9fa',
                          borderRadius: '4px',
                          fontSize: '14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ 
                          wordBreak: 'break-all',
                          flex: '1'
                        }}>
                          {member}
                        </span>
                        {memberUid && (
                          <button
                            onClick={() => toggleBlockUser(member, memberUid)}
                            className={`block-button ${blockedUids.includes(memberUid) ? 'blocked' : ''}`}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              border: '1px solid #e0e0e0',
                              borderRadius: '4px',
                              background: 'white',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              color: blockedUids.includes(memberUid) ? '#ff4444' : '#666'
                            }}
                          >
                            {blockedUids.includes(memberUid) ? '解除封鎖' : '封鎖'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#666' }}>暫無成員</p>
              )}
            </div>

            <form className="chatroom-invite" onSubmit={inviteMember} style={{
              flex: '0 0 auto'
            }}>
              <input
                type="email"
                placeholder="輸入要邀請的 Email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
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
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                邀請成員
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default Chatroom;
