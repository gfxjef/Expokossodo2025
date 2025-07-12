import axios from 'axios';
import API_CONFIG from '../config/api.config';

// Configuración base de la API Visualización
let API_BASE_URL = API_CONFIG.getApiUrl();

// Validación adicional para asegurar que siempre tengamos /api
if (!API_BASE_URL.includes('/api')) {
  console.warn('⚠️ La URL base no incluye /api, agregándolo...');
  API_BASE_URL = API_BASE_URL + '/api';
}

console.log('📊 Visualización Service - URL base final:', API_BASE_URL);

// Cache simple para optimización
const cache = {
  registros: null,
  eventos: null,
  stats: null,
  lastFetch: {
    registros: null,
    eventos: null,
    stats: null
  }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const visualizacionApi = axios.create({
  baseURL: API_BASE_URL,
  headers: API_CONFIG.getDefaultHeaders(),
  timeout: 15000, // 15 segundos
});

// Interceptor para manejar errores globalmente
visualizacionApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Visualización API Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tiempo de espera agotado. Por favor, intenta de nuevo.');
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data.error || 'Datos inválidos');
        case 404:
          throw new Error('Datos no encontrados');
        case 500:
          throw new Error('Error interno del servidor');
        default:
          throw new Error(data.error || 'Error desconocido');
      }
    } else if (error.request) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    } else {
      throw new Error('Error en la petición');
    }
  }
);

