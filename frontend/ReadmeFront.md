# Frontend - Walter Red Social

Documentación técnica completa de los componentes principales del frontend.

---

## Tabla de Contenidos

1. [App.jsx](#appjsx) - Orquestador central
2. [HomePage](#homepage) - Página principal
3. [SettingsPage](#settingspage) - Configuración del usuario
4. [UserPage](#userpage) - Perfil de usuario
5. [ChatPage](#chatpage) - Sistema de mensajería en tiempo real
6. [Auth](#auth) - Autenticación y seguridad
7. [Comunidades](#comunidades) - Gestión de comunidades
8. [Feed](#feed) - Feed de publicaciones
9. [Navbar](#navbar) - Barra de navegación
10. [PostCreate](#postcreate) - Creación de posts
11. [PostModal](#postmodal) - Modal de detalle
12. [Sidebar](#sidebar) - Barras laterales

---

## App.jsx

### Propósito General

**Componente raíz** de la aplicación que actúa como orquestador central:

- Gestiona estado global de sesión del usuario
- Controla configuración de accesibilidad y temas
- Maneja rutas de navegación
- Implementa seguridad contra inyecciones (XSS)
- Mantiene conexión en tiempo real (WebSockets)

### Funciones Auxiliares

#### `getInitialUser()` y `getInitialSettings()`

Recuperan datos del `localStorage`:
- Sesión del usuario (token y datos)
- Configuración de personalización

**Detalle clave**: Detecta Modo Oscuro del SO usando `globalThis.matchMedia` si no hay preferencias guardadas.

#### `sanitizeString(str)` y `sanitizeUserObject(userObj)`

Filtros de seguridad contra **XSS (Cross-Site Scripting)**:

| Carácter | Entidad HTML |
|----------|--------------|
| `&` | `&amp;` |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

**Beneficio**: Si un usuario malintencionado introduce código en `username` o `bio`, se renderiza como texto plano, no como código.

#### `getActiveTab(pathname)`

- Analiza URL actual
- Deduce sección activa (Mensajes, Comunidades, Perfil, etc.)
- Marca pestaña en navegación

### Gestión de Estados

| Estado | Propósito |
|--------|-----------|
| `user` | Datos del usuario autenticado |
| `communities` | Comunidades del usuario |
| `notificationCount` | Contador de notificaciones |
| `selectedPost` | Post seleccionado en modal |
| `chatToast` | Alertas visuales |
| `settings` | Preferencias (tema, accesibilidad) |

### Handlers (Funciones de Control)

| Función | Descripción |
|---------|-------------|
| `loadCommunities()` | Carga comunidades del usuario |
| `handleLogin(userData)` | Autentica y sanitiza datos |
| `handleUserUpdate(updatedUser)` | Actualiza perfil global |
| `handleLogout()` | Limpia sesión y localStorage |
| `handleTabChange(tab)` | Navega a pestaña con `react-router-dom` |

### Efectos Principales (useEffect)

#### **Sincronización de Tema y Accesibilidad**
- Inyecta atributos `data-*` en `<html>` y `<body>`
- Cambia estilos con variables CSS
- Guarda preferencias en `localStorage`

#### **Carga Inicial de Datos**
- Peticiones paralelas con `Promise.all()`
- Usa bandera `ignore` para prevenir race conditions
- Evita fugas de memoria

#### **Conexión WebSocket**
- Abre túnel bidireccional si usuario autenticado
- Valida URL con Expresión Regular contra inyecciones
- Eventos `chat:message` incrementan notificaciones
- Dispara notificaciones nativas del navegador

#### **Limpieza de Alertas**
- Toast desaparece tras 4.5 segundos
- Limpia timers al cambiar componentes

#### **Interceptor Global de Autenticación**
- Escucha evento `auth:unauthorized`
- Desloguea automáticamente si token expira

### Renderizado

**Pantalla de Autenticación**: Si no hay usuario → muestra `<Auth />`

**Navegación Dinámica**: `<Routes>` y `<Route>` según URL

**Animaciones**: 
- Envuelto en `<AnimatePresence mode="wait">` (Framer Motion)
- Desvanecimiento suave entre páginas

**Accesibilidad WCAG**:
- `<MotionConfig reducedMotion={motionMode}>` respeta preferencias
- Desactiva animaciones automáticamente si usuario lo requiere

---

## HomePage

### Layout de Tres Columnas

```
┌─────────────────┬──────────────┬─────────────────┐
│  Comunidades    │              │                 │
│   (Sidebar)     │    Feed      │   Trending      │
│                 │   (Centro)   │  (Sidebar)      │
└─────────────────┴──────────────┴─────────────────┘
```

#### Columnas

| Columna | Componente | Función |
|---------|-----------|---------|
| Izquierda | `<CommunitiesSidebar />` | Lista y filtro de comunidades |
| Centro | `<Feed />` | Publicaciones según filtros |
| Derecha | `<TrendingSidebar />` | Posts populares |

### Props Principales

| Prop | Tipo | Destinatario | Uso |
|------|------|--------------|-----|
| `user` | Object | `<Feed />` | Identificar usuario en interacciones |
| `searchQuery` | String | `<Feed />` | Filtrar posts por búsqueda |
| `selectedCommunities` | Array | `<CommunitiesSidebar />`, `<Feed />` | Filtro de comunidades activas |
| `setSelectedCommunities` | Function | `<CommunitiesSidebar />` | Actualizar selección |
| `communities` | Array | Ambos sidebars | Listar comunidades |
| `onPostClick` | Function | `<TrendingSidebar />` | Abrir modal de post |

### Validación con PropTypes

Robustez en JavaScript: Define IDs como `PropTypes.oneOf([PropTypes.string, PropTypes.number])`

**Beneficio**: Si cambias BD de relacional (PostgreSQL: IDs numéricos) a NoSQL (MongoDB: strings), frontend sigue funcionando.

---

## SettingsPage

### Lógica de Formateo

#### `memberSince`

Convierte fecha de creación a formato legible:
```javascript
// Entrada: user.fecha_creacion = "2026-06-03"
// Salida: "3 de junio de 2026" (locale: es-ES)
```

#### `updateNotifications(patch)`

Helper que aplica cambios a configuración:
- Copia objeto `settings.notifications`
- Aplica cambios estructurales
- Propaga hacia arriba con `onSettingsChange`

### Funciones Asíncronas

#### `handleSaveUsername()`

**Flujo**:
1. Limpia espacios: `.trim().replace(/\s/g, '')`
2. Valida no vacío y diferente al actual
3. PATCH a `/usuarios/perfil`
4. Actualiza estado global con `onUserUpdate()`
5. Controla estado de carga con `savingUsername`

#### `handleAvatarSelection(event)`

**Arquitectura Desacoplada** (2 pasos):

1. Sube imagen a **Cloudinary** vía `uploadToCloudinary()`
2. Obtiene URL segura (`secure_url`)
3. PATCH a API enviando solo la URL
4. Limpia input para permitir reuploads

**Beneficio**: No satura BD con archivos binarios.

#### `handleDesktopNotifications(nextValue)`

**Flujo de Permisos**:

```
¿Usuario apaga? → set false
                ↓
¿Navegador soporta? → si no, salir
                ↓
¿Permisos ya solicitados? → si no, pedir
                ↓
¿Permiso granted? → actualizar config
```

### Subcomponente: `ToggleRow`

Componente reutilizable de switch iOS/Android:
- Atributo `aria-pressed={checked}` para lectores de pantalla
- Accesible para personas con discapacidad visual

---

## UserPage

### Carga Concurrente de Datos

```javascript
Promise.all([
  request(`/usuarios/${username}`),
  request(`/publicaciones/usuario/${username}`),
  request(`/usuarios/${username}/votos`),
  request(`/usuarios/${username}/compartidos`)
])
```

**Ventaja**: Reduce tiempo de carga percibido vs. peticiones secuenciales.

### Control de Race Conditions

```javascript
let ignore = false;

// Si usuario cambia de perfil rápidamente:
return () => { ignore = true; };

// En callback:
if (!ignore) setState(data);
```

Previene:
- Actualizar estado en componentes no montados
- Datos desincronizados
- Fugas de memoria

### Mapeo de Votos Inicial

Construye diccionario en memoria:
```javascript
// { postId: 'up'|'down'|null, ... }
```

**Beneficio**: Renderizado instantáneo sin queries adicionales.

### Funciones de Actualización

#### `updatePost(updatedPost)`

Busca post en arrays locales y actualiza ambos:
- Posts propios
- Posts compartidos

**Garantía**: Voto se refleja en ambas listas.

#### `handlePostDeleted(postId)`

- Filtra post de arrays locales
- Cierra modal asignando `setSelectedPost(null)`

### Actualización Optimista (Optimistic Update)

**Patrón antilatencia**:

```javascript
// 1. Guardar backup
const previousPost = { ...post };

// 2. Actualizar UI instantáneamente
setPosts(cur => cur.map(...));

try {
  // 3. Enviar a API en background
  const result = await request(...);
} catch (err) {
  // 4. Rollback si falla
  setPosts(cur => cur.map(p => p.id === postId ? previousPost : p));
}
```

**Resultado**: Usuario ve cambio a 0ms incluso si servidor tarda 500ms.

---

## ChatPage

### Arquitectura WebSocket

A diferencia de HTTP, mantiene conexión persistente:

```javascript
socket.on('chat:message', (msg) => {
  if (msg.chat_id === currentChatId) {
    // Inyecta inmediatamente
    setMessages(cur => [...cur, msg]);
  }
  // Actualiza barra lateral siempre
  updateChatPreview(msg);
});
```

### Optimizaciones de Rendimiento

#### Búsqueda con Debounce (Antirrebote)

```javascript
// Sin debounce: "alejandro" → 9 peticiones HTTP
// Con debounce: espera 300ms sin escribir → 1 petición
```

Protege BD contra DoS involuntarios.

#### Vista Previa de Multimedia Local

```javascript
const blobUrl = URL.createObjectURL(file);
// Muestra imagen inmediatamente (blob:http://...)
// Solo sube a Cloudinary al enviar
```

**Beneficio**: Ahorra ancho de banda.

#### Desplazamiento Automático Inteligente

```javascript
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages.length]);
```

Emula comportamiento de WhatsApp/Telegram.

### 📹 Características Avanzadas

#### Soporte Multimedia Polimórfico

```javascript
if (media_resource_type === 'video') {
  return <video controls />;
} else {
  return <img src={url} />;
}
```

#### Estructura de Respuestas (Threading)

- Usuario pulsa "Responder"
- Guarda `replyTo` en estado
- Envía `respuesta_a_id` al servidor
- Renderiza bocadillos anidados

#### Selector de Emojis Integrado

- Librería externa: `emoji-picker-react`
- Envuelto en animaciones `framer-motion`
- Aparición/desaparición limpia

### Animaciones Avanzadas (Framer Motion)

#### Efecto Cascada (Staggered)

```javascript
staggerChildren: 0.04 // 40ms de retraso entre elementos
```

#### AnimatePresence

Anima elementos al salir del DOM:
- Indicador "Respondiendo a..."
- Vista previa de imagen
- Menú de emojis

---

## Auth

### Seguridad Proactiva

#### Saneamiento contra XSS (sanitizeUserForStorage)

Antes de guardar en `localStorage`:
```javascript
&  → &amp;
<  → &lt;
>  → &gt;
"  → &quot;
'  → &#x27;
```

Neutraliza inyecciones si atacante compromete BD.

#### Validación Estricta de JWT (validateToken)

```javascript
// Patrón: header.payload.signature
const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
```

Si falla → lanza error inmediatamente.

### Persistencia Segura

```javascript
function persistAuthData(data) {
  const safeToken = validateToken(data.token);
  // Si falla aquí ↑ nunca llega a localStorage
  
  localStorage.setItem('token', safeToken);
  localStorage.setItem('user', JSON.stringify(safeUser));
  
  return safeUser;
}
```

**Atomicidad**: O todo se guarda seguro, o nada.

### UX de Alto Nivel

#### Modo Invitado

```javascript
handleGuestLogin()
// Inyecta credenciales preconfiguradas
// Reduce fricción de entrada
```

#### Formulario Dinámico (Login/Signup)

- Mismo modal para ambos modos
- Campo "Username" aparece suavemente en registro
- Limpia espacios automáticamente: `.replace(/\s/g, '')`

#### Control de Scroll Global

```javascript
useEffect(() => {
  if (!isOpen) return;
  
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden'; // Bloquea scroll
  
  return () => {
    document.body.style.overflow = previousOverflow; // Restaura
  };
}, [isOpen]);
```

### Animaciones Inmersivas

#### Efecto Aurora

Dos contenedores que oscilan en escala y opacidad:
- Tiempos descompasados (8s y 10s)
- Emula fondo orgánico vivo
- Sin consumir recursos de vídeo

#### AnimatePresence Condicional

Username y secciones del modal:
- No aparecen de golpe
- Se deslizan expandiendo suavemente

---

## Comunidades

### Patrón State Invalidation

```javascript
onCommunityCreated?.() // Invalida caché de componentes adyacentes
```

Asegura sincronización global sin recargar página.

### Filtrado Client-Side

```javascript
const filtered = communities
  .filter(c =>
    (!q || c.nombre?.toLowerCase().includes(q) || c.descripcion?.toLowerCase().includes(q)) &&
    (!catFilter || c.categoria === catFilter)
  )
  .sort((a, b) => { /* ... */ });
```

**Ventaja**: Evita múltiples peticiones HTTP al escribir.

### Arquitectura Temática (CAT_COLORS)

```javascript
CAT_COLORS = {
  'tecnologia': { tag: '#e3f2fd', tagText: '#1565c0' },
  'deportes': { tag: '#fff3e0', tagText: '#e65100' },
  // ...
}
```

Inyecta dinámicamente en `style` de elementos.

**WCAG Compliance**: Contraste de color accesible.

### Utilidades de UI

#### Formateador de Métricas (fmtCount)

```javascript
1500 → "1.5k"
```

Evita que números largos rompan layout en móvil.

#### Saneamiento de Prefijos

```javascript
name.startsWith('w/') ? name.slice(2) : name
// "w/javascript" → "javascript"
```

Previene duplicidades en rutas.

#### Accesibilidad en Modales

```javascript
role="button"
tabIndex={0}
onKeyDown={(e) => e.key === 'Escape' && handleClose()}
```

Usuarios con lectores de pantalla pueden cerrar.

---

## Feed

### Actualización Optimista

**Patrón antilatencia principal**:

```javascript
// 1. Backup
const previousPost = { ...post };
const previousVote = userVotes[postId] ?? null;

// 2. Calcular siguiente estado
const { nextVote, votes } = computeVote({ ... });

// 3. Renderizar UI instantáneamente
setPosts(cur => cur.map(...));

try {
  // 4. API en background
  const result = await request(...);
  // Consolidar con respuesta real
} catch (err) {
  // 5. Rollback silencioso
  setPosts(cur => cur.map(p => p.id === postId ? previousPost : p));
}
```

### Abstracción de Lógica (Principio Single Responsibility)

```javascript
import { computeVote } from '../utils/computeVote';
```

Reglas de negocio de votación **independientes de React**:
- Testeables con Unit Tests
- Reutilizables en otros contextos

### Renderizado Polimórfico

#### Inyección Condicional de Medios

```javascript
if (post.url_video) {
  mediaNode = <video controls><track kind="captions" /></video>;
} else if (post.url_imagen) {
  mediaNode = <img src={post.url_imagen} />;
}
```

#### Detención de Event Bubbling

```javascript
onClick={(e) => {
  e.stopPropagation(); // No abre modal
}}
```

Votar no abre el post completo.

### Portales y Accesibilidad

#### createPortal (Botón Flotante)

```javascript
createPortal(
  <button>+</button>,
  document.body // Se renderiza en body, no afectado por overflow:hidden
)
```

#### Accesibilidad por Teclado

```javascript
role="button"
tabIndex={0}
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') handleClick();
}}
```

---

## Navbar

### Doble Verificación de Permisos

```javascript
useEffect(() => {
  let ignore = false;
  
  setIsAdmin(Boolean(user?.isAdmin)); // Rápido (localStorage)
  
  if (!user?.id) return;
  
  request('/usuarios/isAdmin') // Validación asíncrona (servidor)
    .then(data => {
      if (!ignore) setIsAdmin(Boolean(data.isAdmin));
    });
    
  return () => { ignore = true; };
}, [user?.id, user?.isAdmin]);
```

**Defensa**: Si usuario manipula localStorage para simular admin, servidor lo revierte inmediatamente.

### Cache-Busting de Imágenes

```javascript
addCacheBust(user.avatar_url)
// Agrega timestamp → "avatar.jpg?v=1234567890"
```

Usuario actualiza foto pero navegador mostraba versión antigua.

### Microinteracciones (Framer Motion)

#### Hover Effects

```javascript
whileHover={{ scale: 1.15, y: -2 }}
whileTap={{ scale: 0.9 }}
```

Iconos reaccionan tactilmente.

#### Panel de Notificaciones

```javascript
type: "spring" // Física de resorte
```

Expande/contrae orgánicamente. Reemplaza doble dígito por "9+".

### Flujo Unidireccional de Datos

```javascript
// Navbar NO muta directamente
// Emite eventos hacia App.jsx
<Navbar
  onTabChange={handleTabChange}
  onSearchChange={handleSearchChange}
  onLogout={handleLogout}
  onNotificationsRead={handleRead}
/>
```

Centraliza lógica en componente padre.

---

## PostCreate

### Orquestación Asíncrona Multi-Etapa

#### Desacoplamiento de Almacenamiento

```javascript
// 1. Upload a Cloudinary
const { secure_url } = await uploadToCloudinary(file);

// 2. Envía solo URL a BD local
await request('POST', '/publicaciones', {
  titulo,
  contenido,
  media_id: secure_url, // Índice, no archivo binario
});
```

No satura servidor con archivos binarios.

### Aislamiento de Scroll

```javascript
useEffect(() => {
  if (!isOpen) return;
  
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  return () => {
    document.body.style.overflow = previousOverflow;
  };
}, [isOpen]);
```

Evita scroll parasitario en feed de fondo.

### Validaciones Preventivas

#### Filtrado de Comunidades

```javascript
const memberCommunities = communities.filter(c => c.es_miembro);

// Botón de envío deshabilitado si array vacío
disabled={memberCommunities.length === 0}
```

Usuario no puede enviar a comunidades donde no es miembro.

#### Type Casting Defensivo

```javascript
Number(selectedCommunity) // "42" → 42
```

Coincide con tipo FK de BD.

#### Limpieza de Estado

```javascript
function reset() {
  setTitle('');
  setContent('');
  setMedia(null);
  setSelectedCommunity(null);
}
```

Previene datos residuales.

### UI/UX Accesible

#### Input de Archivo Oculto

```javascript
<input type="file" id="post-media-file" style={{display:'none'}} />
<label htmlFor="post-media-file">Subir imagen</label>
```

Estilizable sin `<input type="file">` nativo feo.

#### Dos Métodos de Cierre

```javascript
// 1. Fondo opaco
onClick={() => handleClose()}

// 2. Botón X explícito
<button aria-label="Cerrar modal" onClick={handleClose}>×</button>
```

---

## PostModal

### Algoritmia de Árboles (Comment Threads)

#### Complejidad O(N)

```javascript
const roots = comments.filter(c => !c.comentario_padre_id);

const repliesByParent = comments.reduce((acc, c) => {
  if (c.comentario_padre_id) {
    const key = String(c.comentario_padre_id);
    acc[key] = [...(acc[key] || []), c];
  }
  return acc;
}, {});
```

Evita búsquedas anidadas O(N²).

#### Recursividad de Componentes

```javascript
function CommentItem({ comment, replies }) {
  return (
    <>
      {/* Renderiza comentario */}
      {replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} replies={...} />
      ))}
    </>
  );
}
```

Anidación infinita organizada.

### Borrado en Cascada

```javascript
const removeIds = new Set([String(commentId)]);

while (changed) {
  changed = false;
  current.forEach(c => {
    if (c.comentario_padre_id && removeIds.has(String(c.comentario_padre_id))) {
      removeIds.add(String(c.id));
      changed = true;
    }
  });
}

setComments(current => current.filter(c => !removeIds.has(String(c.id))));
```

Si borra comentario padre → elimina toda rama.

### Sincronización Bidireccional

#### Estado Espejo Local

```javascript
const [postData, setPostData] = useState(post);
```

Cambios optimistas aislados.

#### Propagación Upstream

```javascript
onPostUpdated(updatedPost) // Devuelve al Feed
onCommentAdded(newComment) // Devuelve al Feed
```

Feed ve cambios al cerrar modal sin recargar.

---

## Sidebar

### Multi-Exportación Coherente

```javascript
export const CommunitiesSidebar = ({ ... });
export const TrendingSidebar = ({ ... });
```

Import selectivo:
```javascript
import { CommunitiesSidebar, TrendingSidebar } from './Sidebar';
```

### Defensa de Tipos (Type Hardening)

```javascript
const selectedIds = selectedCommunities.map(String);
const id = String(community.id);

if (selectedIds.includes(id)) {
  // Match garantizado
}
```

Convierte todo a strings previo a comparar.

### Selección Global Idempotente

```javascript
const allSelected = joinedCommunities.every(c =>
  selectedIds.includes(String(c.id))
);

if (allSelected) {
  setSelectedCommunities([]); // Limpiar
} else {
  setSelectedCommunities(joinedCommunities.map(c => c.id)); // Llenar
}
```

Toggle limpio: Todo o nada.

### Virtualización de Listas

```javascript
joinedCommunities.slice(0, 6) // Muestra 6 por defecto

{showAll && joinedCommunities} // Expande si usuario lo pide
```

Reduce nodos DOM activos.

### Aislamiento de Eventos

```javascript
<input type="checkbox" onClick={(e) => e.stopPropagation()} />
```

Checkbox no dispara evento del botón padre.

### Algoritmo de Ranking

```javascript
const sorted = [...data]
  .sort((a, b) => (b.votos || 0) - (a.votos || 0))
  .slice(0, 5);
```

**Inmutabilidad**: Spread operator crea copia antes de sortear.

**Nulos**: `|| 0` evita excepciones si votos es undefined.

---

## Mejores Prácticas Aplicadas

| Patrón | Beneficio |
|--------|-----------|
| **Optimistic Updates** | UX antilatencia |
| **Race Condition Guards** | Previene fugas de memoria |
| **Client-Side Filtering** | Reduce peticiones HTTP |
| **Component Recursion** | Estructuras complejas limpias |
| **Portal Rendering** | CSS layout limpio |
| **Type Hardening** | Robustez ante cambios BD |
| **State Atomicity** | Persistencia segura |
| **Debouncing** | Protección contra DoS |
| **WCAG Compliance** | Accesibilidad garantizada |
| **Framer Motion** | UX inmersiva y pulida |

---
