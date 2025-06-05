# 🛠️ Panel de Administración - ExpoKossodo 2024

## 📋 Resumen

Se ha implementado un **panel de administración completo** para gestionar toda la información de eventos de ExpoKossodo 2024. El panel permite editar títulos, expositores, países, descripciones en markdown e imágenes de los eventos.

## 🚀 Funcionalidades Implementadas

### ✅ **Dashboard Principal** (`/admin`)
- **Estadísticas en tiempo real**: Total eventos, registros, ocupación y cupos disponibles
- **Navegación por fechas**: Botones para navegar entre los 4 días del evento
- **Vista de grilla**: Organización clara por horarios y salas
- **Indicadores visuales**: Colores según nivel de ocupación de eventos

### ✅ **Gestión de Eventos**
- **Edición completa**: Títulos, expositores, países, descripciones e imágenes
- **Validación en tiempo real**: Campos requeridos y formatos válidos
- **Vista previa markdown**: Renderizado en vivo de descripciones
- **Guardado automático**: Ctrl/Cmd + Enter para guardar rápido

### ✅ **Características Técnicas**
- **API RESTful**: Endpoints específicos para administración
- **Interfaz moderna**: Diseño responsive con Tailwind CSS
- **Animaciones fluidas**: Transiciones con Framer Motion
- **Manejo de errores**: Validaciones robustas y mensajes claros

## 🔗 Acceso al Panel

### **URL de Acceso**
```
http://localhost:3000/admin
```

### **Navegación**
- **Desde el sitio principal**: Agregar `/admin` a la URL
- **Volver al sitio**: Botón "Volver al sitio" en el header del panel

## 🎯 Guía de Uso

### **1. Dashboard Principal**
1. Accede a `http://localhost:3000/admin`
2. Observa las estadísticas generales en las tarjetas superiores
3. Navega entre fechas usando los botones "Día 1", "Día 2", etc.
4. Usa los botones "Anterior" y "Siguiente" para navegación secuencial

### **2. Editar un Evento**
1. Haz clic en cualquier evento en la grilla
2. Se abre el modal de edición con la información actual
3. Modifica los campos necesarios:
   - **Título de la Charla** **(requerido)**
   - **Expositor** **(requerido)**
   - **País** **(requerido)**
   - **URL de la Imagen** (opcional)
   - **Descripción en Markdown** (opcional)

### **3. Vista Previa**
1. En el modal de edición, haz clic en "Vista Previa"
2. Ve el resultado final como aparecerá en el panel de información
3. Verifica que las imágenes cargan correctamente
4. Revisa el formato markdown de la descripción

### **4. Guardar Cambios**
1. Haz clic en "Guardar Cambios" o usa **Ctrl/Cmd + Enter**
2. Los cambios se aplican inmediatamente
3. El modal se cierra automáticamente
4. Los datos se actualizan en la grilla

## 🎨 Indicadores Visuales

### **Niveles de Ocupación**
- 🟢 **Verde**: < 50% ocupación
- 🟡 **Amarillo**: 50-70% ocupación  
- 🟠 **Naranja**: 70-90% ocupación
- 🔴 **Rojo**: > 90% ocupación

### **Iconos de Estado**
- 📝 **Edit3**: Indica que el evento es editable
- 🖼️ **Image**: El evento tiene imagen configurada
- 🌍 **Globe**: Muestra el país del expositor

## 🔧 Características Técnicas

### **Backend - Nuevos Endpoints**

#### **GET** `/api/admin/eventos`
```json
{
  "2024-07-22": [
    {
      "id": 1,
      "fecha": "2024-07-22",
      "hora": "09:00-10:00",
      "sala": "sala1",
      "titulo_charla": "IA en Cardiología",
      "expositor": "Dr. María González",
      "pais": "España",
      "descripcion": "## Introducción\n\nLa IA está...",
      "imagen_url": "https://...",
      "slots_disponibles": 100,
      "slots_ocupados": 45
    }
  ]
}
```

#### **PUT** `/api/admin/evento/<id>`
```json
{
  "titulo_charla": "Nuevo título",
  "expositor": "Dr. Juan Pérez",
  "pais": "México",
  "descripcion": "## Nueva descripción",
  "imagen_url": "https://nueva-imagen.jpg"
}
```

#### **GET** `/api/admin/evento/<id>`
```json
{
  "id": 1,
  "titulo_charla": "IA en Cardiología",
  "expositor": "Dr. María González",
  // ... resto de datos
}
```

