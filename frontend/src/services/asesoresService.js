import { adminService } from './adminService';

// Cache por día para evitar peticiones repetidas
const eventCache = new Map();

// Configuración de fechas del evento
const EVENT_DATES = ['2025-09-02', '2025-09-03', '2025-09-04'];
const DATE_NAMES = ['Día 1 - Martes', 'Día 2 - Miércoles', 'Día 3 - Jueves'];

export const asesoresService = {
  // Obtener eventos de un día específico con cache
  getEventosByDay: async (fecha) => {
    try {
      // Verificar cache primero
      if (eventCache.has(fecha)) {
        console.log(`📋 Cache hit para fecha: ${fecha}`);
        return eventCache.get(fecha);
      }

      console.log(`📋 Cache miss para fecha: ${fecha}, cargando datos...`);
      
      // Cargar todos los eventos (una sola vez)
      const allEventos = await adminService.getEventos();
      
      // Procesar y cachear cada día
      EVENT_DATES.forEach(date => {
        const eventosDelDia = allEventos[date] || [];
        eventCache.set(date, eventosDelDia);
      });

      return eventCache.get(fecha) || [];
    } catch (error) {
      console.error('Error cargando eventos para asesores:', error);
      throw error;
    }
  },

  // Obtener todos los eventos (para estadísticas)
  getAllEventos: async () => {
    try {
      const allEventos = await adminService.getEventos();
      
      // Actualizar cache
      EVENT_DATES.forEach(date => {
        const eventosDelDia = allEventos[date] || [];
        eventCache.set(date, eventosDelDia);
      });

      return allEventos;
    } catch (error) {
      console.error('Error cargando todos los eventos:', error);
      throw error;
    }
  },

  // Calcular estadísticas por día
  getStatsByDay: (eventos) => {
    if (!eventos || eventos.length === 0) {
      return {
        totalEventos: 0,
        totalCupos: 0,
        cuposOcupados: 0,
        cuposDisponibles: 0,
        ocupacionPorcentaje: 0,
        eventosActivos: 0,
        eventosInactivos: 0
      };
    }

    const stats = eventos.reduce((acc, evento) => {
      acc.totalEventos++;
      acc.totalCupos += evento.slots_disponibles;
      acc.cuposOcupados += evento.slots_ocupados;
      acc.cuposDisponibles += (evento.slots_disponibles - evento.slots_ocupados);
      
      if (evento.disponible) {
        acc.eventosActivos++;
      } else {
        acc.eventosInactivos++;
      }
      
      return acc;
    }, {
      totalEventos: 0,
      totalCupos: 0,
      cuposOcupados: 0,
      cuposDisponibles: 0,
      eventosActivos: 0,
      eventosInactivos: 0
    });

    stats.ocupacionPorcentaje = stats.totalCupos > 0 
      ? Math.round((stats.cuposOcupados / stats.totalCupos) * 100) 
      : 0;

    return stats;
  },

  // Obtener configuración de fechas
  getEventDates: () => EVENT_DATES,
  getDateNames: () => DATE_NAMES,

  // Limpiar cache (útil para forzar recarga)
  clearCache: () => {
    eventCache.clear();
    console.log('🗑️ Cache de asesores limpiado');
  },

  // Verificar si hay datos en cache
  hasCachedData: (fecha) => eventCache.has(fecha),

  // Obtener datos del cache sin hacer petición
  getCachedData: (fecha) => eventCache.get(fecha) || []
}; 