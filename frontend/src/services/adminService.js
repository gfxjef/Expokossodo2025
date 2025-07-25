import axios from 'axios';
import API_CONFIG from '../config/api.config';

// Configuración base de la API Admin
let API_BASE_URL = API_CONFIG.getApiUrl();

// Validación adicional para asegurar que siempre tengamos /api
if (!API_BASE_URL.includes('/api')) {
  console.warn('⚠️ La URL base no incluye /api, agregándolo...');
  API_BASE_URL = API_BASE_URL + '/api';
}

console.log('📍 Admin Service - URL base final:', API_BASE_URL);

const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: API_CONFIG.getDefaultHeaders(),
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
  },

  // ===== NUEVOS MÉTODOS PARA GESTIÓN DE HORARIOS =====
  
  // Obtener todos los horarios con estadísticas
  getHorarios: async () => {
    try {
      const response = await adminApi.get('/horarios');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Activar/Desactivar un horario
  toggleHorario: async (horario) => {
    try {
      const response = await adminApi.put(`/horario/${encodeURIComponent(horario)}/toggle`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener solo horarios activos
  getHorariosActivos: async () => {
    try {
      const response = await adminApi.get('/horarios/activos');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ===== NUEVOS MÉTODOS PARA GESTIÓN DE INFORMACIÓN POR FECHA =====
  
  // Obtener información de todas las fechas (para admin)
  getFechasInfo: async () => {
    try {
      const response = await adminApi.get('/fechas-info');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Actualizar información de una fecha específica
  updateFechaInfo: async (fechaId, fechaData) => {
    try {
      const response = await adminApi.put(`/fecha-info/${fechaId}`, fechaData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Activar/Desactivar información de una fecha
  toggleFechaInfo: async (fechaId) => {
    try {
      const response = await adminApi.put(`/fecha-info/${fechaId}/toggle`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ===== NUEVO MÉTODO PARA TOGGLE DE DISPONIBILIDAD DE EVENTOS =====
  
  // Toggle disponibilidad de un evento
  toggleEventoDisponibilidad: async (eventoId) => {
    try {
      const response = await adminApi.put(`/evento/${eventoId}/toggle-disponibilidad`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ===== NUEVO MÉTODO PARA MARCAS =====
  
  // Obtener todas las marcas disponibles
  getMarcas: async () => {
    try {
      const response = await adminApi.get('/marcas');
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
  
  post: (value) => {
    if (!value || value.trim().length === 0) {
      return null; // Opcional
    }
    
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(value)) {
      return 'La URL del post no es válida';
    }
    
    if (value.trim().length > 500) {
      return 'La URL del post no puede exceder 500 caracteres';
    }
    
    return null;
  },
  
  // Validar rubro
  rubro: (value) => {
    if (!value || !Array.isArray(value) || value.length === 0) {
      return 'Debes seleccionar al menos un rubro';
    }
    
    const rubrosValidos = [
      'Salud',
      'Química & Petrolera',
      'Educación',
      'Aguas y bebidas',
      'Farmacéutica',
      'Alimentos',
      'Minería',
      'Pesquera'
    ];
    
    const rubrosInvalidos = value.filter(rubro => !rubrosValidos.includes(rubro));
    if (rubrosInvalidos.length > 0) {
      return `Rubros inválidos: ${rubrosInvalidos.join(', ')}`;
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
    
    const postError = adminValidators.post(eventoData.post);
    if (postError) errors.post = postError;
    
    const rubroError = adminValidators.rubro(eventoData.rubro);
    if (rubroError) errors.rubro = rubroError;
    
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
    const horarios = ['15:00-15:45', '16:00-16:45', '17:00-17:45', '18:00-18:45', '19:00-19:45'];
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