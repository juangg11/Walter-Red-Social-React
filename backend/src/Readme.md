# Walter Readme Backend

Este módulo contiene la lógica de acoplamiento de la API, encargada de gestionar las peticiones HTTP entrantes, validar los datos de entrada y conectar con la capa de negocio.
---

## Middlewares

Los middlewares interceptan las solicitudes HTTP entrantes para aplicar validaciones de seguridad, control de tasa de peticiones, autenticación de identidad y el manejo unificado de errores antes o después de interactuar con los controladores.

---

### Detalle de los Módulos

#### Autenticación (auth.js)

##### authMiddleware(req, res, next)
* **Comportamiento interno**:
  * Obtiene el encabezado de autorización mediante la lectura de `req.headers.authorization`.
  * Evalúa si el encabezado existe y si empieza estrictamente con el formato `'Bearer '`. Si la condición no se cumple, invoca `next(new AppError(401, 'Token requerido'))`.
  * Extrae la cadena del token mediante la instrucción `header.split(' ')[1]`.
  * Introduce un bloque `try/catch` para realizar las siguientes acciones internas:
    * Verifica el token por medio de `jwt.verify(token, process.env.JWT_SECRET)` para obtener el objeto `payload`.
    * Realiza una consulta asíncrona a la base de datos ejecutando `await UserModel.findById(payload.id)`.
    * Evalúa si el resultado devuelto de la búsqueda del usuario es falso o inexistente. Si se cumple la condición, invoca `next(new AppError(401, 'Tu sesion ya no es valida. Inicia sesion otra vez.'))`.
    * Si el usuario es encontrado con éxito, asigna el valor de `payload` a la propiedad `req.user` y procede llamando a la función de continuación `next()`.
    * En caso de que se capture un error en el proceso del bloque `try`, el bloque `catch` ejecuta la instrucción `next(new AppError(401, 'Token inválido o expirado'))`.

---

#### Seguridad y Control de Tasa (security.js)

##### securityMiddleware
* **Tipo de recurso**: Arreglo (`Array`) que contiene configuraciones middleware globales.
* **Elementos incluidos**:
  * **`helmet()`**: Inicialización de la librería de seguridad para las cabeceras HTTP.
  * **`rateLimit()`**: Instancia del limitador de tasa configurada con los siguientes parámetros:
    * `windowMs`: `15 * 60 * 1000` (Equivalente a un intervalo temporal de 15 minutos).
    * `limit`: `300` (Límite máximo fijado en 300 solicitudes por cada ventana de tiempo).
    * `standardHeaders`: `true`.
    * `legacyHeaders`: `false`.
    * `message`: Objeto literal conteniendo `{ error: 'Demasiadas peticiones, inténtalo más tarde' }`.

##### authRateLimit
* **Tipo de recurso**: Instancia específica de `rateLimit()` para las rutas de autenticación.
* **Parámetros configurados**:
  * `windowMs`: `15 * 60 * 1000` (Equivalente a un intervalo temporal de 15 minutos).
  * `limit`: `30` (Límite estricto fijado en 30 intentos de solicitud por cada ventana de tiempo).
  * `standardHeaders`: `true`.
  * `legacyHeaders`: `false`.
  * `message`: Objeto literal conteniendo `{ error: 'Demasiados intentos de autenticación' }`.

---

#### Manejador de Errores (error.js)

##### notFoundHandler(req, res)
* **Comportamiento interno**:
  * Captura solicitudes dirigidas a rutas inexistentes y devuelve una respuesta con estado HTTP `404`.
  * Estructura la respuesta en formato JSON con la propiedad `error` evaluada mediante el string literalizado ``Ruta no encontrada: ${req.method} ${req.originalUrl}``.

##### errorHandler(error, _req, res, _next)
* **Comportamiento interno**:
  * Evalúa en primera instancia si la propiedad `error?.code` es estrictamente igual a la cadena `'ER_DUP_ENTRY'`. Si la condición resulta verdadera, retorna una respuesta HTTP con código de estado `409` y el objeto JSON `{ error: 'El recurso ya existe' }`.
  * Evalúa en segunda instancia si el error corresponde a un error de aplicación controlado llamando a la función `isAppError(error)`. Si se confirma como verdadero, retorna una respuesta utilizando el código numérico provisto en `error.status` junto con un objeto JSON estructurado con:
    * `error`: El valor asignado en `error.message`.
    * `details`: Incluye de manera condicional la propiedad `details` si el objeto `error.details` evalúa como verdadero.
  * Si el error no cumple ninguna de las condiciones de validación previas, ejecuta la salida `console.error(error)` en la terminal del sistema y finaliza enviando un estado HTTP `500` junto con el objeto JSON `{ error: 'Error interno del servidor' }`.
