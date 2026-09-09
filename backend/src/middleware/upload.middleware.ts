import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
    // Imprime en consola para ver exactamente qué mimetype está mandando Postman
    console.log('Archivo recibido por Multer:', file);

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/octet-stream'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

    const isValidMime = allowedMimeTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(ext);

    if (isValidMime || isValidExt) {
        cb(null, true);
    } else {
        cb(new Error('El archivo debe ser una imagen válida (.jpg, .png, .webp)'), false);
    }
};

export const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});