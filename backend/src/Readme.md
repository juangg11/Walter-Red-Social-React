# Walter Readme Backend

Este módulo contiene la lógica de acoplamiento de la API, encargada de gestionar las peticiones HTTP entrantes, validar los datos de entrada y conectar con la capa de negocio.
# Arquitectura del Backend

El proyecto está estructurado bajo una arquitectura limpia y desacoplada en capas. Las responsabilidades se dividen rigurosamente para evitar el acoplamiento y facilitar el mantenimiento del código.

## Flujo de una Petición (Request / Response)

A continuación se muestra cómo viajan los datos a través de las distintas capas del sistema desde que el cliente realiza una petición hasta que recibe la respuesta:

```text
       [ Cliente / Frontend ]
                 │  ▲
  (1) Request     │  │ (8) Response (JSON)
                 ▼  │
   ┌───────────────────────────────────┐
   │            CONTROLLER             │  <── Punto de entrada HTTP.
   └───────────────────────────────────┘
                 │  ▲
  (2) Extrae     │  │ (7) Retorna DTO mapeado o
      datos/id   │  │     Entidad procesada
                 ▼  │
   ┌───────────────────────────────────┐
   │          SERVICE LAYER            │  <── Cerebro del sistema (Lógica de negocio).
   └───────────────────────────────────┘
            │  ▲           │  ▲
   (3) Pide │  │ (6) Datos (4) │  │ (5) Valida/
      datos │  │ raw      Valida│  │ Mapea
            ▼  │           ▼  │
   ┌────────────────┐     ┌────────────────┐
   │     MODELS     │     │      DTOs      │  <── Validación de entrada y
   │  (Base Datos)  │     │ (Data Transfer)│      limpieza de salida.
   └────────────────┘     └────────────────┘
   ```
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
  * Registra la relación de seguimiento ejecutando la consulta asíncrona `await UserModel.follow(viewerId, user.id)` 

## Modelos (Models)

Los modelos se encargan de la persistencia de datos y de interactuar directamente con la base de datos a través de consultas SQL parametrizadas. Abstraen toda la complejidad de las uniones, subconsultas y el control de versiones del esquema de base de datos para proveer una interfaz limpia a la capa de servicios.
---

### Detalle de los Módulos

#### Mensajes y Chats (chat.model.js)

##### findDirectChat(userA, userB)
* **Comportamiento interno**:
  * Ejecuta una consulta asíncrona a la base de datos aplicando un `INNER JOIN` entre las tablas `chats` y `chats_participantes`.
  * Filtra en tiempo de ejecución para encontrar un registro en común donde coincidan simultáneamente los identificadores de ambos usuarios (`userA` y `userB`) limitando el resultado a un único elemento (`LIMIT 1`).
* **Retorno**: El primer objeto del chat correspondiente si existe, o `null` si no hay un chat directo previo entre ambos.

##### createDirectChat(createdBy, otherUserId)
* **Comportamiento interno**:
  * Realiza una inserción asíncrona en la tabla `chats` guardando el identificador del usuario que origina la acción en la columna `creado_por`.
  * Utiliza el identificador autogenerado (`result.insertId`) para efectuar una inserción masiva en la tabla pivote `chats_participantes`, asociando formalmente tanto al creador como al destinatario al nuevo chat.
* **Retorno**: El identificador numérico (`insertId`) asignado al chat recién creado.

##### findByIdForUser(chatId, userId)
* **Comportamiento interno**:
  * Ejecuta una consulta de selección cruzando las tablas `chats` y `chats_participantes` mediante una relación de igualdad en `chat_id`.
  * Valida bajo condiciones estrictas que el chat coincida con el `chatId` suministrado y que el `userId` forme parte activa de los registros de participantes.
* **Retorno**: El objeto del chat validado si el usuario tiene permisos de acceso, o `null` en caso contrario.

##### listForUser(userId)
* **Comportamiento interno**:
  * Intenta realizar una consulta compleja con múltiples uniones (`INNER JOIN`) para recuperar los chats del usuario, los datos de perfil de la otra persona vinculada y subconsultas correlacionadas acopladas a `media_assets` para extraer metadatos del último mensaje enviado.
  * Controla excepciones estructurales a través de un bloque `catch` para interceptar códigos de error relacionados con esquemas heredados o antiguos (`isLegacySchemaError`).
  * Si se detecta un error de esquema antiguo, degrada la consulta de forma controlada omitiendo el acoplamiento con la tabla `media_assets` y forzando de manera estática el valor `NULL` para la propiedad `ultima_imagen`.