---

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

### DTO'S
Los DTOs se encargan de la capa de transformación, limpieza y validación estricta de los datos entrantes de las solicitudes HTTP  antes de que la información sea transferida a los servicios de negocio.

---

## Data Transfer Objects (DTOs)

Los DTOs se encargan de la capa de transformación, limpieza y validación estricta de los datos entrantes de las solicitudes HTTP (`req.body`, `req.query`, `req.params`) antes de que la información sea transferida a los servicios de negocio.

### Detalle de los Módulos

#### Autenticación (auth.dto.js)

##### registerDto(body)
* **Origen de datos**: `body`.
* **Propiedades retornadas**:
  * `email`: Evaluado mediante la función `requiredEmail(body)`.
  * `username`: Evaluado mediante la función `requiredUsernameValue(body.username)`.
  * `password`: Evaluado mediante la función `requiredString(body, 'password', 'La contraseña', { min: 6, max: 128 })`.

##### loginDto(body)
* **Origen de datos**: `body`.
* **Propiedades retornadas**:
  * `email`: Evaluado mediante la función `requiredEmail(body)`.
  * `password`: Evaluado mediante la función `requiredString(body, 'password', 'La contraseña', { min: 1, max: 128 })`.

##### checkUsernameDto(query)
* **Origen de datos**: `query`.
* **Propiedades retornadas**:
  * `username`: Evaluado mediante la función `requiredUsernameValue(query.username)`.

---

#### Chat y Mensajería (chat.dto.js)

##### createChatDto(body)
* **Origen de datos**: `body`.
* **Comportamiento interno**: 
  * Evalúa si `typeof body.userId === 'string'`. Si es verdadero, aplica `body.userId.trim()`, de lo contrario asigna un string vacío `''`.
  * Si la variable resultante `userId` está vacía, lanza una excepción `new AppError(400, 'userId es obligatorio')`.
* **Propiedades retornadas**:
  * `userId`: String limpio resultante.

##### createMessageDto(body)
* **Origen de datos**: `body`.
* **Comportamiento interno**:
  * Define `contenido` mediante `optionalString(body, 'contenido', 'El mensaje', { max: 5000 })`.
  * Define `media_asset_id` mediante `optionalId(body.media_asset_id, 'media_asset_id')`.
  * Si `contenido` y `media_asset_id` son ambos falsos/inexistentes, lanza una excepción `new AppError(400, 'El mensaje o la imagen son obligatorios')`.
* **Propiedades retornadas**:
  * `contenido`: El valor obtenido de `optionalString`.
  * `media_asset_id`: El valor obtenido de `optionalId`.
  * `respuesta_a_id`: Evaluado mediante `optionalId(body.respuesta_a_id, 'respuesta_a_id')`.

##### chatIdDto(params)
* **Origen de datos**: `params`.
* **Propiedades retornadas**:
  * `chatId`: Evaluado mediante la función `requiredId(params.chatId, 'chatId')`.

---

#### Comentarios (comentarios.dto.js)

##### listComentariosDto(query)
* **Origen de datos**: `query`.
* **Propiedades retornadas**:
  * `publicacion_id`: Evaluado mediante la función `requiredId(query.publicacion_id, 'publicacion_id')`.

##### createComentarioDto(body)
* **Origen de datos**: `body`.
* **Propiedades retornadas**:
  * `contenido`: Evaluado mediante la función `requiredString(body, 'contenido', 'El contenido', { min: 1, max: 250 })`.
  * `publicacion_id`: Evaluado mediante la función `requiredId(body.publicacion_id, 'publicacion_id')`.
  * `comentario_padre_id`: Evaluado mediante la función `optionalId(body.comentario_padre_id, 'comentario_padre_id')`.

---

#### Comunidades (comunidades.dto.js)

##### createComunidadDto(body)
* **Origen de datos**: `body`.
* **Propiedades retornadas**:
  * `nombre`: Evaluado mediante la función `requiredString(body, 'nombre', 'El nombre', { min: 2, max: 35 })`.
  * `descripcion`: Evaluado mediante la función `optionalString(body, 'descripcion', 'La descripción', { max: 200 })`.
  * `categoria`: Evaluado mediante la función `optionalString(body, 'categoria', 'La categoría', { max: 15 })`.

---

#### Media (media.dto.js)

##### mediaSignatureDto(body)
* **Origen de datos**: `body`.
* **Comportamiento interno**:
  * Define la variable interna `folder` mediante `requiredString(body, 'folder', 'folder', { min: 2, max: 120 })`.
* **Propiedades retornadas**:
  * `folder`: El valor obtenido de la validación string obligatoria.

