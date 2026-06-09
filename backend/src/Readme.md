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

---

## Servicios (Services)

Los servicios contienen la lógica de negocio principal de la aplicación. Se encargan de interactuar con los modelos de la base de datos, gestionar flujos de datos asíncronos, aplicar transformaciones complejas y lanzar excepciones controladas cuando no se cumplen las reglas de negocio.
---

### Detalle de los Módulos

#### Autenticación (auth.service.js)

##### toAuthUser(user)
* **Comportamiento interno**:
  * Inicializa un objeto literal `authUser` con las propiedades estructurales `id: user.id`, `email: user.email` y `username: user.username`.
  * Evalúa condicionalmente si `user.avatar_url !== undefined`. Si se cumple, añade la propiedad `avatar_url` a `authUser`.
  * Evalúa condicionalmente si `user.bio !== undefined`. Si se cumple, añade la propiedad `bio` a `authUser`.
  * Evalúa condicionalmente si `user.fecha_creacion !== undefined`. Si se cumple, añade la propiedad `fecha_creacion` a `authUser`.
  * Evalúa condicionalmente si `user.is_admin !== undefined`. Si se cumple, asigna a la propiedad `authUser.isAdmin` el resultado booleano de la expresión `user.is_admin === 1 || user.is_admin === true`.
* **Retorno**: El objeto transformado `authUser`.

##### register({ email, username, password })
* **Comportamiento interno**:
  * Ejecuta la consulta asíncrona `await UserModel.findByEmailOrUsername(email, username)`.
  * Evalúa si la longitud del arreglo devuelto (`existing.length`) es mayor que `0`. Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(409, 'Email o username ya en uso')`.
  * Genera un identificador único invocando a la función `uuidv4()`.
  * Genera el hash de la contraseña mediante la instrucción asíncrona `await bcrypt.hash(password, 12)`.
  * Inserta el nuevo registro ejecutando `await UserModel.create({ id, email, username, passwordHash })`.
  * Genera un token JWT firmando las propiedades `{ id, email, username }` con la clave secreta `process.env.JWT_SECRET` y una expiración configurada en `'7d'`.
  * Recupera el registro final de la base de datos llamando asíncronamente a `await UserModel.findById(id)`.
* **Retorno**: Un objeto que contiene el `token` y la propiedad `user` evaluada internamente mediante el método `this.toAuthUser(user)`.

##### login({ email, password })
* **Comportamiento interno**:
  * Ejecuta la consulta asíncrona `await UserModel.findByEmail(email)`.
  * Evalúa si el objeto `user` es falso o inexistente. Si se cumple, ejecuta la instrucción `throw new AppError(401, 'Credenciales incorrectas')`.
  * Evalúa la contraseña comparando el texto plano con el hash mediante `await bcrypt.compare(password, user.password)`.
  * Si el resultado booleano `valid` es falso, interrumpe el flujo ejecutando `throw new AppError(400)

## comunidades.service.js

##### getAll(userId)
* **Comportamiento interno**:
  * Ejecuta la consulta asíncrona `await CommunityModel.findAll(userId)`.
* **Retorno**: Una lista con todas las comunidades asociadas al usuario.

##### getById(id, userId)
* **Comportamiento interno**:
  * Recupera el registro de la comunidad llamando asíncronamente a `await CommunityModel.findById(id, userId)`.
  * Evalúa si no se encontró la comunidad (`!comunidad`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Comunidad no encontrada')`.
* **Retorno**: El objeto `comunidad` encontrado.

##### create({ nombre, descripcion, categoria, creadorId })
* **Comportamiento interno**:
  * Inserta la nueva comunidad ejecutando `await CommunityModel.create({ nombre, descripcion, categoria, creadorId })` y almacena el identificador generado en `comunidadId`.
  * Registra al creador como miembro ejecutando `await CommunityModel.addMember(comunidadId, creadorId)`.
  * Incrementa el contador de miembros de la comunidad invocando a `await CommunityModel.incrementMembers(comunidadId)`.
  * Recupera la comunidad creada llamando de forma asíncrona a `this.getById(comunidadId, creadorId)`.
* **Retorno**: El objeto de la comunidad recién creada con los datos del creador.

##### join(comunidadId, userId)
* **Comportamiento interno**:
  * Verifica la existencia de la comunidad invocando asíncronamente a `await this.getById(comunidadId, userId)`.
  * Evalúa si el usuario ya es miembro de la comunidad llamando a `await CommunityModel.isMember(comunidadId, userId)`. Si es verdadero (`alreadyMember`), interrumpe y finaliza la ejecución de la función sin realizar cambios.
  * Añade al usuario como miembro de la comunidad ejecutando `await CommunityModel.addMember(comunidadId, userId)`.
  * Incrementa el contador de miembros invocando a `await CommunityModel.incrementMembers(comunidadId)`.
* **Retorno**: `undefined` (ninguno).

##### leave(comunidadId, userId)
* **Comportamiento interno**:
  * Remueve al usuario de la comunidad ejecutando la consulta asíncrona `await CommunityModel.removeMember(comunidadId, userId)` y almacena el número de filas afectadas en `affectedRows`.
  * Evalúa si el valor de `affectedRows` es igual a `0`. Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'No eres miembro de esta comunidad')`.
  * Decrementa el contador de miembros invocando a `await CommunityModel.decrementMembers(comunidadId)`.
* **Retorno**: `undefined` (ninguno).

---

## media.service.js

##### createSignature({ folder, userId })
* **Comportamiento interno**:
  * Calcula el timestamp actual en segundos mediante `Math.floor(Date.now() / 1000)`.
  * Estructura un objeto `paramsToSign` con las propiedades `folder`,

## publicaciones.service.js

##### getAll({ comunidad_id, userId })
* **Comportamiento interno**:
  * Ejecuta la consulta asíncrona `await PostModel.findAll({ comunidad_id, userId })`.
* **Retorno**: Una lista con todas las publicaciones filtradas según los parámetros proporcionados.

##### getById(id, userId)
* **Comportamiento interno**:
  * Recupera el registro de la publicación llamando asíncronamente a `await PostModel.findById(id, userId)`.
  * Evalúa si no se encontró la publicación (`!post`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Publicación no encontrada')`.
