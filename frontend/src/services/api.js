import axios from 'axios';
import API_CONFIG from '../config/api.config';

// Configuración base de la API
let API_BASE_URL = API_CONFIG.getApiUrl();

// Validación adicional para asegurar que siempre tengamos /api
if (!API_BASE_URL.includes('/api')) {
  console.warn('⚠️ La URL base no incluye /api, agregándolo...');
  API_BASE_URL = API_BASE_URL + '/api';
}

console.log('📍 API Service - URL base final:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: API_CONFIG.getDefaultHeaders(),
  timeout: API_CONFIG.defaultTimeout,
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Manejo de errores específicos
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tiempo de espera agotado. Por favor, intenta de nuevo.');
    }
    
    if (error.response) {
      // El servidor respondió con un error
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data.error || 'Datos inválidos');
        case 404:
          throw new Error('Recurso no encontrado');
        case 500:
          throw new Error('Error interno del servidor');
        default:
          throw new Error(data.error || 'Error desconocido');
      }
    } else if (error.request) {
      // No hubo respuesta del servidor
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    } else {
      // Error en la configuración de la petición
      throw new Error('Error en la petición');
    }
  }
);

// Cache simple para evitar llamadas duplicadas
const cache = {
  verificationEvents: null,
  lastFetch: null,
  pendingRequest: null, // Para evitar peticiones duplicadas simultáneas
  eventAttendees: {}, // Cache por evento_id
  attendeesLastFetch: {}, // Last fetch por evento_id
  attendeesPendingRequests: {}, // Para evitar peticiones duplicadas por evento
  CACHE_DURATION: 30000 // 30 segundos
};

