import { supabase } from '../../config/supabase';

export const guardarEncuestaService = async (datosDesdeFront: any) => {
    // Primero se verificar que ya haya hecho una encuesta
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

    // 2. Mapeamos los datos del Front a los nombres exactos de tu tabla
    const payloadInsert = {
        order_id: datosDesdeFront.order_id,
        user_id: datosDesdeFront.user_id, 
        user_role: 'client',              // La tabla exige 'client' o 'employee'
        rating_food: datosDesdeFront.calidad,
        rating_service: datosDesdeFront.amabilidad,
        rating_cleanliness: datosDesdeFront.limpieza,
        feedback_text: datosDesdeFront.comentario
        // photos: si en el futuro mandan fotos
    };

    // Si no existe, la guardamos
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
    // Trae todas las encuestas
    const { data: encuestas, error } = await supabase
        .from('surveys')
        .select('*');

    if (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    // contadores para los graficos
    const calidadComida = { excelentes: 0, regulares: 0, malas: 0 }; 
    let sumaServicio = 0;
    let sumaLimpieza = 0;

    // Procesacion de cada encuesta, escala del 1 al 10
    encuestas.forEach((enc: any) => {
        // Logica para el gráfico de torta (Comida)
        const notaComida = enc.rating_food || 0;
        if (notaComida >= 8) {
            calidadComida.excelentes++;
        } else if (notaComida >= 5) {
            calidadComida.regulares++;
        } else if (notaComida > 0) { // Mayor a 0 para no contar los nulos como malos
            calidadComida.malas++;
        }

        // Suma para los gráficos de barras (Servicio y Limpieza)
        sumaServicio += enc.rating_service || 0;
        sumaLimpieza += enc.rating_cleanliness || 0;
    });

    const total = encuestas.length || 1; // || 1, evita que divida por cero si no hay encuestas

    // Devolicion de la data
    return {
        total_encuestas: encuestas.length,
        grafico_torta_calidad: calidadComida,
        grafico_barras_promedios: {
            servicio: parseFloat((sumaServicio / total).toFixed(2)),
            limpieza: parseFloat((sumaLimpieza / total).toFixed(2))
        }
    };
};