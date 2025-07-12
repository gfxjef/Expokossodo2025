# Manual de Usuario: Grilla de Eventos en Dashboard de Visualización

## 📋 Descripción General

Se ha agregado una nueva funcionalidad al Dashboard de Visualización llamada **"Programación"** que permite visualizar todos los eventos/charlas organizados por horario y salas, similar a la vista del panel administrativo pero optimizada para análisis y visualización.

## 🎯 Funcionalidades Principales

### 1. Vista de Grilla de Eventos
- **Organización por horario**: Eventos mostrados en franjas horarias (15:00-15:45, 16:00-16:45, etc.)
- **Distribución por salas**: Salas 1, 2, 3 y 4 como columnas
- **Información completa**: Cada evento muestra:
  - Bandera y país de origen
  - Título de la charla
  - Nombre del expositor
  - Ocupación actual (registrados/cupos totales)
  - Porcentaje de ocupación con colores distintivos

### 2. Eventos Clickeables
- **Indicador visual**: Texto "👆 Clickeable" en el header
- **Efecto hover**: Los eventos se destacan al pasar el cursor
- **Modal de detalles**: Al hacer clic se abre el modal con información completa

### 3. Estados Visuales
- **Eventos activos**: Borde azul al hacer hover, fondo azul claro
- **Eventos inactivos**: Fondo rojo claro con overlay "INACTIVO"
- **Código de colores por ocupación**:
  - 🟢 Verde: 0-49% ocupación
  - 🟡 Amarillo: 50-69% ocupación
  - 🟠 Naranja: 70-89% ocupación
  - 🔴 Rojo: 90-100% ocupación

## 🚀 Cómo Usar la Grilla de Eventos

### Acceso a la Funcionalidad
1. Navegar a `/visualizacion` en el sitio web
2. Hacer clic en la pestaña **"Programación"**
3. La grilla se cargará automáticamente con todos los eventos

### Interacción con Eventos
1. **Ver detalles**: Hacer clic en cualquier evento para abrir el modal
2. **Análisis de ocupación**: Verificar los porcentajes de color para identificar charlas populares
3. **Navegación**: Desde el modal, usar "Ver Lista de Registrados" para filtrar usuarios

### Modal de Detalles de Charla
El modal que se abre al hacer clic incluye:
- **Información básica**: Título, expositor, fecha, hora, sala
- **Métricas de ocupación**: Progreso visual con colores
- **Análisis de asistentes**: Top empresas, diversidad, etc.
- **Navegación inteligente**: Botón para ir a la lista filtrada de registrados

## 📊 Beneficios para Análisis

### Para Gerentes de Marca
- **Vista panorámica**: Todos los eventos en un solo vistazo
- **Identificación rápida**: Charlas con alta/baja ocupación
- **Análisis temporal**: Distribución por horarios

### Para Organizadores
- **Planificación**: Identificar horarios con mayor demanda
- **Recursos**: Optimizar asignación de salas
- **Seguimiento**: Monitorear el llenado de eventos

### Para Vendors/Proveedores
- **Oportunidades**: Identificar charlas relevantes para networking
- **Competencia**: Analizar popularidad de diferentes temas
- **Estrategia**: Planificar participación en eventos específicos

## 🔧 Características Técnicas

### Rendimiento
- **Carga lazy**: Componente cargado solo cuando se necesita
- **Cache inteligente**: Datos almacenados 5 minutos para optimización
- **Responsive**: Adaptable a diferentes tamaños de pantalla

### Integración
- **API existente**: Usa los mismos endpoints del sistema
- **Filtros**: Soporte para filtrado por fecha (futuro)
- **Exportación**: Compatible con el sistema de exportación

### Navegación
- **Flujo intuitivo**: Desde grilla → modal → lista filtrada
- **Filtros automáticos**: Al navegar se aplican filtros relevantes
- **Breadcrumbs**: Indicadores visuales de filtros activos

## 🎨 Diseño Visual

### Elementos de Diseño
- **Gradientes**: Header con gradiente azul elegante
- **Animaciones**: Efectos suaves al hacer hover y click
- **Iconografía**: Íconos consistentes con el sistema
- **Tipografía**: Jerarquía clara de información

### Accesibilidad
- **Contraste**: Colores que cumplen estándares WCAG
- **Indicadores**: Textos descriptivos para estados
- **Navegación**: Flujo lógico y predecible

## 📱 Compatibilidad

### Navegadores Soportados
- Chrome/Edge (últimas versiones)
- Firefox (últimas versiones)
- Safari (últimas versiones)

### Dispositivos
- **Desktop**: Experiencia completa
- **Tablet**: Layout adaptativo
- **Mobile**: Vista simplificada (horizontal scroll)

## 🔄 Próximas Mejoras

### Funcionalidades Planificadas
- **Filtros por fecha**: Selector de días específicos
- **Vista calendario**: Alternativa a la grilla
- **Notificaciones**: Alertas de cambios en ocupación
- **Comparativas**: Análisis entre diferentes días

### Optimizaciones
- **Carga progresiva**: Lazy loading de eventos
- **Búsqueda**: Filtro de búsqueda en tiempo real
- **Favoritos**: Marcar eventos de interés

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:
1. Verifica que el backend esté ejecutándose
2. Revisa la consola del navegador por errores
3. Intenta refrescar la página o limpiar cache
4. Contacta al equipo de desarrollo

---

**Versión**: 1.0  
**Fecha**: Diciembre 2024  
**Sistema**: ExpoKossodo 2025 Dashboard de Visualización 