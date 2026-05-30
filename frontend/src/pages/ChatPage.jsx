import { useEffect, useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { ImagePlus, MessageCircle, Reply, Search, Send, Smile } from 'lucide-react';
import request, { getChatSocketUrl } from '../api/client';
import { uploadToCloudinary } from '../utils/cloudinary';
import { addCacheBust } from '../utils/imageCacheBust';
import styles from './ChatPage.module.css';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { type: "spring", stiffness: 350, damping: 25 } 
  }
};

const messageVariants = {
  initial: { opacity: 0, scale: 0.9, y: 12 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 450, damping: 28 } 
  }
};

function extractChatMessage(rawData) {
  try {
    const payload = JSON.parse(rawData);
    if (payload.type !== 'chat:message') return null;
    const message = payload.message;
    if (!message?.chat_id) return null;
    return message;
  } catch {
    return null;
  }
}

function mergeChatPreview(chat, message) {
  if (Number(chat.id) !== Number(message.chat_id)) return chat;
  return {
    ...chat,
    ultimo_mensaje: message.contenido || 'Imagen',
    ultima_imagen: message.media_url || null,
    ultimo_mensaje_fecha: message.fecha_creacion,
  };
}

function appendUniqueMessage(currentMessages, message) {
  for (const current of currentMessages) {
    if (current.id === message.id) return currentMessages;
  }
  return [...currentMessages, message];
}