// Servicios del visualizador
export const visualizacionService = {
  // Obtener todos los registros (con cache)
  getRegistros: async () => {
    try {
      const now = Date.now();
      if (cache.registros && cache.lastFetch.registros && 
          (now - cache.lastFetch.registros) < CACHE_DURATION) {
        console.log('📊 Usando cache para registros');
        return cache.registros;
      }
      
      const response = await visualizacionApi.get('/registros');
      cache.registros = response.data;
      cache.lastFetch.registros = now;
      console.log('📊 Datos de registros actualizados');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener estadísticas básicas (con cache)
  getStats: async () => {
    try {
      const now = Date.now();
      if (cache.stats && cache.lastFetch.stats && 
          (now - cache.lastFetch.stats) < CACHE_DURATION) {
        console.log('📊 Usando cache para estadísticas');
        return cache.stats;
      }
      
      const response = await visualizacionApi.get('/stats');
      cache.stats = response.data;
      cache.lastFetch.stats = now;
      console.log('📊 Datos de estadísticas actualizados');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener eventos para análisis (con cache)
  getEventos: async () => {
    try {
      const now = Date.now();
      if (cache.eventos && cache.lastFetch.eventos && 
          (now - cache.lastFetch.eventos) < CACHE_DURATION) {
        console.log('📊 Usando cache para eventos');
        return cache.eventos;
      }
      
      const response = await visualizacionApi.get('/eventos');
      cache.eventos = response.data;
      cache.lastFetch.eventos = now;
      console.log('📊 Datos de eventos actualizados');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener eventos por fecha específica
  getEventosPorFecha: async (fecha = null) => {
    try {
      const url = fecha ? `/eventos?fecha=${fecha}` : '/eventos';
      const response = await visualizacionApi.get(url);
      
      console.log('📊 Respuesta de eventos por fecha:', response.data);
      console.log('📊 Tipo de respuesta:', typeof response.data);
      
      // Si tenemos datos en cache de eventos, usarlos y filtrarlos
      if (cache.eventos && !fecha) {
        console.log('📊 Usando cache para eventos filtrados');
        return cache.eventos;
      }
      
      console.log('📊 Datos de eventos por fecha actualizados');
      return response.data;
    } catch (error) {
      console.error('Error en getEventosPorFecha:', error);
      throw error;
    }
  },

  // Limpiar cache manualmente
  clearCache: () => {
    cache.registros = null;
    cache.eventos = null;
    cache.stats = null;
    cache.lastFetch = {
      registros: null,
      eventos: null,
      stats: null
    };
    console.log('📊 Cache limpiado');
  }
};

// Utilidades para procesamiento de datos
export const visualizacionUtils = {
  // Procesar registros por día
  getRegistrosPorDia: (registros) => {
    const conteosPorDia = {};
    
    registros.forEach(registro => {
      const fecha = new Date(registro.fecha_registro);
      const fechaKey = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!conteosPorDia[fechaKey]) {
        conteosPorDia[fechaKey] = 0;
      }
      conteosPorDia[fechaKey]++;
    });
    
    // Convertir a array ordenado para gráficos
    const datosOrdenados = Object.entries(conteosPorDia)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([fecha, cantidad]) => ({
        fecha,
        cantidad,
        fechaFormatted: new Date(fecha).toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        })
      }));
    
    return datosOrdenados;
  },

  // Procesar registros por charla
  getRegistrosPorCharla: (registros) => {
    const conteosPorCharla = {};
    
    registros.forEach(registro => {
      if (registro.eventos) {
        // Los eventos vienen como string concatenado
        const eventosArray = registro.eventos.split('; ');
        eventosArray.forEach(eventoStr => {
          if (eventoStr.trim()) {
            const partes = eventoStr.split(' - ');
            if (partes.length >= 4) {
              const tituloCharla = partes[3];
              if (!conteosPorCharla[tituloCharla]) {
                conteosPorCharla[tituloCharla] = {
                  titulo: tituloCharla,
                  registrados: 0,
                  fecha: partes[0],
                  hora: partes[1],
                  sala: partes[2]
                };
              }
              conteosPorCharla[tituloCharla].registrados++;
            }
          }
        });
      }
    });
    
    // Convertir a array ordenado por cantidad
    const datosOrdenados = Object.values(conteosPorCharla)
      .sort((a, b) => b.registrados - a.registrados);
    
    return datosOrdenados;
  },

  // Obtener estadísticas de empresas
  getEstadisticasEmpresas: (registros) => {
    const conteosPorEmpresa = {};
    
    registros.forEach(registro => {
      const empresa = registro.empresa || 'Sin empresa';
      if (!conteosPorEmpresa[empresa]) {
        conteosPorEmpresa[empresa] = 0;
      }
      conteosPorEmpresa[empresa]++;
    });
    
    // Top 10 empresas
    const topEmpresas = Object.entries(conteosPorEmpresa)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([empresa, cantidad]) => ({ empresa, cantidad }));
    
    return topEmpresas;
  },

  // Obtener estadísticas de países
  getEstadisticasPaises: (registros) => {
    const conteosPorPais = {};
    
    registros.forEach(registro => {
      // Intentar extraer país de los eventos
      if (registro.eventos) {
        const eventosArray = registro.eventos.split('; ');
        eventosArray.forEach(eventoStr => {
          if (eventoStr.trim()) {
            const partes = eventoStr.split(' - ');
            if (partes.length >= 4) {
              // Aquí necesitaríamos más información del evento para obtener el país
              // Por ahora, podemos usar un placeholder
            }
          }
        });
      }
    });
    
    // Placeholder - necesitaremos más datos del backend
    return [];
  },

  // Obtener estadísticas de cargos
  getEstadisticasCargos: (registros) => {
    const conteosPorCargo = {};
    
    registros.forEach(registro => {
      const cargo = registro.cargo || 'Sin especificar';
      if (!conteosPorCargo[cargo]) {
        conteosPorCargo[cargo] = 0;
      }
      conteosPorCargo[cargo]++;
    });
    
    // Ordenar por cantidad
    const topCargos = Object.entries(conteosPorCargo)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([cargo, cantidad]) => ({ cargo, cantidad }));
    
    return topCargos;
  },

  // Obtener resumen de estadísticas
  getResumenEstadisticas: (registros, eventos) => {
    const totalRegistros = registros.length;
    
    // Calcular total de cupos registrados sumando slots_ocupados de todos los eventos
    let totalCuposRegistrados = 0;
    let totalCuposDisponibles = 0;
    let totalEventos = 0;
    
    Object.values(eventos).forEach(eventosPorFecha => {
      Object.values(eventosPorFecha).forEach(eventosPorHora => {
        if (Array.isArray(eventosPorHora)) {
          eventosPorHora.forEach(evento => {
            totalEventos++;
            totalCuposRegistrados += evento.slots_ocupados || 0; // Suma de cupos ya registrados
            totalCuposDisponibles += evento.slots_disponibles || 60; // Capacidad total
          });
        }
      });
    });
    
    // Calcular promedio de charlas por usuario
    let totalCharlasSeleccionadas = 0;
    registros.forEach(registro => {
      if (registro.eventos) {
        const eventosArray = registro.eventos.split('; ');
        totalCharlasSeleccionadas += eventosArray.filter(e => e.trim()).length;
      }
    });
    
    const promedioCharlasPorUsuario = totalRegistros > 0 ? 
      (totalCharlasSeleccionadas / totalRegistros).toFixed(1) : 0;
    
    // Obtener últimos registros (últimas 24 horas)
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const registrosUltimas24h = registros.filter(registro => 
      new Date(registro.fecha_registro) > hace24Horas
    ).length;
    
    return {
      totalRegistros,
      totalEventos,
      totalCuposRegistrados,   // Total de cupos ya ocupados/registrados
      totalCuposDisponibles,   // Total de cupos disponibles (capacidad)
      promedioCharlasPorUsuario,
      registrosUltimas24h,
      totalCharlasSeleccionadas
    };
  },

  // Filtrar registros por criterios
  filtrarRegistros: (registros, filtros) => {
    let registrosFiltrados = [...registros];
    
    // Filtro por nombre
    if (filtros.nombre) {
      registrosFiltrados = registrosFiltrados.filter(registro =>
        registro.nombres.toLowerCase().includes(filtros.nombre.toLowerCase())
      );
    }
    
    // Filtro por empresa
    if (filtros.empresa) {
      registrosFiltrados = registrosFiltrados.filter(registro =>
        registro.empresa && registro.empresa.toLowerCase().includes(filtros.empresa.toLowerCase())
      );
    }
    
    // Filtro por fecha de registro
    if (filtros.fechaDesde) {
      const fechaDesde = new Date(filtros.fechaDesde);
      registrosFiltrados = registrosFiltrados.filter(registro =>
        new Date(registro.fecha_registro) >= fechaDesde
      );
    }
    
    if (filtros.fechaHasta) {
      const fechaHasta = new Date(filtros.fechaHasta);
      fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
      registrosFiltrados = registrosFiltrados.filter(registro =>
        new Date(registro.fecha_registro) <= fechaHasta
      );
    }
    
    // Filtro por cargo
    if (filtros.cargo) {
      registrosFiltrados = registrosFiltrados.filter(registro =>
        registro.cargo && registro.cargo.toLowerCase().includes(filtros.cargo.toLowerCase())
      );
    }

    // Filtro por charla específica
    if (filtros.charlaFiltro) {
      registrosFiltrados = registrosFiltrados.filter(registro => {
        if (!registro.eventos) return false;
        return registro.eventos.toLowerCase().includes(filtros.charlaFiltro.toLowerCase());
      });
    }
    
    return registrosFiltrados;
  },

  // Formatear fecha para display
  formatearFecha: (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Formatear eventos para display
  formatearEventos: (eventosString) => {
    if (!eventosString) return [];
    
    const eventosArray = eventosString.split('; ');
    return eventosArray.map(eventoStr => {
      const partes = eventoStr.split(' - ');
      if (partes.length >= 4) {
        return {
          fecha: partes[0],
          hora: partes[1],
          sala: partes[2],
          titulo: partes[3]
        };
      }
      return { titulo: eventoStr };
    }).filter(evento => evento.titulo.trim());
  }
};

export default visualizacionService; 