export interface FiltrosDelivery {
  status?: string | string[] | undefined; // Puede ser 'pending', 'ready', o un array ['ready', 'on_the_way']
  repartidorId?: string | undefined; // ID del repartidor para filtrar pedidos asignados a él o sin asignar
}