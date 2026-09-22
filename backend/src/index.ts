import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase';
import empleadosRoutes from './modules/empleados/empleados.routes';
import clientesRoutes from './modules/cliente/cliente.routes';
import authRoutes from './modules/auth/auth.routes';
import productosRoutes from './modules/productos/productos.routes';
import pedidosRoutes from './modules/pedidos/pedidos.routes';
import chatRoutes from './modules/chat/chat.routes';
import mesasRoutes from './modules/mesas/mesas.routes';
import juegosRoutes from './modules/juegos/juegos.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 1. Configuración de CORS adaptada para Apps Móviles (Expo) y Desarrollo
const corsOptions = {
    // Permitimos cualquier origen temporalmente para que Expo no tenga bloqueos
    origin: '*', 
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json()); // Equivalente ligero al ValidationPipe para parsear JSON
app.use('/api/empleados', empleadosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/juegos', juegosRoutes);

// Ruta base
app.get('/', (req: Request, res: Response) => {
    res.json({ mensaje: 'API del Restaurante Operativa' });
});

// Ruta de conexión a Base de Datos
app.get('/api/ping-db', async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('auth.users').select('*').limit(1);
        if (error) throw error;
        res.json({ mensaje: 'Conexión a Supabase exitosa', status: 'OK' });
    } catch (error: any) {
        res.status(500).json({ error: 'Fallo al conectar con la DB', detalle: error.message });
    }
});

// Inicialización tradicional (no serverless)
app.listen(port, () => {
    console.log(`[Servidor]: Corriendo en http://localhost:${port}`);
});