### **Frontend - Nuevos Componentes**

#### **AdminDashboard.js**
- Dashboard principal con navegación
- Estadísticas en tiempo real
- Gestión de estados y navegación

#### **AdminEventGrid.js**
- Grilla de eventos organizada por horarios
- Indicadores visuales de ocupación
- Manejo de clicks para edición

#### **EditEventModal.js**
- Modal de edición completo
- Validaciones en tiempo real
- Vista previa de markdown
- Manejo de imágenes

#### **adminService.js**
- Servicios de API para administración
- Validadores específicos
- Utilidades para formateo

## 🛡️ Validaciones

### **Campos Requeridos**
- **Título**: Mínimo 5 caracteres, máximo 200
- **Expositor**: Mínimo 3 caracteres, máximo 100
- **País**: Mínimo 2 caracteres, máximo 50

### **Campos Opcionales**
- **Descripción**: Máximo 5000 caracteres
- **Imagen URL**: Debe ser una URL válida apuntando a imagen

### **Validación de Imágenes**
- Formatos soportados: JPG, JPEG, PNG, GIF, WebP
- URLs de Unsplash automáticamente válidas
- Fallback automático si la imagen no carga

## 📱 Responsive Design

### **Desktop** (> 1024px)
- Grilla completa de 4 salas × 5 horarios
- Modal de edición con vista previa lateral
- Estadísticas en fila de 4 tarjetas

### **Tablet** (768px - 1024px)
- Grilla adaptada con scroll horizontal
- Modal de edición apilado verticalmente
- Estadísticas en grilla 2×2

### **Mobile** (< 768px)
- Vista de lista en lugar de grilla
- Modal de edición de altura completa
- Estadísticas en columna única

## 🎯 Flujo de Trabajo Recomendado

### **Mantenimiento Diario**
1. Acceder al panel al inicio del día
2. Revisar estadísticas de ocupación
3. Actualizar información según necesidades
4. Verificar que todas las imágenes cargan correctamente

### **Actualizaciones de Contenido**
1. Identificar eventos que necesitan actualización
2. Hacer clic en el evento para editarlo
3. Actualizar información necesaria
4. Usar vista previa para verificar cambios
5. Guardar y confirmar actualización

### **Gestión de Imágenes**
1. Usar imágenes de alta calidad (mínimo 800×400px)
2. Preferir URLs de servicios confiables (Unsplash, etc.)
3. Verificar que las imágenes cargan en vista previa
4. Mantener consistencia visual entre eventos

## 🔄 Estados del Sistema

### **Estados de Carga**
- ⏳ **Cargando**: Spinner con mensaje informativo
- ✅ **Exitoso**: Toast verde con confirmación
- ❌ **Error**: Toast rojo con mensaje específico
- 🔄 **Guardando**: Botón deshabilitado con "Guardando..."

### **Estados de Validación**
- ✅ **Válido**: Campo con borde normal
- ❌ **Inválido**: Campo con borde rojo + mensaje de error
- ⚠️ **Advertencia**: Campo con borde amarillo

## 🚀 Funcionalidades Avanzadas

### **Shortcuts de Teclado**
- **Escape**: Cerrar modal sin guardar
- **Ctrl/Cmd + Enter**: Guardar cambios rápido
- **Tab**: Navegación entre campos del formulario

### **Funciones de Búsqueda Visual**
- **Filtro por ocupación**: Colores automáticos según porcentaje
- **Indicador de imagen**: Ícono verde si tiene imagen
- **Información contextual**: Tooltips y ayudas visuales

### **Optimización de Performance**
- **Carga lazy**: Componentes se cargan según necesidad
- **Cache de datos**: Evita peticiones repetitivas
- **Debounce**: En campos de texto para evitar spam de validaciones

## 🎉 ¡Panel Implementado Exitosamente!

El panel de administración está **100% funcional** y listo para usar. Permite gestión completa de eventos sin afectar la funcionalidad existente del sistema de registro.

### **URLs del Sistema**
- **Sitio Principal**: `http://localhost:3000/`
- **Panel Admin**: `http://localhost:3000/admin`
- **API Backend**: `http://localhost:5000/api/`
- **API Admin**: `http://localhost:5000/api/admin/`

---

*Panel de Administración desarrollado para ExpoKossodo 2024*
*Gestión moderna y eficiente de eventos médicos* 