* **Retorno**: Un arreglo con todos los chats del usuario, ordenados de forma descendente utilizando `COALESCE` para priorizar la fecha del último mensaje o la actualización del chat.

##### listMessages(chatId, userId)
* **Comportamiento interno**:
  * Invoca de manera asíncrona al método interno `this.findByIdForUser(chatId, userId)` para garantizar que el solicitante pertenece al chat.
  * Intenta ejecutar una consulta SQL utilizando una macro de selección predefinida (`MESSAGE_SELECT`) que unifica la tabla `mensajes_chat` con referencias de usuarios, assets multimedia y mensajes de respuesta.
  * Administra errores estructurales mediante capturas y reintentos escalonados en bloques `catch` si se lanzan fallos de columnas o tablas inexistentes (`isLegacySchemaError`):
    * *Primer nivel de degradación*: Intenta consultar omitiendo por completo los campos y uniones relativos a la tabla `media

  #### Recursos Multimedia (media.model.js)

##### create(asset)
* **Comportamiento interno**:
  * Ejecuta una consulta asíncrona mediante la instrucción `INSERT INTO` en la tabla `media_assets`.
  * Mapea de forma posicional cada una de las propiedades del recurso (`public_id`, `secure_url`, `resource_type`).
  * Evalúa de forma individual mediante el operador lógico `||` los campos opcionales (`format`, `bytes`, `width`, `height`, `duration`), asignando de forma estática un valor `null` si no vienen informados en el argumento original.
* **Retorno**: El identificador numérico autogenerado (`insertId`) de la fila correspondiente al recurso multimedia guardado.

##### findById(id)
* **Comportamiento interno**:
  * Lanza una consulta de selección directa `SELECT *` sobre la tabla `media_assets` aplicando un filtro estricto por la clave primaria `id`.
* **Retorno**: El objeto plano con todas las columnas del registro multimedia si se localiza en el almacén, o `null` si no existe coincidencia.

##### findByPublicId(publicId)
* **Comportamiento interno**:
  * Realiza una consulta asíncrona de selección sobre la tabla `media_assets` condicionando el filtro a la columna identificadora externa `public_id` provista.
* **Retorno**: El primer objeto del asset correspondiente si existe, o `null` si el identificador público no está registrado.

#### Notificaciones (notification.model.js)

##### findAllByUser(userId)
* **Comportamiento interno**:
  * Ejecuta una consulta compleja a la tabla `notificaciones` aplicando un `LEFT JOIN` hacia la tabla de `publicaciones` (para consolidar el título del post) y un `LEFT JOIN` hacia `users` asignándole el alias `actor` (para extraer el nombre del usuario originario de la acción).
  * Filtra en tiempo de ejecución las filas donde la propiedad `usuario_id` coincide con el parámetro `userId`.
  * Aplica un condicional lógico estricto para discriminar el tipo de notificación: solo incluye aquellas donde la columna `tipo` está definida explícitamente como `'comentario'` o `'seguimiento'`, o en su defecto, aquellas de tipo por defecto o nulo (`'general'` o `NULL`) siempre y cuando posean una clave foránea válida vinculada a un post o comentario (`publicacion_id IS NOT NULL` o `comentario_id IS NOT NULL`).
  * Ordena los resultados cronológicamente de forma descendente y aplica una restricción de rendimiento acotando la selección a un máximo de 50 registros (`LIMIT 50`).
* **Retorno**: Un arreglo con los objetos de las notificaciones procesadas y formateadas que cumplen los criterios de filtrado.

##### countUnread(userId)
* **Comportamiento interno**:
  * Realiza una consulta de agregación utilizando la función estándar `COUNT(*)` sobre la tabla `notificaciones`.
  * Restringe el conteo a los registros que pertenezcan al identificador del usuario, que mantengan la columna booleana `leida = FALSE` y que respeten los mismos criterios lógicos de discriminación de tipología del método de listado (`tipo`, `publicacion_id`, `comentario_id`).
* **Retorno**: Un valor numérico entero que representa el total acumulado de las notificaciones no leídas de dicho usuario.

##### create({ usuario_id, titulo, mensaje, publicacion_id, comentario_id, tipo = 'general', actor_usuario_id = null })
* **Comportamiento interno**:
  * Lanza una instrucción asíncrona de inserción SQL en la tabla `notificaciones` pasando de manera parametrizada todos los metadatos e identificadores relacionales recibidos en el argumento.
  * Evalúa de forma predeterminada mediante la firma de la función que la columna `tipo` se guarde con el valor `'general'` y la columna `actor_usuario_id` con el valor `null` en caso de omitirse en la invocación.
* **Retorno**: `undefined` (ninguno).

##### markAsRead(id, userId)
* **Comportamiento interno**:
  * Ejecuta una instrucción de actualización (`UPDATE`) sobre la tabla `notificaciones` asignando de forma explícita el valor booleano `TRUE` a la columna `leida`.
  * Restringe la operación condicionando el filtro simultáneamente a la clave primaria del registro `id` y a la clave del usuario propietario `usuario_id` para evitar mutaciones no autorizadas.
* **Retorno**: El entero numérico que refleja la cantidad de filas que sufrieron modificaciones en la base de datos (`result.affectedRows`).

##### markAllRead(userId)
* **Comportamiento interno**:
  * Modifica de forma masiva el estado de los registros en la tabla `notificaciones` conmutando el campo `leida = TRUE`.
  * Acota la actualización de manera exclusiva a las filas correspondientes al `userId` provisto que encajen dentro de los patrones de tipología válidos (`comentario`, `seguimiento` o generales asociadas a posts o comentarios).
* **Retorno**: `undefined` (ninguno).

##### delete(id, userId)
* **Comportamiento interno**:
  * Invoca de manera asíncrona la sentencia destructiva `DELETE FROM notificaciones` limitando la acción a la coincidencia exacta del identificador de la notificación y el identificador del usuario propietario.
* **Retorno**: La cantidad de filas afectadas por la operación de borrado físico (`result.affectedRows`).

#### Publicaciones (post.model.js)

##### findAll({ comunidad_id, userId })
* **Comportamiento interno**:
  * Inicializa una cadena de texto vacía `where` y un arreglo plano indexado `params` para la inyección de variables.
  * Evalúa condicionalmente la presencia de la variable `userId`. Si es evaluada como verdadera, empuja de forma secuencial tres veces consecutivas el identificador del usuario al arreglo de parámetros, con el fin de saciar las incógnitas de las subconsultas inyectadas mediante funciones dinámicas (`voteSelect`, `membershipSelect`, `sharedSelect`).
  * Evalúa condicionalmente la presencia de la propiedad `comunidad_id`. Si se cumple, redefine el contenido de la variable `where` para estructurar la cláusula de filtrado `'WHERE p.comunidad_id = ?'` e incorpora dicho identificador al final del arreglo de parámetros.
  * Lanza de forma asíncrona una consulta SQL de combinación masiva uniendo las macros y constantes globales de selección (`BASE_COLUMNS`, `BASE_FROM`) junto con las llamadas dinámicas que adjuntan subconsultas correlacionadas `EXISTS` e `INNER SELECT` para determinar estados contextuales del usuario (`voto_usuario`, `es_miembro_comunidad`, `compartido_por_usuario`).
  * Ordena los registros resultantes de forma descendente priorizando la columna `fecha_creacion` de la publicación.
* **Retorno**: Una lista de objetos con las publicaciones enriquecidas con información de usuario, comunidad, assets multimedia y estados personalizados.

##### findById(id, userId = null)
* **Comportamiento interno**:
  * Configura dinámicamente el arreglo de parámetros SQL: si recibe un `userId` válido, introduce tres instancias del mismo identificador seguidas por el `id` de la publicación; en caso contrario, inicializa el arreglo exclusivamente con el `id` de la publicación.
  * Ejecuta la consulta combinando las columnas base (`BASE_COLUMNS`) y las subconsultas contextuales del usuario (`voteSelect`, `membershipSelect`, `sharedSelect`) unificando tablas mediante `LEFT JOIN` y filtrando estrictamente por la coincidencia en `p.id`.
* **Retorno**: El objeto completo de la publicación con todos sus metadatos relacionales asociados si se localiza, o `null` si no se encuentra registro alguno.

##### findRawById(id)
* **Comportamiento interno**:
  * Ejecuta una consulta de selección directa y aislada `SELECT * FROM publicaciones` buscando una coincidencia única para la clave primaria de la publicación.
* **Retorno**: El objeto de la publicación en su estado original de la tabla sin uniones externas, o `null`.

##### findByUserId(userId, viewerId = null)
* **Comportamiento interno**:
  * Estructura los parámetros de la consulta parametrizada inyectando en primera instancia el `viewerId` (si existe) para resolver la subconsulta de estado compartido (`sharedSelect`), y posteriormente el `userId` del creador del contenido.
  * Lanza una consulta SQL unificando las publicaciones con las estructuras de usuarios, comunidades y assets, filtrando estrictamente los registros donde `p.usuario_id = ?` y ordenándolos de manera descendente.
* **Retorno**: Un arreglo con todas las publicaciones creadas por el usuario específico.

##### findSharedByUserId(userId, viewerId = null)
* **Comportamiento interno**:
  * Mapea los argumentos operacionales inyectando el identificador del observador (`viewerId`) si está presente y el identificador del usuario propietario de la acción (`userId`).
  * Realiza una consulta asíncrona tomando como eje la tabla asociativa `publicaciones_compartidas` (`pc`), aplicando un `INNER JOIN` hacia `publicaciones` (`p`) y acoplando mediante `LEFT JOIN` las tablas satélites de usuarios, comunidades y assets multimedia.
  * Extrae el timestamp nativo de la tabla pivot bajo el alias `compartido_en` y filtra las filas por la condición `WHERE pc.usuario_id = ?`, organizando el histórico descendentemente por dicha fecha.
* **Retorno**: Una lista de las publicaciones que el usuario ha compartido en la plataforma.

##### create({ titulo, contenido, url_imagen, url_video, media_asset_id, comunidad_id, usuarioId })
* **Comportamiento interno**:
  * Ejecuta de forma asíncrona una instrucción SQL `INSERT INTO` en la tabla `publicaciones` mapeando ordenadamente los títulos, cuerpos y referencias.
  * Evalúa de forma lógica mediante el operador `||` la propiedad `media_asset_id`, forzando el valor a `null` si la variable resulta falsy en tiempo de ejecución.
* **Retorno**: El identificador entero autogenerado (`insertId`) de la nueva publicación creada.

##### delete(id)
* **Comportamiento interno**:
  * Lanza de manera asíncrona la instrucción atómica y destructiva `DELETE FROM publicaciones WHERE id = ?`.
* **Retorno**: `undefined` (ninguno).

##### incrementVotes(postId, delta)
* **Comportamiento interno**:
  * Modifica el estado numérico de una publicación ejecutando un `UPDATE` que adiciona de forma aritmética el valor entero recibido en el parámetro `delta` a la columna `votos`.
* **Retorno**: `undefined` (ninguno).

##### share(userId, postId)
* **Comportamiento interno**:
  * Inserta una nueva fila de relación asociativa en la tabla pivot utilizando la instrucción permisiva `INSERT IGNORE INTO publicaciones_compartidas`. Esto garantiza la consistencia e integridad del almacenamiento impidiendo duplicados o interrupciones por violaciones de clave única si el usuario ya había compartido el mismo post previamente.
* **Retorno**: `undefined` (ninguno).

##### unshare(userId, postId)
* **Comportamiento interno**:
  * Ejecuta una instrucción destructiva de borrado físico `DELETE FROM publicaciones_compartidas` filtrando rigurosamente por el identificador del usuario y el identificador de la publicación asociada.
* **Retorno**: `undefined` (ninguno).

##### recalculateVotes(postId)
* **Comportamiento interno**:
  * Ejecuta una sentencia SQL de actualización avanzada (`UPDATE`) apuntando a la tabla `publicaciones`.
  * Inyecta una subconsulta de agregación matemática que calcula en tiempo real la suma (`SUM`) de los votos de la tabla `votos_usuarios` relacionados al post. Utiliza una estructura condicional `CASE` interna que computa valores discretos ponderados: asigna un valor de `1` si el registro es de tipo `'up'`, un valor de `-1` si es de tipo `'down'` y un valor neutro de `0` para cualquier otra condición descrita.
  * Envuelve el resultado de la sumatoria total en la función `COALESCE(..., 0)` para mitigar y subsanar valores nulos indeseados en caso de que la publicación no cuente con ningún voto remanente en el histórico, aplicando los cambios únicamente para la fila que concuerde con el `postId` provisto.
* **Retorno**: `undefined` (ninguno).

#### Gestión de Usuarios (user.model.js)

##### findByEmailOrUsername(email, username)
* **Comportamiento interno**:
  * Ejecuta una consulta asíncrona de selección `SELECT id` sobre la tabla `users`.
  * Evalúa de forma condicional mediante una cláusula `OR` si existen coincidencias con el correo electrónico o con el nombre de usuario provistos en los argumentos.
* **Retorno**: Un arreglo con los registros que cumplan la condición (habitualmente conteniendo los identificadores encontrados).

##### isAdmin(userId)
* **Comportamiento interno**:
  * Realiza una consulta asíncrona a la tabla `users` para recuperar únicamente el valor de la columna de privilegios `is_admin` correspondiente al identificador provisto.
  * Evalúa lógicamente mediante una expresión relacional si la longitud del arreglo devuelto es mayor a cero y si el valor estricto de la primera fila (`rows[0].is_admin`) es igual a `1`.
* **Retorno**: Un valor booleano (`true` / `false`) que determina si el usuario posee privilegios de administrador.

##### findByEmail(email)
* **Comportamiento interno**:
  * Lanza una consulta parametrizada `SELECT *` sobre la tabla `users` aplicando un filtro de igualdad estricto para la columna `email`.
* **Retorno**: El objeto completo del usuario si existe en la base de datos, o `null` si la consulta no devuelve registros.

##### findByUsername(username)
* **Comportamiento interno**:
  * Ejecuta una consulta asíncrona de selección para extraer un conjunto delimitado de columnas (`id`, `email`, `username`, `avatar_url`, `bio`, `is_admin`, `fecha_creacion`) de la tabla `users` filtrando por el nombre de usuario.
* **Retorno**: El objeto filtrado del usuario si se localiza en el almacén, o `null` en caso contrario.

##### findById(id)
* **Comportamiento interno**:
  * Realiza una consulta estructurada a la tabla `users` solicitando las columnas de perfil principales de identidad y filtrando el registro por su clave primaria `id`.
* **Retorno**: El objeto correspondiente al perfil básico del usuario si existe, o `null` si no hay coincidencias.

##### search(query, currentUserId)
* **Comportamiento interno**:
  * Inicializa una variable de búsqueda `term` concatenando comodines porcentuales (`%`) antes y después de la cadena de texto recibida para habilitar búsquedas parciales.
  * Ejecuta una consulta de selección sobre la tabla `users` evaluando mediante la cláusula `LIKE` si el término coincide de forma parcial con las columnas `username` o `bio`.
  * Excluye del conjunto de resultados al usuario solicitante mediante la condición de desigualdad estricta `id <> ?`.
* **Retorno**: Un arreglo de objetos con los usuarios que encajen con los criterios de búsqueda provistos.

##### countsByUserId(userId)
* **Comportamiento interno**:
  * Lanza de forma asíncrona tres consultas de agregación en paralelo utilizando la función estándar `COUNT(*)` sobre distintas tablas del esquema:
    * Cuenta las filas en la tabla `publicaciones` donde el creador coincide con el `userId`.
    * Cuenta las filas en la tabla `usuarios_seguidos` donde la columna `seguido_id` coincide con el `userId` (para obtener la cantidad de seguidores).
    * Cuenta las filas en la tabla `usuarios_seguidos` donde la columna `seguidor_id` coincide con el `userId` (para obtener la cantidad de cuentas seguidas).
* **Retorno**: Un objeto literal compuesto con las propiedades calculadas `posts`, `followers` y `following`.

##### followersByUserId(userId)
* **Comportamiento interno**:
  * Realiza una consulta relacional aplicando una operación `INNER JOIN` entre las tablas `users` y `usuarios_seguidos`.
  * Acopla las tablas equiparando el identificador del usuario con la clave foránea `seguidor_id` y filtra los registros bajo la condición `seguido_id = ?`.
  * Organiza las filas de forma descendente por la columna `fecha_creacion` de la relación y acota el rendimiento a un umbral máximo de 20 registros (`LIMIT 20`).
* **Retorno**: Una lista con los perfiles simplificados de los seguidores pertenecientes al usuario.

##### followingByUserId(userId)
* **Comportamiento interno**:
  * Ejecuta una consulta asíncrona combinando las tablas `users` y `usuarios_seguidos` mediante un `INNER JOIN`.
  * Empareja las estructuras asociando el identificador del usuario a la columna `seguido_id` y condiciona el criterio de selección a las filas donde `seguidor_id = ?`.
  * Aplica un criterio de ordenación cronológica decreciente y restringe el volumen a un máximo de 20 filas.
* **Retorno**: Una lista con los perfiles simplificados de las cuentas a las que sigue el usuario actualmente.

##### isFollowing(followerId, followedId)
* **Comportamiento interno**:
  * Evalúa de forma condicional mediante una compuerta lógica si alguno de los dos identificadores requeridos está ausente (`!followerId || !followedId`); si se cumple, interrumpe el flujo inmediatamente.
  * Lanza una consulta de verificación rápida sobre la tabla pivot `usuarios_seguidos` aplicando un filtro simultáneo para el seguidor y el seguido junto con una restricción `LIMIT 1`.
* **Retorno**: Un valor booleano (`true` / `false`) que determina si la longitud de la colección resultante es mayor a cero.

##### follow(followerId, followedId)
* **Comportamiento interno**:
  * Ejecuta una instrucción asíncrona de inserción utilizando la sentencia permisiva `INSERT IGNORE INTO usuarios_seguidos`. Esto previene interrupciones en el flujo o duplicidades si la relación de seguimiento ya se encontraba registrada en la base de datos.
* **Retorno**: El número entero que refleja la cantidad de filas que sufrieron alteraciones tras la consulta (`result.affectedRows`).

##### unfollow(followerId, followedId)
* **Comportamiento interno**:
  * Invoca una sentencia destructiva parametrizada `DELETE FROM usuarios_seguidos` acotando la remoción física de la fila a la coincidencia exacta de los campos `seguidor_id` y `seguido_id`.
* **Retorno**: `undefined` (ninguno).

##### usernameExists(username)
* **Comportamiento interno**:
  * Realiza una consulta optimizada `SELECT 1` sobre la tabla `users` condicionando la búsqueda a la igualdad en la columna de texto `username` incorporando un límite estricto `LIMIT 1`.
* **Retorno**: Un valor booleano derivado de verificar si la colección de filas retornada contiene al menos un elemento.

##### updateProfile(userId, { avatar_url, bio, username })
* **Comportamiento interno**:
  * Ejecuta una instrucción de modificación (`UPDATE`) sobre la tabla `users` reemplazando los valores de las columnas `avatar_url`, `bio` y `username`.
  * Restringe el impacto de la mutación aplicando una cláusula de salvaguarda filtrando por la clave primaria `id = ?`.
  * Reconsulta asíncronamente las columnas del registro modificado invocando internamente al método `this.findById(userId)`.
* **Retorno**: El objeto actualizado con las nuevas propiedades del usuario, o `null` si la operación no alteró ninguna fila.

#### Gestión de Votos (vote.model.js)

##### find(userId, postId)
* **Comportamiento interno**:
  * Ejecuta una consulta asíncrona de selección `SELECT *` sobre la tabla pivot `votos_usuarios`.
  * Filtra el registro aplicando una coincidencia simultánea para las columnas foráneas de control `usuario_id` y `publicacion_id`.
* **Retorno**: El objeto del voto correspondiente si ya existe una interacción previa registrada, o `null` en caso contrario.

##### create(userId, postId, tipo_voto)
* **Comportamiento interno**:
  * Realiza una instrucción SQL de inserción parametrizada para persistir un nuevo registro dentro de la tabla `votos_usuarios` mapeando el usuario, el post y la dirección cualitativa de la valoración (`tipo_voto`).
* **Retorno**: `undefined` (ninguno).

##### update(userId, postId, tipo_voto)
* **Comportamiento interno**:
  * Lanza una sentencia de modificación (`UPDATE`) sobre la tabla `votos_usuarios` asignando el nuevo estado recibido en el parámetro al campo `tipo_voto`.
  * Delimita el rango de la actualización aplicando condiciones de igualdad estricta cruzando el `usuario_id` y el `publicacion_id`.
* **Retorno**: `undefined` (ninguno).

##### delete(userId, postId)
* **Comportamiento interno**:
  * Invoca de forma asíncrona la sentencia destructiva `DELETE FROM votos_usuarios` removiendo físicamente el registro donde coincidan las claves foráneas de usuario y publicación suministradas.
* **Retorno**: `undefined` (ninguno).

## Enrutamiento (Routes)

Las rutas mapean los endpoints HTTP expuestos hacia el cliente, aplicando middlewares de seguridad o sesión y derivando la ejecución a los controladores.
---

### Detalle de los Módulos

#### Autenticación (auth.js)

##### POST /register
* **Comportamiento interno**: Registra el método `POST` en `/register` bajo el middleware de tasa `authRateLimit` y envuelve a `authController.register` en `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /login
* **Comportamiento interno**: Registra el método `POST` en `/login` bajo el middleware de tasa `authRateLimit` y envuelve a `authController.login` en `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /check-username
* **Comportamiento interno**: Registra el método `GET` en `/check-username` sin restricciones perimetrales y envuelve a `authController.checkUsername` en `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Mensajería y Chats (chat.js)

