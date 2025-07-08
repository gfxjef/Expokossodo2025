// Configuración de API para diferentes entornos

const API_CONFIG = {
  // URL base del backend según el entorno
  getApiUrl: () => {
    // Si está definida la variable de entorno, usarla
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Si estamos en producción (Vercel), usar la URL de Render
    if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
      return 'https://expokossodo2025-backend.onrender.com/api';
    }
    
    // En desarrollo, usar localhost
    return 'http://localhost:5000/api';
  },
  
  // Timeout por defecto
  defaultTimeout: 30000,
  
  // Headers por defecto
  defaultHeaders: {
    'Content-Type': 'application/json',
  }
};

export default API_CONFIG; 