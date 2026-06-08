# Walter Readme Backend

Este módulo contiene la lógica de acoplamiento de la API, encargada de gestionar las peticiones HTTP entrantes, validar los datos de entrada y conectar con la capa de negocio.

---
## DTO

## Controllers

Los controladores actúan como intermediarios entre las rutas HTTP y la capa de servicios (Services). Se encargan de recibir las peticiones (req), aplicar transformaciones o validaciones iniciales mediante DTOs, y estructurar las respuestas HTTP (res).

### Detalle de los Módulos

#### Autenticación (auth.controller.js)
> Gestiona el flujo de acceso, registro y verificación de identidad de los usuarios de la plataforma.

| Método | Descripción | Validación / DTO |
| **`register(req, res)`** | Registra un nuevo usuario en el sistema. | `registerDto(req.body)` |
| **`login(req, res)`** | Autentica a un usuario y genera la sesión o token correspondiente. | `loginDto(req.body)` |
| **`checkUsername(req, res)`** | Verifica la disponibilidad de un nombre de usuario en tiempo real. | `checkUsernameDto(req.query)` |

---

#### Chat y Mensajería (chat.controller.js)
> Controla la comunicación bidireccional, la creación de salas de chat y el envío de mensajes, integrando notificaciones en tiempo real (Broadcast).

| Método | Descripción | Validación / DTO |
| **`searchUsers(req, res)`** | Busca usuarios disponibles para iniciar un chat, excluyendo al usuario autenticado. | *Ninguno (Usa `req.query.q`)* |
| **`list(req, res)`** | Lista todos los chats activos en los que participa el usuario autenticado. | *Ninguno* |
| **`create(req, res)`** | Crea una nueva sala de chat con otro usuario o recupera una ya existente. | `createChatDto(req.body)` |
| **`messages(req, res)`** | Obtiene el historial de mensajes de un chat específico (`chatId`). | `chatIdDto(req.params)` |
| **`send(req, res)`** | Envía un mensaje a un chat y dispara un evento de broadcast (`broadcastChatMessage`) a los participantes. | `chatIdDto(req.params)` <br> `createMessageDto(req.body)` |

---

#### Comentarios (comentarios.controller.js)
> Administra la interacción de los usuarios en las publicaciones mediante el sistema de comentarios.

| Método | Descripción | Validación / DTO |
| **`getAll(req, res)`** | Devuelve la totalidad de los comentarios registrados en el sistema (Endpoint general). | *Ninguno* |
| **`getByPublicacion(req, res)`** | Obtiene los comentarios de una publicación por ID. Si falta el `publicacion_id`, redirige a `getAll`. | `listComentariosDto(req.query)` |
| **`create(req, res)`** | Crea un comentario inyectando automáticamente el `userId` y `username` del usuario autenticado. | `createComentarioDto(req.body)` |
| **`remove(req, res)`** | Elimina un comentario del sistema validando la propiedad y permisos del `userId`. | `idParamDto(req.params)` |

---

#### Comunidades (comunidades.controller.js)
> Gestiona la creación de grupos o comunidades, así como la membresía y el flujo de los usuarios al unirse o abandonar las mismas.

| Método | Descripción | Validación / DTO |
| **`getAll(req, res)`** | Obtiene la lista de todas las comunidades disponibles, con la opción de filtrar u optimizar por un `userId` opcional pasado en la consulta. | *Ninguno (Usa `req.query.userId`)* |
| **`getById(req, res)`** | Recupera la información detallada de una comunidad específica mediante su ID. | `idParamDto(req.params)` |
| **`create(req, res)`** | Crea una nueva comunidad asociando automáticamente el ID del usuario autenticado como el creador de la misma. | `createComunidadDto(req.body)` |
| **`join(req, res)`** | Registra la participación del usuario autenticado dentro de una comunidad específica. | `idParamDto(req.params)` |
| **`leave(req, res)`** | Remueve al usuario autenticado de la lista de miembros de una comunidad específica. | `idParamDto(req.params)` |

---

#### Media (media.controller.js)
> Controla el proceso de carga, firmado y confirmación de archivos multimedia en el servidor o proveedor de almacenamiento.

| Método | Descripción | Validación / DTO |
| **`signature(req, res)`** | Genera una firma o credencial segura de carga vinculada al usuario autenticado para autorizar subidas multimedia. | `mediaSignatureDto(req.body)` |
| **`commit(req, res)`** | Confirma y consolida de manera definitiva el almacenamiento del archivo multimedia en el sistema. | `mediaCommitDto(req.body)` |

