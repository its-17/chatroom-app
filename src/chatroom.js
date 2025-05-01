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
  updateDoc as updateMessageDoc
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
  const [searchText, setSearchText] = useState('');

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

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!messages.length) return;
    const latestMsg = messages[messages.length - 1];
    if (
      latestMsg.email !== auth.currentUser.email &&
      document.visibilityState !== 'visible' &&
      Notification.permission === 'granted'
    ) {
      new Notification(`來自 ${latestMsg.email} 的新訊息`, {
        body: latestMsg.text
        // icon: '/icon.png' // 你可以加icon在public資料夾
      });
    }
  }, [messages]);

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
    await updateMessageDoc(msgRef, {
      originalText: text,
      text: '此訊息已被收回',
      retracted: true
    });
  };

  // 復原訊息功能
  const restoreMessage = async (msgId, originalText) => {
    const msgRef = doc(db, 'chatrooms', chatroomId, 'messages', msgId);
    await updateMessageDoc(msgRef, {
      text: originalText,
      retracted: false,
      originalText: ''
    });
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .chatroom-main {
            flex-direction: column !important;
          }
          .chatroom-left, .chatroom-right {
            width: 100% !important;
            max-width: none !important;
          }
          .chatroom-right {
            min-height: auto !important;
          }
          .chatroom-memberlist {
            max-height: 200px !important;
          }
          .chatroom-header {
            padding: 10px 0 !important;
          }
          .chatroom-header h2 {
            font-size: 20px !important;
          }
          .chatroom-msglist {
            padding: 10px !important;
          }
          .chatroom-input {
            margin-top: 10px !important;
          }
          .chatroom-input input {
            padding: 8px !important;
          }
        }
      `}</style>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '20px'
      }}>
        <div className="chatroom-header" style={{ 
          padding: '0 0 20px 0',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '20px'
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
          flex: 1,
          overflow: 'hidden',
          minHeight: 0
        }}>
          <div className="chatroom-left" style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <div className="chatroom-msglist" style={{
              flex: 1,
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '20px',
              overflowY: 'auto',
              marginBottom: '20px',
              minHeight: 0,
              background: 'white',
              position: 'relative'
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
                    <div key={msg.id} style={{ 
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <strong style={{ 
                        whiteSpace: 'nowrap',
                        color: '#2c3e50'
                      }}>
                        {msg.email}
                      </strong>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {msg.retracted ? (
                          <>
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
                          </>
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
              </div>
            </div>

            <form 
              className="chatroom-input" 
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

          <div className="chatroom-right" style={{ 
            width: '250px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div className="chatroom-memberlist" style={{ 
              flex: 1,
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '20px',
              overflowY: 'auto',
              minHeight: 0,
              background: 'white'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#2c3e50' }}>Chat 成員</h4>
              {members.length > 0 ? (
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {members.map((member, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '8px 12px',
                        background: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '14px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {member}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#666' }}>暫無成員</p>
              )}
            </div>

            <form className="chatroom-invite" onSubmit={inviteMember}>
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
