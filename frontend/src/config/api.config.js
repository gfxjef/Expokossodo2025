// Configuración de API para diferentes entornos

const API_CONFIG = {
  // URL base del backend según el entorno
  getApiUrl: () => {
    // Log para debug
    console.log('🔍 Detectando URL de API...');
    console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - Hostname:', window.location.hostname);
    console.log('  - Port:', window.location.port);
    
    // Si está definida la variable de entorno, usarla
    if (process.env.REACT_APP_API_URL) {
      console.log('✅ Usando REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }
    
    // FORZAR DESARROLLO LOCAL - Detectar si estamos en desarrollo
    const isLocalDev = (
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.')
    );
    
    if (isLocalDev) {
      const devUrl = 'http://localhost:5000/api';
      console.log('✅ DESARROLLO LOCAL detectado - Usando URL de desarrollo:', devUrl);
      return devUrl;
    }
    
    // Solo en producción real (Vercel/Netlify/etc)
    const prodUrl = 'https://expokossodo2025-backend.onrender.com/api';
    console.log('✅ PRODUCCIÓN detectada - Usando URL de producción:', prodUrl);
    return prodUrl;
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