##### Middlewares Globales
* **Comportamiento interno**: Aplica `router.use(authMiddleware)`, forzando la validación de sesión tokenizada para todas las subrutas del archivo.

##### GET /usuarios
* **Comportamiento interno**: Mapea `GET` en `/usuarios` delegando en `chatController.searchUsers` a través de `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /
* **Comportamiento interno**: Mapea `GET` en `/` delegando en `chatController.list` a través de `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /
* **Comportamiento interno**: Mapea `POST` en `/` delegando en `chatController.create` a través de `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /:chatId/mensajes
* **Comportamiento interno**: Mapea `GET` en la ruta dinámica `/:chatId/mensajes` delegando en `chatController.messages` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /:chatId/mensajes
* **Comportamiento interno**: Mapea `POST` en la ruta dinámica `/:chatId/mensajes` delegando en `chatController.send` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Comentarios (comentarios.js)

##### GET /
* **Comportamiento interno**: Mapea `GET` en `/` de acceso público, delegando la consulta en `comentariosController.getByPublicacion` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /
* **Comportamiento interno**: Mapea `POST` en `/` protegido bajo `authMiddleware`, derivando el flujo a `comentariosController.create` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### DELETE /:id
* **Comportamiento interno**: Mapea `DELETE` en `/:id` protegido bajo `authMiddleware`, derivando la baja a `comentariosController.remove` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Comunidades (comunidades.js)

##### GET /
* **Comportamiento interno**: Mapea `GET` en `/` de acceso público para obtener el listado, delegando en `comunidadesController.getAll` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /:id
* **Comportamiento interno**: Mapea `GET` en la ruta dinámica `/:id` de acceso público, delegando en `comunidadesController.getById` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /
* **Comportamiento interno**: Mapea `POST` en `/` protegido bajo `authMiddleware`, derivando la creación a `comunidadesController.create` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /:id/unirse
* **Comportamiento interno**: Mapea `POST` en `/:id/unirse` protegido bajo `authMiddleware`, derivando la acción a `comunidadesController.join` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### DELETE /:id/abandonar
* **Comportamiento interno**: Mapea `DELETE` en `/:id/abandonar` protegido bajo `authMiddleware`, derivando la acción a `comunidadesController.leave` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Recursos Multimedia (media.js)

##### Middlewares Globales
* **Comportamiento interno**: Aplica `router.use(authMiddleware)`, forzando la validación de sesión tokenizada para todas las subrutas del archivo.

##### POST /signature
* **Comportamiento interno**: Mapea `POST` en `/signature` delegando la generación de firmas de subida en `mediaController.signature` a través de `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /commit
* **Comportamiento interno**: Mapea `POST` en `/commit` delegando la confirmación del asset en `mediaController.commit` a través de `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Notificaciones (notificaciones.js)

##### GET /
* **Comportamiento interno**: Mapea `GET` en `/` protegido bajo `authMiddleware`, derivando la consulta a `notificacionesController.getAll` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /no-leidas
* **Comportamiento interno**: Mapea `GET` en `/no-leidas` protegido bajo `authMiddleware`, derivando el conteo a `notificacionesController.countUnread` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### PATCH /leer-todas
* **Comportamiento interno**: Mapea `PATCH` en `/leer-todas` protegido bajo `authMiddleware`, derivando la actualización masiva a `notificacionesController.markAllRead` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### PATCH /:id/leer
* **Comportamiento interno**: Mapea `PATCH` en `/:id/leer` protegido bajo `authMiddleware`, derivando la actualización a `notificacionesController.markAsRead` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### DELETE /:id
* **Comportamiento interno**: Mapea `DELETE` en `/:id` protegido bajo `authMiddleware`, derivando la eliminación física a `notificacionesController.remove` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Publicaciones (publicaciones.js)

##### GET /
* **Comportamiento interno**: Mapea `GET` en `/` de acceso público para obtener el feed completo de publicaciones, delegando en `publicacionesController.getAll` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /:id
* **Comportamiento interno**: Mapea `GET` en la ruta dinámica `/:id` para ver el detalle de un post específico, delegando en `publicacionesController.getById` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /
* **Comportamiento interno**: Mapea `POST` en `/` protegido bajo el middleware `authMiddleware`, derivando la creación del post a `publicacionesController.create` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### DELETE /:id
* **Comportamiento interno**: Mapea `DELETE` en la ruta dinámica `/:id` protegido bajo `authMiddleware`, derivando el borrado a `publicacionesController.remove` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### POST /:id/votar
* **Comportamiento interno**: Mapea `POST` en `/:id/votar` protegido bajo `authMiddleware`, delegando la gestión de upvotes/downvotes a `publicacionesController.vote` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

#### Usuarios (usuarios.js)

##### GET /me
* **Comportamiento interno**: Mapea `GET` en `/me` protegido bajo `authMiddleware` para obtener los datos del usuario autenticado, delegando en `usuariosController.me` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### GET /isAdmin
* **Comportamiento interno**: Mapea `GET` en `/isAdmin` protegido bajo `authMiddleware` para verificar los privilegios de administración, delegando en `usuariosController.isAdmin` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### PATCH /perfil
* **Comportamiento interno**: Mapea `PATCH` en `/perfil` protegido bajo `authMiddleware` para modificaciones parciales del perfil, delegando en `usuariosController.updatePerfil` mediante `asyncHandler`.
* **Retorno**: Respuesta HTTP gestionada por el controlador.

##### Endpoints de Perfil Autenticado (Contexto Observador)
* **Comportamiento interno**: Mapea rutas dinámicas protegidas bajo `authMiddleware` que delegan en el controlador mediante `asyncHandler` para obtener o modificar información filtrada por un `username` interactuando con la sesión activa:
  * `GET /perfil/:username` $\rightarrow$ `usuariosController.getProfile`
  * `GET /perfil/:username/publicaciones` $\rightarrow$ `usuariosController.getPublicaciones`
  * `GET /perfil/:username/comentarios` $\rightarrow$ `usuariosController.getComentarios`
  * `GET /perfil/:username/compartidos` $\rightarrow$ `usuariosController.getCompartidos`
* **Retorno**: Respuestas HTTP gestionadas por sus respectivos métodos en el controlador.

##### Interacciones Sociales Compartidas e Historial
* **Comportamiento interno**: Mapea endpoints protegidos bajo `authMiddleware` para gestionar flujos relacionales de compartidos y seguimientos entre cuentas mediante `asyncHandler`:
  * `POST /compartidos/:postId` $\rightarrow$ `usuariosController.sharePost`
  * `DELETE /compartidos/:postId` $\rightarrow$ `usuariosController.unsharePost`
  * `POST /:username/follow` $\rightarrow$ `usuariosController.follow`
  * `DELETE /:username/follow` $\rightarrow$ `usuariosController.unfollow`
* **Retorno**: Respuestas HTTP gestionadas por sus respectivos métodos en el controlador.

##### Endpoints de Perfil Público (Sin Sesión)
* **Comportamiento interno**: Mapea accesos de lectura pública indexados por `username` sin restricciones de token/sesión, delegando la ejecución mediante `asyncHandler`:
  * `GET /:username` $\rightarrow$ `usuariosController.getByUsername`
  * `GET /:username/publicaciones` $\rightarrow$ `usuariosController.getPublicaciones`
  * `GET /:username/comunidades` $\rightarrow$ `usuariosController.getComunidades`
* **Retorno**: Respuestas HTTP gestionadas por el controlador.