import { supabase } from '../config/supabase';

export const subirImagenSupabase = async (file: Express.Multer.File, bucket: string = 'fotos_usuarios') => {
    // Generamos un nombre unico para que no se pisen archivos con el mismo nombre
    const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) throw new Error(`Error al subir la imagen al bucket: ${error.message}`);

    // Obtiene la URL publica de la imagen recien subida
    const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
};