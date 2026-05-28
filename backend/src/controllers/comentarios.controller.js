import { comentariosService } from '../services/comentarios.service.js';
import { idParamDto } from '../dtos/common.dto.js';
import { createComentarioDto, listComentariosDto } from '../dtos/comentarios.dto.js';

export const comentariosController = {

  async getAll(req, res) {
    const data = await comentariosService.getAll();
    res.json(data);
  },

  async getByPublicacion(req, res) {
    const { publicacion_id } = listComentariosDto(req.query);
    if (!publicacion_id) {
      getAll(req, res);
      return;
    }
    else {
      const data = await comentariosService.getByPublicacion(publicacion_id);
      res.json(data);
    }
  },

  async create(req, res) {
    const data = await comentariosService.create({
      ...createComentarioDto(req.body),
      userId: req.user.id,
      username: req.user.username,
    });
    res.status(201).json(data);
  },

  async remove(req, res) {
    const { id } = idParamDto(req.params);
    await comentariosService.remove(id, req.user.id);
    res.json({ mensaje: 'Comentario eliminado' });
  },
};
