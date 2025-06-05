import axios from 'axios';

// Configuración base de la API Admin
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 segundos para admin
});

// Interceptor para manejar errores globalmente
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Admin API Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Tiempo de espera agotado. Por favor, intenta de nuevo.');
    }
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data.error || 'Datos inválidos');
        case 404:
          throw new Error('Evento no encontrado');
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

// Servicios de la API Admin
export const adminService = {
  // Obtener todos los eventos organizados por fecha
  getEventos: async () => {
    try {
      const response = await adminApi.get('/eventos');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Obtener detalles de un evento específico
  getEvento: async (eventoId) => {
    try {
      const response = await adminApi.get(`/evento/${eventoId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Actualizar un evento
  updateEvento: async (eventoId, eventoData) => {
    try {
      const response = await adminApi.put(`/evento/${eventoId}`, eventoData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Validadores específicos para admin
export const adminValidators = {
  titulo: (value) => {
    if (!value || value.trim().length === 0) {
      return 'El título es requerido';
    }
    if (value.trim().length < 5) {
      return 'El título debe tener al menos 5 caracteres';
    }
    if (value.trim().length > 200) {
      return 'El título no puede exceder 200 caracteres';
    }
    return null;
  },
  
  expositor: (value) => {
    if (!value || value.trim().length === 0) {
      return 'El expositor es requerido';
    }
    if (value.trim().length < 3) {
      return 'El nombre del expositor debe tener al menos 3 caracteres';
    }
    if (value.trim().length > 100) {
      return 'El nombre del expositor no puede exceder 100 caracteres';
    }
    return null;
  },
  
  pais: (value) => {
    if (!value || value.trim().length === 0) {
      return 'El país es requerido';
    }
    if (value.trim().length < 2) {
      return 'El país debe tener al menos 2 caracteres';
    }
    if (value.trim().length > 50) {
      return 'El país no puede exceder 50 caracteres';
    }
    return null;
  },
  
  descripcion: (value) => {
    if (value && value.length > 5000) {
      return 'La descripción no puede exceder 5000 caracteres';
    }
    return null;
  },
  
  imagenUrl: (value) => {
    if (!value || value.trim().length === 0) {
      return null; // Opcional
    }
    
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(value)) {
      return 'Debe ser una URL válida';
    }
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const hasImageExtension = imageExtensions.some(ext => 
      value.toLowerCase().includes(ext)
    );
    
    if (!hasImageExtension && !value.includes('unsplash.com') && !value.includes('images.')) {
      return 'La URL debe apuntar a una imagen válida';
    }
    
    return null;
  },
  
  // Validar todo el formulario
  validateEvento: (eventoData) => {
    const errors = {};
    
    const tituloError = adminValidators.titulo(eventoData.titulo_charla);
    if (tituloError) errors.titulo_charla = tituloError;
    
    const expositorError = adminValidators.expositor(eventoData.expositor);
    if (expositorError) errors.expositor = expositorError;
    
    const paisError = adminValidators.pais(eventoData.pais);
    if (paisError) errors.pais = paisError;
    
    const descripcionError = adminValidators.descripcion(eventoData.descripcion);
    if (descripcionError) errors.descripcion = descripcionError;
    
    const imagenError = adminValidators.imagenUrl(eventoData.imagen_url);
    if (imagenError) errors.imagen_url = imagenError;
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

// Utilidades específicas para admin
export const adminUtils = {
  formatDateTime: (fecha, hora) => {
    const fechaObj = new Date(fecha);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', options);
    return `${fechaFormateada} - ${hora}`;
  },
  
  getEventosStats: (eventosPorFecha) => {
    let totalEventos = 0;
    let totalOcupados = 0;
    let totalDisponibles = 0;
    
    Object.values(eventosPorFecha).forEach(eventos => {
      eventos.forEach(evento => {
        totalEventos++;
        totalOcupados += evento.slots_ocupados;
        totalDisponibles += evento.slots_disponibles;
      });
    });
    
    return {
      totalEventos,
      totalOcupados,
      totalDisponibles,
      porcentajeOcupacion: totalDisponibles > 0 ? 
        Math.round((totalOcupados / totalDisponibles) * 100) : 0
    };
  },
  
  // Organizar eventos por horario para la vista de grilla
  organizarEventosPorHorario: (eventos) => {
    const horarios = ['09:00-10:00', '10:30-11:30', '12:00-13:00', '14:00-15:00', '15:30-16:30'];
    const salas = ['sala1', 'sala2', 'sala3', 'sala5'];
    
    const grid = {};
    
    horarios.forEach(horario => {
      grid[horario] = {};
      salas.forEach(sala => {
        const evento = eventos.find(e => e.hora === horario && e.sala === sala);
        grid[horario][sala] = evento || null;
      });
    });
    
    return grid;
  }
};

export default adminService; 