##### mediaCommitDto(body)
* **Origen de datos**: `body`.
* **Propiedades retornadas**:
  * `public_id`: Evaluado mediante la función `requiredString(body, 'public_id', 'public_id', { min: 3, max: 255 })`.
  * `secure_url`: Evaluado mediante la función `requiredString(body, 'secure_url', 'secure_url', { min: 10, max: 5000 })`.
  * `resource_type`: Evaluado mediante la función `requiredString(body, 'resource_type', 'resource_type', { min: 3, max: 20 })`.
  * `format`: Evaluado mediante la función `optionalString(body, 'format', 'format', { max: 20 })`.
  * `bytes`: Evalúa mediante la expresión `Number.isFinite(Number(body.bytes)) ? Number(body.bytes) : null`.
  * `width`: Evalúa mediante la expresión `Number.isFinite(Number(body.width)) ? Number(body.width) : null`.
  * `height`: Evalúa mediante la expresión `Number.isFinite(Number(body.height)) ? Number(body.height) : null`.
  * `duration`: Evalúa mediante la expresión `Number.isFinite(Number(body.duration)) ? Number(body.duration) : null`.

##### validateMediaResourceType(resourceType)
* **Origen de datos**: Parámetro directo `resourceType`.
* **Comportamiento interno**:
  * Evalúa si el arreglo `['image', 'video', 'raw']` no incluye (`!includes`) el valor de `resourceType`. Si la condición se cumple, ejecuta la instrucción `throw new AppError(400, 'resource_type inválido')`.

---

#### Comunes (common.dto.js)

##### idParamDto(params, key = 'id')
* **Origen de datos**: `params` e identificador opcional `key` cuyo valor por defecto es `'id'`.
* **Propiedades retornadas**:
  * Retorna un objeto con una propiedad dinámica calculada según el valor de `key` (representada mediante `[key]`), cuyo valor asignado es evaluado a través de la función `requiredId(params[key], key)`.

---

#### Publicaciones (publicaciones.dto.js)

##### listPublicacionesDto(query)
* **Origen de datos**: `query`.
* **Propiedades retornadas**:
  * `comunidad_id`: Evaluado mediante la función `optionalId(query.comunidad_id, 'comunidad_id')`.
  * `userId`: Evalúa mediante la expresión `typeof query.userId === 'string' && query.userId.trim() ? query.userId.trim() : null`.

##### createPublicacionDto(body)
* **Origen de datos**: `body`.
* **Comportamiento interno**:
  * Define la variable interna `mediaAssetId` mediante `optionalId(body.media_asset_id, 'media_asset_id')`.
* **Propiedades retornadas**:
  * `titulo`: Evaluado mediante la función `requiredString(body, 'titulo', 'El título', { min: 1, max: 150 })`.
  * `contenido`: Evaluado mediante la función `optionalString(body, 'contenido', 'El contenido', { max: 1000 })`.
  * `url_imagen`: Evalúa mediante la expresión `mediaAssetId ? null : requiredUrl(body, 'url_imagen', 'La URL de imagen')`.
  * `url_video`: Evalúa mediante la expresión `mediaAssetId ? null : requiredUrl(body, 'url_video', 'La URL de vídeo')`.
  * `media_asset_id`: El valor de la variable interna `mediaAssetId`.
  * `comunidad_id`: Evaluado mediante la función `requiredId(body.comunidad_id, 'comunidad_id')`.

##### votePublicacionDto(body)
* **Origen de datos**: `body`.
* **Comportamiento interno**:
  * Define la variable interna `tipo_voto` mediante la expresión `typeof body.tipo_voto === 'string' ? body.tipo_voto.trim() : ''`.
  * Evalúa si el arreglo `['up', 'down']` no incluye (`!includes`) el valor de `tipo_voto`. Si la condición se cumple, ejecuta la instrucción `throw new AppError(400, 'tipo_voto debe ser "up" o "down"')`.
* **Propiedades retornadas**:
  * `tipo_voto`: El valor limpio de la variable interna resultante.

---

#### Usuarios (usuarios.dto.js)

##### usernameParamDto(params)
* **Origen de datos**: `params`.
* **Propiedades retornadas**:
  * `username`: Evaluado mediante la función `requiredUsernameValue(params.username)`.

##### updatePerfilDto(body)
* **Origen de datos**: `body`.
* **Propiedades retornadas**:
  * `avatar_url`: Evaluado mediante la función `requiredUrl(body, 'avatar_url', 'avatar_url')`.
  * `bio`: Evaluado mediante la función `optionalString(body, 'bio', 'La biografía', { max: 280 })`.
  * `username`: Evaluado mediante la función `optionalString(body, 'username', 'El nombre de usuario', { min: 3, max: 30 })`.