import { useEffect, useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { ImagePlus, MessageCircle, Reply, Search, Send, Smile } from 'lucide-react';
import request, { getChatSocketUrl } from '../api/client';
import { uploadToCloudinary } from '../utils/cloudinary';
import styles from './ChatPage.module.css';

export default function ChatPage({ user }) {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [text, setText] = useState('');
  const [imageData, setImageData] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);

  async function loadChats() {
    const data = await request('/chat');
    setChats(data);
    setActiveChat(prev => prev || data[0] || null);
  }

  useEffect(() => {
    let ignore = false;

    request('/chat')
      .then(data => {
        if (ignore) return;
        setChats(data);
        setActiveChat(prev => prev || data[0] || null);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!activeChat?.id) return undefined;
    let ignore = false;

    request(`/chat/${activeChat.id}/mensajes`)
      .then(data => {
        if (!ignore) setMessages(data);
      })
      .catch(() => {
        if (!ignore) setMessages([]);
      });

    return () => {
      ignore = true;
    };
  }, [activeChat?.id]);

  useEffect(() => {
    const wsUrl = getChatSocketUrl();
    if (!wsUrl) return undefined;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'chat:message') return;
        const message = payload.message;
        if (!message?.chat_id) return;

        setChats(cur => cur.map((chat) => (
          Number(chat.id) === Number(message.chat_id)
            ? {
              ...chat,
              ultimo_mensaje: message.contenido || 'Imagen',
              ultima_imagen: message.media_url || null,
              ultimo_mensaje_fecha: message.fecha_creacion,
            }
            : chat
        )));

        if (Number(activeChat?.id) === Number(message.chat_id)) {
          setMessages(cur => cur.some(m => m.id === message.id) ? cur : [...cur, message]);
        }
      } catch {}
    };

    ws.onerror = () => {};
    return () => ws.close();
  }, [activeChat?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setUsers([]);
        return;
      }

      request(`/chat/usuarios?q=${encodeURIComponent(query.trim())}`)
        .then(data => setUsers(data))
        .catch(() => setUsers([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function openChat(userId) {
    const chat = await request('/chat', { method: 'POST', body: JSON.stringify({ userId }) });
    const updated = await request('/chat');
    setChats(updated);
    setActiveChat(updated.find(item => Number(item.id) === Number(chat.id)) || chat);
    setQuery('');
    setUsers([]);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
  }

  async function sendMessage() {
    if (!activeChat || (!text.trim() && !imageData)) return;
    let mediaAssetId = null;
    if (imageFile) {
      const uploaded = await uploadToCloudinary(imageFile, 'walter/chat');
      mediaAssetId = uploaded.asset.id;
    }
    const created = await request(`/chat/${activeChat.id}/mensajes`, { method: 'POST', body: JSON.stringify({ contenido: text, media_asset_id: mediaAssetId, respuesta_a_id: replyTo?.id || null,}) });
    setMessages(cur => cur.some(m => m.id === created.id) ? cur : [...cur, created]);
    setText('');
    setImageData('');
    setImageFile(null);
    setReplyTo(null);
    setShowEmojis(false);
    await loadChats();
  }

  function handleEmojiClick(emojiData) {
    setText(current => current + emojiData.emoji);
  }

  return (
    <main className={styles.chatPage}>
      <aside className={styles.chatSidebar}>
        <div className={styles.chatSearch}>
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar usuarios..." />
        </div>

        {users.length > 0 && (
          <div className={styles.userResults}>
            {users.map(found => (
              <button key={found.id} onClick={() => openChat(found.id)}>
                <Avatar name={found.username} />
                <span>w/{found.username}</span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.chatList}>
          {chats.length === 0 ? (
            <div className={styles.emptyChat}><span>Busca a alguien para empezar</span></div>
          ) : chats.map(chat => (
            <button key={chat.id} className={activeChat?.id === chat.id ? styles.active : ''} onClick={() => setActiveChat(chat)}>
              <Avatar name={chat.other_username} />
              <div>
                <strong>w/{chat.other_username}</strong>
                <span>{chat.ultimo_mensaje || (chat.ultima_imagen ? 'Imagen' : 'Sin mensajes aún')}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={styles.chatPanel}>
        {activeChat ? (
          <>
            <header className={styles.chatHeader}>
              <Avatar name={activeChat.other_username} />
              <div>
                <h2>w/{activeChat.other_username}</h2>
              </div>
            </header>

            <div className={styles.messagesList}>
              {messages.map(message => {
                const mine = message.usuario_id === user.id;
                return (
                  <div key={message.id} className={`${styles.messageRow} ${mine ? styles.mine : ''}`}>
                    <div className={styles.messageBubble}>
                      {message.respuesta_a_id && (
                        <div className={styles.messageReply}>↳ w/{message.respuesta_username}: {message.respuesta_contenido || 'Imagen'}</div>
                      )}
                      {message.contenido && <p>{message.contenido}</p>}
                      {message.media_url && (
                        message.media_resource_type === 'video'
                          ? <video src={message.media_url} controls />
                          : <img src={message.media_url} alt="Imagen del chat" />
                      )}
                      <button className={styles.messageReplyBtn} onClick={() => setReplyTo(message)}><Reply size={14} /></button>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <footer className={styles.chatComposer} ref={composerRef}>
              {replyTo && (
                <div className={styles.composerReply}>
                  Respondiendo a w/{replyTo.username}: {replyTo.contenido || 'Imagen'}
                  <button onClick={() => setReplyTo(null)}>×</button>
                </div>
              )}
              {imageData && (
                <div className={styles.composerImage}>
                  {imageFile?.type?.startsWith('video/')
                    ? <video src={imageData} controls />
                    : <img src={imageData} alt="Vista previa" />}
                  <button onClick={() => { setImageData(''); setImageFile(null); }}>×</button>
                </div>
              )}
              {showEmojis && (
                <div className={styles.emojiPickerPanel}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    autoFocusSearch={false}
                    skinTonesDisabled
                    lazyLoadEmojis
                    previewConfig={{ showPreview: false }}
                    searchPlaceHolder="Buscar emoji"
                    width="100%"
                  />
                </div>
              )}
              <div className={styles.composerRow}>
                <button type="button" onClick={() => setShowEmojis(v => !v)} aria-label="Abrir selector de emojis">
                  <Smile size={18} />
                </button>
                <label>
                  <ImagePlus size={18} />
                  <input type="file" accept="image/*,video/*" onChange={handleFile} hidden />
                </label>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un mensaje..." />
                <button onClick={sendMessage}><Send size={18} /></button>
              </div>
            </footer>
          </>
        ) : (
          <div className={styles.chatEmptyState}>
            <MessageCircle size={36} />
            <h2>Tus mensajes</h2>
            <p>Busca un usuario y solicita escribirle un primer mensaje.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function Avatar({ name = '?' }) {
  return <span className={styles.chatAvatar}>{name.slice(0, 2).toUpperCase()}</span>;
}
