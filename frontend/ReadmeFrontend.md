# w/Walter — Documentación Técnica del Frontend

Análisis técnico y justificación de diseño de cada módulo del proyecto.

---

## 1. `api/client.js` — Capa de Red y Comunicación

### `getToken()`
Recupera la autenticación almacenada en `localStorage`. Se separa en una función unificada para mitigar la duplicación de código en futuras llamadas de red.

### `request(path, options)`
Este archivo encapsula toda la comunicación HTTP del frontend con el backend. Inyecta de forma condicional la cabecera `Authorization` con el esquema Bearer si el token existe, garantizando que cada petición HTTP saliente esté firmada con la identidad del usuario sin requerir intervención manual en los componentes visuales. Adicionalmente, evalúa el flag `res.ok` para interceptar respuestas de error del servidor y transformarlos automáticamente en excepciones capturables mediante bloques `try/catch`.

### `getChatSocketUrl()`
Construye y devuelve el endpoint bajo el protocolo seguro de WebSockets (`ws://` o `wss://`), saneando e inyectando el token directamente como un parámetro de consulta. Esto es necesario porque la API nativa de WebSockets del navegador no permite configurar cabeceras personalizadas durante el handshake inicial.

---

## 2. `App.jsx` — Orquestador Central y Estado Global

Componente raíz de la aplicación. Gestiona la inicialización de configuraciones, el ciclo de vida de la conexión WebSocket global y define la topología de rutas accesibles.

### Estados globales (`useState`)

| Estado | Descripción |
|---|---|
| `user` | Perfil del usuario autenticado. Si es `null`, fuerza el módulo de autenticación. |
| `searchQuery` | Criterio de filtrado global del navbar. Múltiples vistas reaccionan ante su cambio. |
| `selectedCommunities` | IDs de comunidades activas para segmentar el contenido. |
| `communities` | Caché global de foros temáticos, evita consultas redundantes desde componentes hijos. |
| `chatToast` | Objeto temporal que gestiona las alertas emergentes de mensajes recibidos fuera del chat. |

### Efectos y métodos

- **Efecto de hidratación**: analiza `localStorage` al montar. Si existen registros válidos, inicializa `user` y solicita el catálogo de comunidades mediante peticiones HTTP concurrentes.
- **Efecto WebSocket**: controla el ciclo de vida de la conexión de mensajería global. Se suscribe a notificaciones en segundo plano, actualizando contadores e interactuando con `chatToast` de forma reactiva.
- **`handleSettingsChange(newSettings)`**: aplica modificaciones visuales e invoca mutaciones HTTP (`PATCH`/`PUT`) contra el backend para mantener la consistencia estética del usuario entre dispositivos.

---

## 3. `components/Auth.jsx` — Pasarela de Acceso y Registro

Controla la captura de credenciales y la transmisión de datos para validar o registrar cuentas de usuario.

### Estados de control local

- **`isSignUp`**: flag booleano que actúa como conmutador de interfaz. Reutiliza la estructura base del formulario alterando condicionalmente las entradas requeridas (como `username`) y el destino del envío.
- **`loading`**: estado de bloqueo transaccional. Impide operaciones concurrentes deshabilitando los elementos interactivos durante el procesamiento de la solicitud HTTP.

### Manejo de formularios

**`handleLogin(e)` / `handleSignUp(e)`**: interceptan el evento nativo del navegador con `e.preventDefault()` para suprimir la recarga de página. Serializan los datos en JSON y ejecutan la llamada al cliente HTTP. Si la operación es exitosa, escriben el token JWT y los datos del perfil en `localStorage` antes de emitir el callback `onLogin`, notificando a `App.jsx` que la sesión debe desbloquearse.

---

## 4. `components/Navbar.jsx` — Cabecera y Notificaciones

Provee navegación global, búsqueda y administra el despliegue asíncrono del buzón de notificaciones.

### Estrategia de carga diferida (Lazy Loading)

El estado `notifications` se mantiene inicialmente vacío. En lugar de sobrecargar la app en cada renderizado, `handleNotificationsClick()` realiza una consulta solo cuando el usuario expande el panel de notificaciones.

### `markAsRead(id)` / `markAllRead()`

Ejecutan operaciones `PATCH` asíncronas. Actualizan la interfaz localmente mediante `filter` y llaman a `onNotificationsRead` para sincronizar y decrementar el contador global en `App.jsx` de inmediato.

---

## 5. `components/Sidebar.jsx` — Estructuras de Control Lateral

Aloja dos componentes independientes para el procesamiento y segmentación de datos complementarios al feed.

### `CommunitiesSidebar`

- **`joinedCommunities`**: filtra en tiempo de renderizado el arreglo de comunidades globales para aislar las que tienen `es_miembro` en `true`.
- **`toggleCommunity(community)`**: determina funcionalmente si un ID ya está en el filtro activo. Si existe, lo elimina; si no, lo concatena preservando la inmutabilidad del estado.
- **`showAll`**: controla los elementos visibles con `slice(0, 6)`, reduciendo el peso del renderizado inicial si la lista de membresías es extensa.

### `TrendingSidebar`

Efectúa una consulta automática al montar el componente contra `/publicaciones/tendencias`. Los posts devueltos se ordenan por métricas de interacción para presentar un índice de lectura prioritario.

---

## 6. `pages/HomePage.jsx` y `pages/CommunitiesPage.jsx` — Layout Shells

Componentes contenedores estructurales. Su único objetivo es actuar como plantillas para organizar la disposición visual de los subcomponentes mediante rejillas CSS.

