# 📊 Guía de Google Analytics - ExpoKossodo 2025

## 🎯 **Descripción General**

Sistema completo de Google Analytics 4 (GA4) implementado para hacer seguimiento eficiente de la web ExpoKossodo 2025. Incluye tracking automático de navegación, eventos personalizados específicos del negocio y métricas de conversión.

---

## ✅ **ESTADO DE IMPLEMENTACIÓN**

### **✅ Completado (50%)**
- ✅ Configuración base de GA4
- ✅ Instalación de dependencias (react-ga4)
- ✅ Servicio de analytics completo
- ✅ Integración en App.js
- ✅ Tracking automático de rutas

### **🔄 En Progreso (10%)**
- 🔄 Tracking en componentes principales

### **📋 Pendiente (40%)**
- 📋 Eventos personalizados específicos
- 📋 Configuración de objetivos GA4
- 📋 Testing y validación
- 📋 Documentación y reportes

---

## 🔧 **CONFIGURACIÓN TÉCNICA**

### **ID de Google Analytics**
```
Measurement ID: G-EPRBXXTWTM
Propiedad: ExpoKossodo 2025
Estado: Activo y configurado
```

### **Dependencias Instaladas**
```bash
npm install react-ga4
```

### **Archivos Modificados**
- `frontend/public/index.html` - Script de GA4
- `frontend/src/services/analytics.js` - Servicio completo
- `frontend/src/App.js` - Integración y tracking de rutas

---

## 📊 **EVENTOS IMPLEMENTADOS**

### **🎯 Eventos Automáticos**
- **Vistas de página** → Se trackean automáticamente al navegar
- **Navegación entre secciones** → Tracking de cambios de ruta
- **Inicialización de GA4** → Al cargar la aplicación

### **📈 Eventos Personalizados Disponibles**

#### **Registro y Conversión**
```javascript
// Trackear registro completado
analyticsService.trackRegistration(eventCount, userType);

// Trackear selección de evento
analyticsService.trackEventSelection(eventName, eventDate, eventTime);

// Trackear inicio de registro
analyticsService.trackRegistrationStart();

// Trackear paso del funnel
analyticsService.trackFunnelStep(stepName, stepNumber);
```

#### **Verificación QR**
```javascript
// Trackear verificación QR
analyticsService.trackQRVerification(verificationType, result);
```

#### **Administración**
```javascript
// Trackear acción de administración
analyticsService.trackAdminAction(action, details);
```

#### **Engagement**
```javascript
// Trackear engagement con contenido
analyticsService.trackEngagement(contentType, action);

// Trackear tiempo en página
analyticsService.trackTimeOnPage(pageName, timeSpent);

// Trackear scroll
analyticsService.trackScroll(pageName, scrollPercentage);
```

#### **Errores**
```javascript
// Trackear error en formulario
analyticsService.trackFormError(formType, errorType);
```

#### **CTA y Navegación**
```javascript
// Trackear click en CTA
analyticsService.trackCTAClick(ctaText, location);

// Trackear navegación
analyticsService.trackNavigation(fromSection, toSection);
```

---

## 🚀 **CÓMO USAR EL SISTEMA**

### **1. Importar el Servicio**
```javascript
import { analyticsService } from '../services/analytics';
```

### **2. Usar Funciones Específicas**
```javascript
// Ejemplo: Trackear selección de evento
const handleEventSelect = (event) => {
  analyticsService.trackEventSelection(
    event.titulo, 
    event.fecha, 
    event.horario
  );
};

// Ejemplo: Trackear registro completado
const handleRegistrationComplete = (userData, selectedEvents) => {
  analyticsService.trackRegistration(
    selectedEvents.length,
    userData.tipo_usuario || 'general'
  );
};
```

### **3. Verificar Funcionamiento**
```javascript
// Verificar si GA está funcionando
const isWorking = analyticsService.isWorking();

// Obtener información de sesión
const sessionInfo = analyticsService.getSessionInfo();
console.log('Session Info:', sessionInfo);
```

---

## 📈 **MÉTRICAS CLAVE A MONITOREAR**

### **🎯 Conversión Principal**
- **Registros Completados** → Usuarios que completan el registro
- **Selección de Eventos** → Charlas más populares
- **Verificaciones QR** → Asistencia confirmada

### **📊 Engagement**
- **Tiempo en Página** → Engagement con contenido
- **Navegación** → Flujo de usuarios
- **Scroll** → Interés en contenido

### **🔍 Análisis de Usuario**
- **Origen de Tráfico** → De dónde vienen los usuarios
- **Dispositivo** → Mobile vs Desktop
- **Ubicación** → País/ciudad de usuarios

---

## 🛠️ **PRÓXIMOS PASOS**

### **PRIORIDAD ALTA**
1. **Integrar en EventRegistration.js**
   - Trackear selección de eventos
   - Trackear completación de registro

2. **Integrar en VerificadorGeneral.js**
   - Trackear verificaciones QR

### **PRIORIDAD MEDIA**
1. **Eventos de Engagement**
   - Scroll tracking
   - Tiempo en página

2. **Eventos de Error**
   - Validaciones fallidas
   - Errores de formulario

### **PRIORIDAD BAJA**
1. **Configuración de Objetivos GA4**
   - Funnel de conversión
   - Métricas personalizadas

---

## 🔍 **VERIFICACIÓN EN GOOGLE ANALYTICS**

### **1. Real-Time Reports**
1. Ir a [Google Analytics](https://analytics.google.com)
2. Seleccionar propiedad "ExpoKossodo 2025"
3. Ir a **Reports** → **Realtime** → **Events**
4. Verificar que aparecen los eventos

### **2. Debug Mode**
```javascript
// En consola del navegador
gtag('config', 'G-EPRBXXTWTM', {
  debug_mode: true
});
```

### **3. Google Analytics Debugger**
- Instalar extensión "Google Analytics Debugger"
- Activar para ver eventos en consola

---

## 🚨 **RESOLUCIÓN DE PROBLEMAS**

### **❌ GA4 No Se Inicializa**
```javascript
// Verificar en consola
console.log('GA Measurement ID:', process.env.REACT_APP_GA_MEASUREMENT_ID);
console.log('GA Working:', analyticsService.isWorking());
```

### **❌ Eventos No Aparecen**
1. Verificar que el script de GA4 esté en index.html
2. Verificar que no haya bloqueadores de anuncios
3. Verificar en modo incógnito

### **❌ Errores de Importación**
```bash
# Reinstalar dependencias
npm install react-ga4
```

---

## 📞 **SOPORTE Y CONTACTO**

- **Documentación**: Este archivo
- **Task Master**: `TASK_MASTER_GOOGLE_ANALYTICS.md`
- **Servicio**: `frontend/src/services/analytics.js`

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

### **Configuración Base**
- [x] GA4 configurado en index.html
- [x] react-ga4 instalado
- [x] Servicio de analytics creado
- [x] Integración en App.js

### **Funcionalidad**
- [x] Tracking automático de rutas
- [x] Inicialización automática
- [x] Eventos personalizados disponibles
- [x] Logs en consola funcionando

### **Próximos Pasos**
- [ ] Integrar en componentes principales
- [ ] Configurar objetivos GA4
- [ ] Testing completo
- [ ] Documentación final

---

**🎉 ¡Google Analytics está configurado y funcionando!**

**📊 Próximo paso**: Integrar tracking en los componentes principales de la aplicación. 