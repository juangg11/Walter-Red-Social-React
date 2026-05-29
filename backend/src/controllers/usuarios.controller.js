import { usuariosService } from '../services/usuarios.service.js';
import { updatePerfilDto, usernameParamDto } from '../dtos/usuarios.dto.js';
import { requiredId } from '../validators/schema.js';

export const usuariosController = {
  async me(req, res) {
    const data = await usuariosService.getProfile(req.user.username, req.user.id);
    res.json(data);
  },

  async isAdmin(req, res) {
    const isAdmin = await usuariosService.isAdmin(req.user.id);
    res.json({ isAdmin });
  },

  async getProfile(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.getProfile(username, req.user?.id || null);
    res.json(data);
  },

  async getByUsername(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.getByUsername(username);
    res.json(data);
  },

  async getPublicaciones(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.getPublicaciones(username, req.user?.id || null);
    res.json(data);
  },

  async getComentarios(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.getComentarios(username);
    res.json(data);
  },

  async getCompartidos(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.getCompartidos(username, req.user?.id || null);
    res.json(data);
  },

  async getComunidades(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.getComunidades(username);
    res.json(data);
  },

  async updatePerfil(req, res) {
    const data = await usuariosService.updatePerfil(req.user.id, updatePerfilDto(req.body));
    res.json(data);
  },

  async follow(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.follow(username, req.user.id);
    res.status(201).json(data);
  },

  async unfollow(req, res) {
    const { username } = usernameParamDto(req.params);
    const data = await usuariosService.unfollow(username, req.user.id);
    res.json(data);
  },

  async sharePost(req, res) {
    const postId = requiredId(req.params.postId, 'postId');
    const data = await usuariosService.sharePost(postId, req.user.id);
    res.status(201).json(data);
  },

  async unsharePost(req, res) {
    const postId = requiredId(req.params.postId, 'postId');
    const data = await usuariosService.unsharePost(postId, req.user.id);
    res.json(data);
  },
};