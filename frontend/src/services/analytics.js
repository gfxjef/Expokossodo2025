import ReactGA from 'react-ga4';

// ID de Google Analytics - usar solo variable de entorno
const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

/**
 * Servicio de Google Analytics para ExpoKossodo 2025
 * Maneja todo el tracking de eventos y navegación
 */
export const analyticsService = {
  /**
   * Inicializar Google Analytics 4
   */
  init: () => {
    try {
      if (GA_MEASUREMENT_ID) {
        ReactGA.initialize(GA_MEASUREMENT_ID);
        console.log('📊 Google Analytics inicializado correctamente');
        console.log('📊 Measurement ID:', GA_MEASUREMENT_ID);
        return true;
      } else {
        console.warn('⚠️ No se encontró GA_MEASUREMENT_ID');
        return false;
      }
    } catch (error) {
      console.error('❌ Error inicializando Google Analytics:', error);
      return false;
    }
  },

  /**
   * Trackear vista de página
   * @param {string} path - Ruta de la página
   */
  trackPageView: (path) => {
    try {
      ReactGA.send({ hitType: "pageview", page: path });
      console.log('📊 Pageview tracked:', path);
    } catch (error) {
      console.error('❌ Error tracking pageview:', error);
    }
  },

  /**
   * Trackear evento personalizado
   * @param {string} category - Categoría del evento
   * @param {string} action - Acción realizada
   * @param {string} label - Etiqueta adicional (opcional)
   * @param {number} value - Valor numérico (opcional)
   */
  trackEvent: (category, action, label = null, value = null) => {
    try {
      const eventData = {
        category,
        action,
        ...(label && { label }),
        ...(value && { value })
      };
      
      ReactGA.event(eventData);
      console.log('📊 Event tracked:', eventData);
    } catch (error) {
      console.error('❌ Error tracking event:', error);
    }
  },

  // ===== EVENTOS ESPECÍFICOS DE EXPOKOSSODO =====

  /**
   * Trackear registro completado
   * @param {number} eventCount - Número de eventos seleccionados
   * @param {string} userType - Tipo de usuario (ej: "médico", "estudiante")
   */
  trackRegistration: (eventCount, userType = 'general') => {
    analyticsService.trackEvent('Registro', 'Completar Registro', `Eventos: ${eventCount}`, eventCount);
    analyticsService.trackEvent('Usuario', 'Tipo Usuario', userType);
  },

  /**
   * Trackear selección de evento
   * @param {string} eventName - Nombre del evento
   * @param {string} eventDate - Fecha del evento
   * @param {string} eventTime - Horario del evento
   */
  trackEventSelection: (eventName, eventDate, eventTime) => {
    analyticsService.trackEvent('Selección Evento', 'Seleccionar Charla', `${eventName} - ${eventDate} ${eventTime}`);
  },

  /**
   * Trackear deselección de evento
   * @param {string} eventName - Nombre del evento
   */
  trackEventDeselection: (eventName) => {
    analyticsService.trackEvent('Selección Evento', 'Deseleccionar Charla', eventName);
  },

  /**
   * Trackear verificación QR
   * @param {string} verificationType - Tipo de verificación
   * @param {string} result - Resultado de la verificación
   */
  trackQRVerification: (verificationType, result) => {
    analyticsService.trackEvent('Verificación QR', verificationType, result);
  },

  /**
   * Trackear acción de administración
   * @param {string} action - Acción realizada
   * @param {string} details - Detalles adicionales
   */
  trackAdminAction: (action, details) => {
    analyticsService.trackEvent('Administración', action, details);
  },

  /**
   * Trackear error en formulario
   * @param {string} formType - Tipo de formulario
   * @param {string} errorType - Tipo de error
   */
  trackFormError: (formType, errorType) => {
    analyticsService.trackEvent('Error', 'Formulario', `${formType} - ${errorType}`);
  },

  /**
   * Trackear engagement con contenido
   * @param {string} contentType - Tipo de contenido
   * @param {string} action - Acción realizada
   */
  trackEngagement: (contentType, action) => {
    analyticsService.trackEvent('Engagement', action, contentType);
  },

  /**
   * Trackear navegación entre secciones
   * @param {string} fromSection - Sección de origen
   * @param {string} toSection - Sección de destino
   */
  trackNavigation: (fromSection, toSection) => {
    analyticsService.trackEvent('Navegación', 'Cambio Sección', `${fromSection} → ${toSection}`);
  },

  /**
   * Trackear tiempo en página
   * @param {string} pageName - Nombre de la página
   * @param {number} timeSpent - Tiempo en segundos
   */
  trackTimeOnPage: (pageName, timeSpent) => {
    analyticsService.trackEvent('Engagement', 'Tiempo Página', pageName, timeSpent);
  },

  /**
   * Trackear scroll en página
   * @param {string} pageName - Nombre de la página
   * @param {number} scrollPercentage - Porcentaje de scroll
   */
  trackScroll: (pageName, scrollPercentage) => {
    analyticsService.trackEvent('Engagement', 'Scroll', `${pageName} - ${scrollPercentage}%`);
  },

  // ===== EVENTOS DE CONVERSIÓN =====

  /**
   * Trackear click en CTA principal
   * @param {string} ctaText - Texto del CTA
   * @param {string} location - Ubicación del CTA
   */
  trackCTAClick: (ctaText, location) => {
    analyticsService.trackEvent('CTA', 'Click', `${ctaText} - ${location}`);
  },

  /**
   * Trackear inicio de registro
   */
  trackRegistrationStart: () => {
    analyticsService.trackEvent('Funnel', 'Iniciar Registro');
  },

  /**
   * Trackear paso completado en funnel
   * @param {string} stepName - Nombre del paso
   * @param {number} stepNumber - Número del paso
   */
  trackFunnelStep: (stepName, stepNumber) => {
    analyticsService.trackEvent('Funnel', 'Paso Completado', `${stepName} (${stepNumber})`);
  },

  // ===== UTILIDADES =====

  /**
   * Obtener información de la sesión actual
   */
  getSessionInfo: () => {
    try {
      return {
        measurementId: GA_MEASUREMENT_ID,
        isInitialized: !!ReactGA.ga,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error obteniendo info de sesión:', error);
      return null;
    }
  },

  /**
   * Verificar si GA está funcionando
   */
  isWorking: () => {
    try {
      return !!ReactGA.ga && !!GA_MEASUREMENT_ID;
    } catch (error) {
      return false;
    }
  }
};

// Exportar también funciones individuales para uso directo
export const {
  init,
  trackPageView,
  trackEvent,
  trackRegistration,
  trackEventSelection,
  trackQRVerification,
  trackAdminAction,
  trackFormError,
  trackEngagement,
  trackNavigation,
  trackCTAClick,
  trackRegistrationStart,
  trackFunnelStep,
  getSessionInfo,
  isWorking
} = analyticsService;

export default analyticsService; 