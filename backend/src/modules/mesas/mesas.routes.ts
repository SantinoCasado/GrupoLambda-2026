import { Router } from 'express';
import { verificarAutenticacion } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { crearMesa, actualizarEstadoMesa, obtenerMesas } from './mesas.controller';
import express from 'express';

const router = Router();

// Endpoint POST para crear
router.post(
    '/', 
    verificarAutenticacion, 
    upload.single('foto'), // Un solo archivo con el key 'foto'
    crearMesa
);

// Endpoint PATCH para cambiar el estado (Libre / Ocupada)
router.patch('/:id/estado', verificarAutenticacion, actualizarEstadoMesa);

// Endpoint GET para listar todas las mesas
router.get('/', verificarAutenticacion, obtenerMesas);

export default router;