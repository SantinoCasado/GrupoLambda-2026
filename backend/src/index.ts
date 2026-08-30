import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Permite a Express leer el body en formato JSON

// Ruta de prueba básica
app.get('/', (req: Request, res: Response) => {
    res.json({ mensaje: 'Base del programa incializado' });
});

// Ruta de prueba para verificar que Supabase está conectado
app.get('/api/ping-db', async (req: Request, res: Response) => {
    try {
        // Hace una consulta genérica para ver si responde. 
        // Rocío, debes tener al menos una tabla creada, o devolvera un arreglo vacio.
        const { data, error } = await supabase.from('auth.users').select('*').limit(1);
        
        if (error) throw error;
        
        res.json({ mensaje: 'Conexión a Supabase exitosa', status: 'OK' });
    } catch (error: any) {
        res.status(500).json({ error: 'Fallo al conectar con la DB', detalle: error.message });
    }
});

app.listen(port, () => {
    console.log(`[Servidor]: Corriendo en http://localhost:${port}`);
});