---

#### Notificaciones (notificaciones.controller.js)
> Centraliza la gestión del historial de notificaciones del usuario, el conteo de elementos pendientes y las actualizaciones de estado de lectura.

| Método | Descripción | Validación / DTO |
| **`getAll(req, res)`** | Recupera la totalidad de las notificaciones pertenecientes al usuario autenticado. | *Ninguno* |
| **`countUnread(req, res)`** | Obtiene la cantidad exacta de notificaciones que el usuario tiene pendientes por leer. | *Ninguno* |
| **`markAsRead(req, res)`** | Cambia el estado de una notificación específica a leída, validando la propiedad de la misma. | `idParamDto(req.params)` |
| **`markAllRead(req, res)`** | Marca de forma masiva todas las notificaciones pendientes del usuario actual como leídas. | *Ninguno* |
| **`remove(req, res)`** | Elimina permanentemente una notificación del historial del usuario. | `idParamDto(req.params)` |

---

#### Publicaciones (publicaciones.controller.js)
> Centraliza la gestión del contenido publicado por los usuarios, incluyendo la obtención, creación, eliminación y el sistema de votaciones.

| Método | Descripción | Validación / DTO |
| **`getAll(req, res)`** | Obtiene una lista paginada o filtrada de todas las publicaciones del sistema. | `listPublicacionesDto(req.query)` |
| **`getById(req, res)`** | Recupera una publicación específica por su ID, permitiendo comprobar interacciones mediante un `userId` opcional. | `idParamDto(req.params)` |
| **`create(req, res)`** | Registra una nueva publicación asociándola de forma automática al ID del usuario autenticado. | `createPublicacionDto(req.body)` |
| **`remove(req, res)`** | Elimina una publicación específica validando que pertenezca al usuario que realiza la petición. | `idParamDto(req.params)` |
| **`vote(req, res)`** | Registra o actualiza el voto (positivo/negativo) de un usuario en una publicación determinada. | `idParamDto(req.params)` <br> `votePublicacionDto(req.body)` |

---

#### Usuarios (usuarios.controller.js)
> Administra perfiles de usuario, relaciones de seguimiento, actualizaciones de datos y la obtención de contenido específico de cada perfil (publicaciones, comentarios, compartidos y comunidades).

| Método | Descripción | Validación / DTO |
| **`me(req, res)`** | Devuelve el perfil detallado del usuario autenticado actual. | *Ninguno* |
| **`isAdmin(req, res)`** | Verifica y responde si el usuario autenticado posee rol de administrador. | *Ninguno* |
| **`getProfile(req, res)`** | Obtiene la información pública del perfil de un usuario externo a través de su nombre de usuario. | `usernameParamDto(req.params)` |
| **`getByUsername(req, res)`** | Recupera los datos base de un usuario buscando directamente por su nombre de usuario. | `usernameParamDto(req.params)` |
| **`getPublicaciones(req, res)`** | Lista todas las publicaciones creadas por un usuario específico. | `usernameParamDto(req.params)` |
| **`getComentarios(req, res)`** | Lista los comentarios que han sido realizados por un usuario específico. | `usernameParamDto(req.params)` |
| **`getCompartidos(req, res)`** | Obtiene el listado de publicaciones que un usuario específico ha compartido en la plataforma. | `usernameParamDto(req.params)` |
| **`getComunidades(req, res)`** | Devuelve las comunidades a las que pertenece o sigue un usuario determinado. | `usernameParamDto(req.params)` |
| **`updatePerfil(req, res)`** | Modifica los datos del perfil del usuario autenticado. | `updatePerfilDto(req.body)` |
| **`follow(req, res)`** | Permite al usuario autenticado comenzar a seguir a otro usuario del sistema. | `usernameParamDto(req.params)` |
| **`unfollow(req, res)`** | Remueve la relación de seguimiento hacia un usuario específico. | `usernameParamDto(req.params)` |
| **`sharePost(req, res)`** | Permite al usuario autenticado compartir una publicación existente en su propio perfil. | `requiredId(req.params.postId)` |
| **`unsharePost(req, res)`** | Elimina una publicación previamente compartida del perfil del usuario. | `requiredId(req.params.postId)` |