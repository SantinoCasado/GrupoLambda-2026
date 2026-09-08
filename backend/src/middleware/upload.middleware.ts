import multer from 'multer';

// Usamos almacenamiento en memoria para pasarlo directo a Supabase sin tocar el disco duro
const storage = multer.memoryStorage();

// Filtro opcional para aceptar solo imágenes
const fileFilter = (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo debe ser una imagen'), false);
    }
};

export const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por ejemplo
    fileFilter
});