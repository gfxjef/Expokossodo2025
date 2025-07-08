// Configuración de API para diferentes entornos

const API_CONFIG = {
  // URL base del backend según el entorno
  getApiUrl: () => {
    // Log para debug
    console.log('🔍 Detectando URL de API...');
    console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - Hostname:', window.location.hostname);
    
    // Si está definida la variable de entorno, usarla
    if (process.env.REACT_APP_API_URL) {
      console.log('✅ Usando REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }
    
    // Si estamos en producción (Vercel), usar la URL de Render
    if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
      const prodUrl = 'https://expokossodo2025-backend.onrender.com/api';
      console.log('✅ Usando URL de producción:', prodUrl);
      return prodUrl;
    }
    
    // En desarrollo, usar localhost
    const devUrl = 'http://localhost:5000/api';
    console.log('✅ Usando URL de desarrollo:', devUrl);
    return devUrl;
  },
  
  // Detectar si estamos en ngrok
  isNgrok: () => {
    return window.location.hostname.includes('ngrok');
  },
  
  // Timeout por defecto
  defaultTimeout: 30000,
  
  // Headers por defecto
  getDefaultHeaders: () => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Si estamos en ngrok, agregar header especial
    if (API_CONFIG.isNgrok()) {
      headers['ngrok-skip-browser-warning'] = 'true';
      console.log('🌐 Detectado ngrok, agregando headers especiales');
    }
    
    return headers;
  },
  
  // Para mantener compatibilidad
  defaultHeaders: {
    'Content-Type': 'application/json',
  }
};

// Log inicial al cargar el módulo
console.log('🚀 API Config cargada. URL base:', API_CONFIG.getApiUrl());
if (API_CONFIG.isNgrok()) {
  console.log('🌐 Ejecutando desde ngrok');
}

export default API_CONFIG; 