function ChatAvatar({ src, username, className }) {
  const initials = String(username || '?').slice(0, 2).toUpperCase();

  if (src) {
    return <img className={className} src={addCacheBust(src)} alt={username || 'Usuario'} />;
  }

  return (
    <div className={className}>
      <span>{initials}</span>
    </div>
  );
}

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
    return () => { ignore = true; };
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

    return () => { ignore = true; };
  }, [activeChat?.id]);

  useEffect(() => {
    const wsUrl = getChatSocketUrl();
    if (!wsUrl) return undefined;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = event => {
      const message = extractChatMessage(event.data);
      if (!message) return;

      setChats(cur => cur.map(chat => mergeChatPreview(chat, message)));

      if (Number(activeChat?.id) !== Number(message.chat_id)) return;
      setMessages(cur => appendUniqueMessage(cur, message));
    };

    ws.onerror = () => {};
    return () => ws.close();
  }, [activeChat?.id]);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages.length]);

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
    const localUrl = URL.createObjectURL(file);
    setImageData(localUrl);
  }

  async function sendMessage() {
    if (!activeChat || (!text.trim() && !imageData)) return;
    let mediaAssetId = null;
    if (imageFile) {
      const uploaded = await uploadToCloudinary(imageFile, 'walter/chat');
      mediaAssetId = uploaded.asset.id;
    }
    const created = await request(`/chat/${activeChat.id}/mensajes`, { 
      method: 'POST', 
      body: JSON.stringify({ contenido: text, media_asset_id: mediaAssetId, respuesta_a_id: replyTo?.id || null }) 
    });
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className={styles.chatPage}>
      <aside className={styles.chatSidebar}>
        <div className={styles.chatSearch}>
          <Search size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar usuarios..." />
        </div>

        {users.length > 0 && (
          <motion.div variants={listVariants} initial="hidden" animate="visible" className={styles.userResults}>
            {users.map(found => (
              <motion.button key={found.id} variants={itemVariants} onClick={() => openChat(found.id)} whileTap={{ scale: 0.98 }}>
                <ChatAvatar className={styles.avatarSmall} src={found.avatar_url} username={found.username} />
                <span>{found.username}</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {users.length === 0 && (
          <div className={styles.chatList}>
            {chats.length === 0 ? (
              <div className={styles.emptyChat}><span>Busca a alguien para empezar</span></div>
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="visible">
                {chats.map(chat => (
                  <motion.button 
                    key={chat.id} 
                    variants={itemVariants}
                    className={activeChat?.id === chat.id ? styles.active : ''} 
                    onClick={() => setActiveChat(chat)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ChatAvatar className={styles.avatarSmall} src={chat.other_avatar_url} username={chat.other_username} />
                    <div>
                      <strong>{chat.other_username}</strong>
                      <span>{chat.ultimo_mensaje || (chat.ultima_imagen ? 'Imagen' : 'Sin mensajes aún')}</span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </aside>

      <section className={styles.chatPanel}>
        <AnimatePresence mode="wait">
          {activeChat ? (
            <motion.div 
              key={activeChat.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className={styles.chatPanelContent}
            >
              <header className={styles.chatHeader}>
                <ChatAvatar className={styles.chatHeaderAvatar} src={activeChat.other_avatar_url} username={activeChat.other_username} />
                <div>
                  <h2>{activeChat.other_username}</h2>
                </div>
              </header>

              <div className={styles.messagesList}>
                {messages.map(message => {
                  const mine = message.usuario_id === user.id;
                  return (
                    <motion.div 
                      key={message.id} 
                      variants={messageVariants}
                      initial="initial"
                      animate="animate"
                      className={`${styles.messageRow} ${mine ? styles.mine : ''}`}
                    >
                      {!mine && (
                        <ChatAvatar className={styles.messageAvatar} src={message.avatar_url} username={message.username} />
                      )}
                      <div className={styles.messageBubble}>
                        {message.respuesta_a_id && (
                          <div className={styles.messageReply}>↳ {message.respuesta_username}: {message.respuesta_contenido || 'Imagen'}</div>
                        )}
                        {message.contenido && <p>{message.contenido}</p>}
                        {message.media_url && (
                          message.media_resource_type === 'video'
                            ? (
                              <video src={message.media_url} controls>
                                <track kind="captions" />
                              </video>
                            )
                            : <img src={message.media_url} alt="Imagen del chat" />
                        )}
                        <button className={styles.messageReplyBtn} onClick={() => setReplyTo(message)}><Reply size={14} /></button>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <footer className={styles.chatComposer} ref={composerRef}>
                <AnimatePresence>
                  {replyTo && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, y: 10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 10 }}
                      className={styles.composerReply}
                    >
                      Respondiendo a {replyTo.username}: {replyTo.contenido || 'Imagen'}
                      <button onClick={() => setReplyTo(null)}>×</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {imageData && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className={styles.composerImage}
                    >
                      {imageFile?.type?.startsWith('video/')
                        ? (
                          <video src={imageData} controls>
                            <track kind="captions" />
                          </video>
                        )
                        : <img src={imageData} alt="Vista previa" />}
                      <button onClick={() => { setImageData(''); setImageFile(null); }}>×</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showEmojis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className={styles.emojiPickerPanel}
                    >
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        autoFocusSearch={false}
                        skinTonesDisabled
                        lazyLoadEmojis
                        previewConfig={{ showPreview: false }}
                        searchPlaceHolder="Buscar emoji"
                        width="100%"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={styles.composerRow}>
                  <motion.button 
                    type="button" 
                    onClick={() => setShowEmojis(v => !v)} 
                    aria-label="Abrir selector de emojis"
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Smile size={18} />
                  </motion.button>
                  <motion.label whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}>
                    <ImagePlus size={18} />
                    <input type="file" accept="image/*,video/*" onChange={handleFile} hidden />
                  </motion.label>
                  <textarea 
                    value={text} 
                    onChange={e => setText(e.target.value)} 
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..." 
                  />
                  <motion.button 
                    onClick={sendMessage}
                    whileHover={text.trim() || imageData ? { scale: 1.1 } : {}}
                    whileTap={text.trim() || imageData ? { scale: 0.92 } : {}}
                  >
                    <Send size={18} />
                  </motion.button>
                </div>
              </footer>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={styles.chatEmptyState}
            >
              <MessageCircle size={36} />
              <h2>Tus mensajes</h2>
              <p>Busca un usuario y solicita escribirle un primer mensaje.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

ChatAvatar.propTypes = {
  src: PropTypes.string,
  username: PropTypes.string,
  className: PropTypes.string,
};

ChatPage.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
};