No manejan lógica de negocio ni mutaciones de red directamente. Siguen el patrón de **Prop Drilling controlado**, actuando estrictamente como canales de distribución de datos entre `App.jsx` y los componentes hijos.

---

## 7. `components/Feed.jsx` — Controlador del Muro de Publicaciones

Componente crítico responsable del ciclo de vida de las publicaciones, su despliegue y el sistema de valoraciones.

### `e.stopPropagation()` en `PostCard`

Obligatorio para mitigar el Event Bubbling. Como la tarjeta entera redirige al `PostModal`, presionar los botones de votación internos dispararía ambas acciones si no se detuviera explícitamente la burbuja.

### Votación optimista

Al invocar `handleVote(postId, voteType)`, el componente recalcula los valores de la interfaz y altera las clases visuales de inmediato, antes de recibir confirmación del backend. Si la petición falla, los bloques interceptores restauran el estado original. Esto elimina la latencia percibida en redes lentas.

### `syncPost(updatedPost)`

Garantiza la consistencia interna. Si una publicación sufre cambios en la vista detallada (por ejemplo, un nuevo comentario), actualiza selectivamente su homólogo en el arreglo local mediante una operación de mapeo inmutable.

---

## 8. `components/PostCreate.jsx` — Creador de Publicaciones

Administra el formulario de creación de publicaciones, validación de membresías y carga de archivos multimedia.

### Filtro de seguridad en cliente

`memberCommunities` restringe el selector a las comunidades donde el usuario tiene `es_miembro` activo, impidiendo el envío de posts a foros donde no está registrado.

### Gestión de carga multimedia

`handleCreate()`: si `mediaFile` contiene un archivo válido, suspende la petición principal y ejecuta la subida asíncrona a Cloudinary. Una vez obtenida la URL remota definitiva, la asocia a `urlImagen` o `urlVideo` y formaliza la transacción con un `POST` a `/publicaciones`.

---

## 9. `components/PostModal.jsx` — Algoritmo de Comentarios Anidados

Uno de los módulos con mayor complejidad algorítmica del frontend. Transforma colecciones de datos lineales en estructuras arborescentes para hilos jerárquicos.

### Reestructuración arborescente

La API devuelve los comentarios como un vector plano. Para renderizarlos en cascada, se construye en tiempo de ejecución un diccionario `repliesByParent`, que clasifica cada comentario bajo la clave de su `comentario_padre_id`. Los hilos raíz se agrupan bajo la clave virtual `'root'`.

### Recursividad de `CommentItem`

El subcomponente `CommentItem` se invoca a sí mismo recursivamente. Si al evaluar `repliesByParent[comment.id]` halla sub-comentarios asociados, instancia una nueva fila de `CommentItem` con sangrías CSS, soportando hilos infinitos sin niveles estáticos predefinidos.

---

## 10. `components/Comunidades.jsx` — Directorio de Foros Temáticos

Controla la búsqueda, ordenamiento multicriterio y los procesos de suscripción y desvinculación de comunidades.

### `CAT_COLORS`

Diccionario estático que centraliza la paleta visual por categoría, almacenando valores hexadecimales de fondos y textos para garantizar contraste adecuado según estándares WCAG, sin sobrecargar el servidor con metadatos de estilos.

### `handleJoin(id)` / `handleLeave(id)`

Ejecutan llamadas HTTP transaccionales y mutan el estado local recalculando el flag `es_miembro` y el contador de seguidores del grupo de forma localizada, sin requerir una recarga completa del listado.

---

## 11. `components/ChatPage.jsx` — Mensajería Asíncrona Bidireccional

Gestiona la interfaz de chat privado bajo un modelo híbrido: HTTP en la inicialización y WebSockets persistentes para la transmisión de mensajes en tiempo real.

### `useRef` y desplazamiento automático

`bottomRef` sostiene un anclaje sobre un elemento invisible al final del contenedor de mensajes. El efecto que monitoriza `messages.length` invoca `scrollIntoView({ behavior: 'smooth' })` cada vez que llega un nuevo mensaje, garantizando que el usuario siempre vea el contenido más reciente.

### Respuestas dirigidas (`replyTo`)

Mantiene en memoria la referencia al mensaje que el usuario seleccionó para responder. Al enviar, ese identificador se empaqueta en el JSON saliente, permitiendo al backend enlazar la jerarquía y mostrarla en la interfaz.

---

## 12. `components/UserPage.jsx` — Perfiles e Historial de Actividad

Gestiona la visualización pública de datos de usuario, métricas de comunidad y segmentación de actividad por pestañas.

### Carga diferida por pestañas

Las peticiones HTTP se separan según el estado de `activeTab`. Los comentarios (`/comentarios/usuario`) o los posts compartidos solo se solicitan cuando el usuario conmuta explícitamente a esas secciones, optimizando el ancho de banda y la carga del servidor.

### `bioDraft` y aislamiento de edición

Separa el texto en edición (`bioDraft`) del dato definitivo (`profile.biografia`). Previene que cancelaciones dejen datos inconsistentes en pantalla antes de ser validados y guardados permanentemente vía `PUT`.

---

## 13. `components/SettingsPage.jsx` — Configuración y APIs Nativas

Provee personalización estética de la sesión e interactúa con APIs del sistema operativo del dispositivo.

### Consumo seguro de `window.Notification`

`handleDesktopNotifications(checked)` primero valida la disponibilidad del entorno con `'Notification' in window` para prevenir fallos en navegadores heredados. Luego invoca `Notification.requestPermission()` de forma asíncrona. Si el usuario deniega el permiso, la función restablece el flag a `false` de inmediato, garantizando correspondencia estricta entre las capacidades autorizadas del dispositivo y el estado visual reflejado en pantalla.