// Servicios de la API
export const eventService = {
  // Obtener todos los eventos organizados por fecha
  getEvents: async () => {
    try {
      const response = await api.get('/eventos');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obtener UN evento específico para verificación (SUPER RÁPIDO)
  getVerificationEvent: async (eventoId) => {
    try {
      console.log(`🎯 Cargando evento específico ${eventoId}...`);
      const response = await api.get(`/verificar-sala/evento/${eventoId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener eventos para verificación (CON CACHE MEJORADO)
  getVerificationEvents: async (forceRefresh = false) => {
    try {
      const now = Date.now();
      const hasValidCache = cache.verificationEvents && 
                           cache.lastFetch && 
                           (now - cache.lastFetch) < cache.CACHE_DURATION;
      
      if (!forceRefresh && hasValidCache) {
        console.log('📦 Usando eventos desde caché (válido por ' + Math.round((cache.CACHE_DURATION - (now - cache.lastFetch))/1000) + 's más)');
        return cache.verificationEvents;
      }
      
      // Si ya hay una petición en curso, esperar a que termine
      if (cache.pendingRequest) {
        console.log('⏳ Esperando petición en curso...');
        return await cache.pendingRequest;
      }
      
      console.log('🔄 Cargando eventos desde servidor...', forceRefresh ? '(FORZADO)' : '');
      
      // Marcar que hay una petición en curso
      cache.pendingRequest = api.get('/verificar-sala/eventos').then(response => {
        // Guardar en caché
        cache.verificationEvents = response.data;
        cache.lastFetch = now;
        cache.pendingRequest = null; // Limpiar petición pendiente
        
        console.log('✅ Eventos cargados desde servidor:', response.data.eventos?.length || 0);
        return response.data;
      }).catch(error => {
        cache.pendingRequest = null; // Limpiar petición pendiente en caso de error
        throw error;
      });
      
      return await cache.pendingRequest;
    } catch (error) {
      throw error;
    }
  },
  
  // Obtener asistentes de un evento (CON CACHE MEJORADO)
  getEventAttendees: async (eventoId, forceRefresh = false) => {
    try {
      const now = Date.now();
      const hasValidCache = cache.eventAttendees[eventoId] && 
                           cache.attendeesLastFetch[eventoId] && 
                           (now - cache.attendeesLastFetch[eventoId]) < cache.CACHE_DURATION;
      
      if (!forceRefresh && hasValidCache) {
        console.log(`📦 Usando asistentes del evento ${eventoId} desde caché`);
        return cache.eventAttendees[eventoId];
      }
      
      // Si ya hay una petición en curso para este evento, esperar a que termine
      if (cache.attendeesPendingRequests[eventoId]) {
        console.log(`⏳ Esperando petición en curso para evento ${eventoId}...`);
        return await cache.attendeesPendingRequests[eventoId];
      }
      
      console.log(`🔄 Cargando asistentes del evento ${eventoId} desde servidor...`);
      
      // Marcar que hay una petición en curso para este evento
      cache.attendeesPendingRequests[eventoId] = api.get(`/verificar-sala/asistentes/${eventoId}`).then(response => {
        // Guardar en caché
        cache.eventAttendees[eventoId] = response.data;
        cache.attendeesLastFetch[eventoId] = now;
        delete cache.attendeesPendingRequests[eventoId]; // Limpiar petición pendiente
        
        return response.data;
      }).catch(error => {
        delete cache.attendeesPendingRequests[eventoId]; // Limpiar petición pendiente en caso de error
        throw error;
      });
      
      return await cache.attendeesPendingRequests[eventoId];
    } catch (error) {
      throw error;
    }
  },

  // Limpiar caché cuando sea necesario
  clearVerificationCache: () => {
    cache.verificationEvents = null;
    cache.lastFetch = null;
    cache.pendingRequest = null;
  },

  // Limpiar caché de asistentes
  clearAttendeesCache: (eventoId = null) => {
    if (eventoId) {
      delete cache.eventAttendees[eventoId];
      delete cache.attendeesLastFetch[eventoId];
      delete cache.attendeesPendingRequests[eventoId];
    } else {
      cache.eventAttendees = {};
      cache.attendeesLastFetch = {};
      cache.attendeesPendingRequests = {};
    }
  },

  // Invalidar caché cuando se registra nueva asistencia
  invalidateAttendeeCache: (eventoId) => {
    if (eventoId) {
      delete cache.eventAttendees[eventoId];
      delete cache.attendeesLastFetch[eventoId];
      console.log(`🗑️ Cache invalidado para evento ${eventoId}`);
    }
  },
  
  // Obtener horarios activos
  getActiveTimeSlots: async () => {
    try {
      const response = await api.get('/admin/horarios/activos');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener información de fechas activas (público)
  getFechasInfoActivas: async () => {
    try {
      const response = await api.get('/fechas-info/activas');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Crear un nuevo registro
  createRegistration: async (registrationData) => {
    try {
      const response = await api.post('/registro', registrationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obtener estadísticas (opcional para dashboard)
  getStats: async () => {
    try {
      const response = await api.get('/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obtener todos los registros (para administración)
  getRegistrations: async () => {
    try {
      const response = await api.get('/registros');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Validadores de datos
export const validators = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  phone: (phone) => {
    // eslint-disable-next-line no-useless-escape
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },
  
  required: (value) => {
    return value && value.toString().trim().length > 0;
  },
  
  minLength: (value, min) => {
    return value && value.toString().trim().length >= min;
  }
};

// Utilidades
export const utils = {
  formatDate: (dateString) => {
    // Evitar problemas de zona horaria parseando la fecha manualmente
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // mes es 0-indexado
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  },
  
  formatDateNice: (dateString) => {
    // Evitar problemas de zona horaria parseando la fecha manualmente
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // mes es 0-indexado
    const options = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  },
  
  formatDateShort: (dateString) => {
    // Evitar problemas de zona horaria parseando la fecha manualmente
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // mes es 0-indexado
    const dayNumber = date.getDate();
    const monthShort = date.toLocaleDateString('es-ES', { month: 'short' });
    return `${dayNumber} ${monthShort}`;
  },
  
  getDayName: (dateString) => {
    // Evitar problemas de zona horaria parseando la fecha manualmente
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // mes es 0-indexado
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  },
  
  // Verificar si un horario ya está seleccionado
  isTimeSlotTaken: (selectedEvents, newHour) => {
    return selectedEvents.some(event => event.hora === newHour);
  },
  
  // Contar eventos seleccionados por fecha
  countEventsByDate: (selectedEvents, targetDate) => {
    return selectedEvents.filter(event => event.fecha === targetDate).length;
  }
};

export default api; 