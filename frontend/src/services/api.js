import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos
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
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  },
  
  formatDateNice: (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('es-ES', options);
  },
  
  formatDateShort: (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('es-ES', { month: 'short' });
    return `${day} ${month}`;
  },
  
  getDayName: (dateString) => {
    const date = new Date(dateString);
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