* **Retorno**: El objeto `post` encontrado.

##### create({ titulo, contenido, url_imagen, url_video, media_asset_id, comunidad_id, usuarioId })
* **Comportamiento interno**:
  * Busca la comunidad llamando asíncronamente a `await CommunityModel.findById(comunidad_id)`.
  * Evalúa si la comunidad no existe (`!comunidad`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Comunidad no encontrada')`.
  * Verifica si el usuario es miembro mediante la consulta asíncrona `await CommunityModel.isMember(comunidad_id, usuarioId)`. Si no lo es (`!isMember`), interrumpe el flujo ejecutando `throw new AppError(403, 'Debes pertenecer a la comunidad para publicar')`.
  * Inicializa las variables `finalImageUrl` y `finalVideoUrl` con los valores recibidos o `null` por defecto.
  * Evalúa si se proporcionó un `media_asset_id`. Si es verdadero, invoca asíncronamente a `await mediaService.getById(media_asset_id)` y asigna la propiedad `secure_url` a `finalImageUrl` o `finalVideoUrl` según corresponda si el `resource_type` es `'image'` o `'video'`.
  * Inserta la nueva publicación ejecutando la consulta asíncrona `await PostModel.create({...})` y almacena el identificador generado en `postId`.
  * Incrementa el contador de publicaciones de la comunidad invocando a `await CommunityModel.incrementPosts(comunidad_id)`.
  * Recupera el registro final de la publicación llamando de forma asíncrona a `this.getById(postId, usuarioId)`.
* **Retorno**: El objeto de la publicación recién creada.

##### remove(id, userId)
* **Comportamiento interno**:
  * Recupera los datos base de la publicación mediante `await PostModel.findRawById(id)`.
  * Evalúa si la publicación no existe (`!post`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Publicación no encontrada')`.
  * Verifica si el `usuario_id` de la publicación difiere del `userId` del solicitante. Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(403, 'No autorizado')`.
  * Elimina el registro llamando asíncronamente a `await PostModel.delete(id)`.
  * Decrementa el contador de publicaciones de la comunidad asociada ejecutando `await CommunityModel.decrementPosts(post.comunidad_id)`.
* **Retorno**: `undefined` (ninguno).

##### vote(postId, userId, tipo_voto)
* **Comportamiento interno**:
  * Busca la publicación llamando asíncronamente a `await PostModel.findRawById(postId)`.
  * Evalúa si la publicación no existe (`!post`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Publicación no encontrada')`.
  * Busca un voto previo del usuario en esa publicación ejecutando `await VoteModel.find(userId, postId)` y guarda el resultado en `existing`.
  * Evalúa si ya existe un voto (`existing`):
    * Si el `votoActual` es idéntico al `tipo_voto` solicitado, elimina el voto llamando a `await VoteModel.delete(userId, postId)`, recalcula los votos con `await PostModel.recalculateVotes(postId)`, obtiene la publicación actualizada con `await this.getById(postId, userId)` y retorna un objeto indicando que el voto fue eliminado.
    * Si el `votoActual` es diferente, actualiza el registro llamando a `await VoteModel.update(userId, postId, tipo_voto)`, recalcula con `await PostModel.recalculateVotes(postId)`, obtiene la publicación actualizada con `await this.getById(postId, userId)` y retorna un objeto indicando que el voto fue actualizado.
  * En caso de no existir un voto previo, inserta un nuevo registro ejecutando `await VoteModel.create(userId, postId, tipo_voto)`.
  * Recalcula los votos de la publicación invocando a `await PostModel.recalculateVotes(postId)`.
  * Recupera el estado final de la publicación llamando asíncronamente a `await this.getById(postId, userId)`.
* **Retorno**: Un objeto con las propiedades `mensaje`, `voto` (el tipo de voto actual o null), `votos` (el conteo actualizado) y el objeto `post`.

---

## usuarios.service.js

##### getByUsername(username)
* **Comportamiento interno**:
  * Busca al usuario ejecutando la consulta asíncrona `await UserModel.findByUsername(username)`.
  * Evalúa si no se encontró al usuario (`!user`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Usuario no encontrado')`.
* **Retorno**: El objeto `user` encontrado.

##### isAdmin(userId)
* **Comportamiento interno**:
  * Ejecuta la consulta asíncrona `return UserModel.isAdmin(userId)`.
* **Retorno**: Un valor booleano que determina si el usuario posee privilegios de administrador.

##### getPublicaciones(username, viewerId = null)
* **Comportamiento interno**:
  * Obtiene la información del usuario llamando asíncronamente a `await this.getByUsername(username)`.
  * Recupera las publicaciones del usuario ejecutando la consulta `await PostModel.findByUserId(user.id, viewerId)`.
* **Retorno**: Una lista con las publicaciones creadas por el usuario.

##### getComentarios(username)
* **Comportamiento interno**:
  * Obtiene la información del usuario llamando asíncronamente a `await this.getByUsername(username)`.
  * Recupera los comentarios del usuario ejecutando la consulta `await CommentModel.findByUserId(user.id)`.
* **Retorno**: Una lista con los comentarios realizados por el usuario.

##### getCompartidos(username, viewerId = null)
* **Comportamiento interno**:
  * Obtiene la información del usuario llamando asíncronamente a `await this.getByUsername(username)`.
  * Recupera las publicaciones compartidas ejecutando la consulta `await PostModel.findSharedByUserId(user.id, viewerId)`.
* **Retorno**: Una lista con las publicaciones compartidas por el usuario.

##### getComunidades(username)
* **Comportamiento interno**:
  * Obtiene la información del usuario llamando asíncronamente a `await this.getByUsername(username)`.
  * Recupera las comunidades asociadas ejecutando la consulta `await CommunityModel.findByUserId(user.id)`.
* **Retorno**: Una lista con las comunidades a las que pertenece el usuario.

##### getProfile(username, viewerId = null)
* **Comportamiento interno**:
  * Obtiene los datos base del usuario invocando de forma asíncrona a `await this.getByUsername(username)`.
  * Ejecuta de forma paralela mediante `Promise.all` las consultas: conteos de actividad (`UserModel.countsByUserId`), lista de seguidores (`UserModel.followersByUserId`), lista de seguidos (`UserModel.followingByUserId`) y verificación de seguimiento activo (`UserModel.isFollowing`).
* **Retorno**: Un objeto compuesto por los datos del usuario, las propiedades booleanas `is_me` e `is_following`, y los arreglos/objetos de `counts`, `followers` y `following`.

##### updatePerfil(userId, { avatar_url, bio, username })
* **Comportamiento interno**:
  * Obtiene el perfil actual llamando asíncronamente a `await UserModel.findById(userId)`.
  * Evalúa si el usuario no existe (`!current`). Si es verdadero, interrumpe el flujo ejecutando `throw new AppError(404, 'Usuario no encontrado')`.
  * Evalúa si se proporciona un nuevo `username` y si este difiere del actual. Si es verdadero, comprueba su disponibilidad llamando a `await UserModel.usernameExists(username)`; si ya existe, interrumpe el flujo con `throw new AppError(400, 'El nombre de usuario ya existe')`.
  * Actualiza los datos del perfil invocando a `await UserModel.updateProfile(userId, {...})` empleando el operador de fusión nula (`??`) para preservar los valores anteriores que no se hayan enviado.
  * Evalúa si la actualización falló o no devolvió un usuario (`!user`). Si es verdadero, lanza `throw new AppError(404, 'Usuario no encontrado')`.
* **Retorno**: El objeto `user` con los campos actualizados.

##### follow(username, viewerId)
* **Comportamiento interno**:
  * Obtiene la información del usuario a seguir llamando asíncronamente a `await this.getByUsername(username)`.
  * Evalúa si el `user.id` es igual al `viewerId`. Si es verdadero, interrumpe el flujo con `throw new AppError(400, 'No puedes seguirte a ti mismo')`.
  * Registra la relación de seguimiento ejecutando la consulta asíncrona `await UserModel.follow(viewerId, user.id)` y