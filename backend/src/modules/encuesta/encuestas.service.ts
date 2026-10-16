import { supabase } from '../../config/supabase';

export const guardarEncuestaService = async (datosDesdeFront: any) => {
    // 1. Verificar que no haya hecho una encuesta previamente
    const { data: encuestaPrevia, error: errorBusqueda } = await supabase
        .from('surveys')
        .select('id')
        .eq('order_id', datosDesdeFront.order_id)
        .maybeSingle();
    
    if (errorBusqueda) {
        throw new Error(`Error verificando encuestas previas: ${errorBusqueda.message}`);
    }

    // Si encuentra un registro, rebota la petición
    if (encuestaPrevia) {
        throw new Error('Solo podés completar una encuesta por estadía.');
    }

    // 2. Mapeamos los datos del Front a los nombres exactos de la tabla
    const payloadInsert = {
        order_id: datosDesdeFront.order_id,
        user_id: datosDesdeFront.user_id, 
        user_role: 'client',              // La tabla exige 'client' o 'employee'
        rating_food: datosDesdeFront.calidad,
        rating_service: datosDesdeFront.amabilidad,
        rating_cleanliness: datosDesdeFront.limpieza,
        feedback_text: datosDesdeFront.comentario,
        
        // AGREGADOS:
        // Si el front manda fotos (Array de strings con URLs o base64), las guardamos
        photos: datosDesdeFront.fotos || null,
        
        // Si el front manda las dietas/requerimientos, los guardamos en la nueva columna
        exclusive_requirements: datosDesdeFront.requerimientos || null 
    };

    // 3. Guardamos la encuesta en la base de datos
    const { data: nuevaEncuesta, error: insertError } = await supabase
        .from('surveys')
        .insert([payloadInsert])
        .select()
        .single();

    if (insertError) {
        throw new Error(`Error al guardar la encuesta: ${insertError.message}`);
    }

    return nuevaEncuesta;
};

export const obtenerEstadisticasService = async () => {
    // 1. Traemos todas las encuestas
    const { data: encuestas, error } = await supabase
        .from('surveys')
        .select('*');

    if (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    // --- INICIALIZACIÓN DE VARIABLES ---
    
    // Para el gráfico de Torta
    const calidadComida = { excelentes: 0, regulares: 0, malas: 0 }; 
    
    // Para el gráfico de Barras (Promedios)
    let sumaServicio = 0;
    let sumaLimpieza = 0;

    // Para el gráfico Lineal (Array de 10 ceros explícitos para que TypeScript no se queje)
    const distribucionLimpieza: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Para el listado de Requerimientos Excluyentes (Diccionario clave-valor)
    const contadorRequerimientos: Record<string, number> = {};

    // --- PROCESAMIENTO ---
    
    encuestas.forEach((enc: any) => {
        // 1. Torta (Calidad de Comida)
        const notaComida = enc.rating_food || 0;
        if (notaComida >= 8) {
            calidadComida.excelentes++;
        } else if (notaComida >= 5) {
            calidadComida.regulares++;
        } else if (notaComida > 0) { 
            calidadComida.malas++;
        }

        // 2. Barras (Sumatoria para promedios)
        const notaServicio = enc.rating_service || 0;
        const notaLimpieza = enc.rating_cleanliness || 0;
        sumaServicio += notaServicio;
        sumaLimpieza += notaLimpieza;

        // 3. Lineal (Distribución de notas de limpieza)
        if (notaLimpieza >= 1 && notaLimpieza <= 10) {
            const index = notaLimpieza - 1;
            // Forma segura para TypeScript: lee el valor o asume 0, y le suma 1
            distribucionLimpieza[index] = (distribucionLimpieza[index] || 0) + 1;
        }

        // 4. Listado de Requerimientos Excluyentes
        if (enc.exclusive_requirements && Array.isArray(enc.exclusive_requirements)) {
            enc.exclusive_requirements.forEach((req: string) => {
                contadorRequerimientos[req] = (contadorRequerimientos[req] || 0) + 1;
            });
        }
    });

    // --- CÁLCULO FINAL Y RETORNO ---
    
    const total = encuestas.length || 1; // Evita división por cero si no hay encuestas

    // Convercion de diccionario de requerimientos a un array ordenado 
    const listadoRequerimientos = Object.entries(contadorRequerimientos)
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

    return {
        total_encuestas: encuestas.length,
        grafico_torta_calidad: calidadComida,
        grafico_barras_promedios: {
            servicio: parseFloat((sumaServicio / total).toFixed(2)),
            limpieza: parseFloat((sumaLimpieza / total).toFixed(2))
        },
        grafico_lineal_limpieza: distribucionLimpieza,
        requerimientos_excluyentes: listadoRequerimientos
    };
};