import { supabase } from '../../config/supabase';

export const guardarEncuestaService = async (datosEncuesta: any) => {
    // Primero se verificar que ya haya hecho una encuesta
    const { data: encuestaPrevia, error: errorBusqueda } = await supabase
        .from('surveys')
        .select('id')
        .eq('order_id', datosEncuesta.order_id)
        .single();

    // Si encuentra un registro, rebota la petición
    if (encuestaPrevia) {
        throw new Error('Solo podés completar una encuesta por estadía.');
    }

    // Si no existe, la guardamos
    const { data: nuevaEncuesta, error: insertError } = await supabase
        .from('surveys')
        .insert([datosEncuesta])
        .select()
        .single();

    if (insertError) {
        throw new Error(`Error al guardar la encuesta: ${insertError.message}`);
    }

    return nuevaEncuesta;
};

export const obtenerEstadisticasService = async () => {
    // Traemos todas las encuestas para armar los gráficos
    const { data: encuestas, error } = await supabase
        .from('surveys')
        .select('*');

    if (error) {
        throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }

    // Procesa la data para dejársela "en bandeja" a los chicos del front
    const calidadComida = { excelentes: 0, regulares: 0, malas: 0 };    // Count de las notas de la calidad de las comidas
    // Promedio de amabilidad
    let sumaAmabilidad = 0;

    encuestas.forEach((enc: any) => {
        if (enc.calidad >= 4) calidadComida.excelentes++;
        else if (enc.calidad === 3) calidadComida.regulares++;
        else calidadComida.malas++;

        sumaAmabilidad += enc.amabilidad || 0;
    });

    const total = encuestas.length || 1;

    return {
        total_encuestas: encuestas.length,
        grafico_torta_calidad: calidadComida,
        grafico_barras_amabilidad: sumaAmabilidad / total // Promedio
    };
};