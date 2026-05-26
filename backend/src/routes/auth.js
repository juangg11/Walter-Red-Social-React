import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/security.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 * post:
 * summary: Registrar un nuevo usuario
 * description: Crea una cuenta de usuario en la red social Walter.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - username
 * - email
 * - password
 * properties:
 * username:
 * type: string
 * example: walter_user
 * email:
 * type: string
 * example: walter@correo.com
 * password:
 * type: string
 * example: contraseñaSegura123
 * responses:
 * 201:
 * description: Usuario registrado con éxito.
 * 400:
 * description: El email o el usuario ya existen, o los datos son inválidos.
 */
router.post('/register', authRateLimit, asyncHandler(authController.register));

/**
 * @openapi
 * /auth/login:
 * post:
 * summary: Iniciar sesión
 * description: Autentica al usuario y devuelve un token JWT.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - email
 * - password
 * properties:
 * email:
 * type: string
 * example: walter@correo.com
 * password:
 * type: string
 * example: contraseñaSegura123
 * responses:
 * 200:
 * description: Autenticación correcta. Devuelve el token y datos del usuario.
 * 401:
 * description: Credenciales incorrectas.
 */
router.post('/login', authRateLimit, asyncHandler(authController.login));

/**
 * @openapi
 * /auth/check-username:
 * get:
 * summary: Verificar disponibilidad de un username
 * description: Comprueba si un nombre de usuario ya está registrado en el sistema.
 * parameters:
 * - in: query
 * name: username
 * required: true
 * schema:
 * type: string
 * description: El nombre de usuario a comprobar
 * example: walter_user
 * responses:
 * 200:
 * description: Devuelve si el usuario está disponible o no.
 */
router.get('/check-username', asyncHandler(authController.checkUsername));

export default router;