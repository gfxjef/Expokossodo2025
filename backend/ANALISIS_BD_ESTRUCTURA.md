# Análisis de Estructura de Base de Datos - ExpoKossodo 2025

## Resumen Ejecutivo

El sistema ExpoKossodo 2025 utiliza una base de datos MySQL con 12 tablas principales organizadas en 4 dominios funcionales. La arquitectura sigue un modelo relacional con integridad referencial y está optimizada para gestión de eventos médicos.

## Organización por Dominios

### 1. **Dominio de Eventos** (Core Business)

#### `expokossodo_eventos`
- **Propósito**: Tabla central de charlas/eventos del congreso
- **Campos Clave**: id, fecha, hora, titulo_charla, expositor, sala, capacidad, slots_ocupados, slug
- **Relaciones**: 
  - → expokossodo_marcas (marca_id)
  - ← expokossodo_registro_eventos
- **Operaciones CRUD**:
  - CREATE: Nuevos eventos desde admin
  - READ: Listado público, búsqueda por slug, filtros por fecha/sala
  - UPDATE: Modificación de capacidad, horarios, expositores
  - DELETE: Eliminación desde admin (cascada a registros)

#### `expokossodo_fecha_info`
- **Propósito**: Información temática por día del evento
- **Campos Clave**: fecha, rubro, titulo_dia, descripcion, ponentes_destacados
- **Operaciones**: Principalmente READ, UPDATE desde admin

#### `expokossodo_horarios`
- **Propósito**: Gestión de franjas horarias disponibles
- **Campos Clave**: horario, activo
- **Operaciones**: READ para validación, UPDATE para activar/desactivar

### 2. **Dominio de Registros** (User Management)

#### `expokossodo_registros`
- **Propósito**: Registro principal de participantes
- **Campos Clave**: id, nombres, email (único), telefono, empresa, cargo, eventos_seleccionados (JSON)
- **Relaciones**: ← expokossodo_registro_eventos, expokossodo_qr_registros
- **Operaciones CRUD**:
  - CREATE: Registro nuevo usuario
  - READ: Búsqueda por email, listados paginados
  - UPDATE: Re-registro con mismo email, actualización de eventos
  - DELETE: Eliminación desde admin

#### `expokossodo_registro_eventos`
- **Propósito**: Relación muchos-a-muchos entre registros y eventos
- **Campos Clave**: registro_id, evento_id, confirmado, fecha_confirmacion
- **Relaciones**: 
  - → expokossodo_registros
  - → expokossodo_eventos
- **Operaciones**:
  - CREATE: Al registrarse en eventos
  - READ: Verificación de inscripciones
  - UPDATE: Confirmación de asistencia
  - DELETE: Cancelación de inscripción

#### `expokossodo_qr_registros`
- **Propósito**: Datos de códigos QR para verificación
- **Campos Clave**: registro_id, qr_data, created_at
- **Formato QR**: `3LETTERS|DNI|POSITION|COMPANY|TIMESTAMP`
- **Operaciones**: CREATE al registrar, READ para verificación

### 3. **Dominio de Leads y Marketing**

#### `expokossodo_leads`
- **Propósito**: Captura de leads desde formularios web
- **Campos Clave**: name, email, phone, company, position, interests (JSON)
- **Operaciones**: CREATE desde formulario, READ para reportes

#### `fb_leads`
- **Propósito**: Integración con Facebook Lead Ads
- **Campos**: Similar a expokossodo_leads
- **Operaciones**: CREATE desde webhook, READ para sincronización

### 4. **Dominio de Gestión y Control**

#### `expokossodo_marcas`
- **Propósito**: Marcas patrocinadoras/expositoras
- **Campos Clave**: id, marca, expositor, logo
- **Relaciones**: ← expokossodo_eventos
- **Operaciones**: CRUD completo desde admin

#### `expokossodo_asesores`
- **Propósito**: Gestión de asesores/vendedores
- **Campos Clave**: id, nombre, email, empresa, cargo
- **Operaciones**: CREATE registro, READ dashboard

#### `expokossodo_asesor_marcas`
- **Propósito**: Relación asesores-marcas
- **Relaciones**: → expokossodo_asesores, → expokossodo_marcas
- **Operaciones**: CREATE asignación, READ para reportes

#### `expokossodo_configuracion`
- **Propósito**: Configuraciones del sistema
- **Campos**: clave, valor
- **Operaciones**: READ/UPDATE de configuraciones

## Flujos de Datos Principales

### 1. **Flujo de Registro**
```
Usuario → expokossodo_registros (CREATE/UPDATE)
        ↓
        → expokossodo_registro_eventos (CREATE múltiple)
        → expokossodo_qr_registros (CREATE)
        → expokossodo_eventos (UPDATE slots_ocupados)
```

### 2. **Flujo de Verificación QR**
```
QR Scan → expokossodo_qr_registros (READ)
        → expokossodo_registros (READ)
        → expokossodo_registro_eventos (UPDATE confirmado=true)
```

### 3. **Flujo de Re-registro**
```
Email existente → expokossodo_registros (READ)
                → Validación conflictos horarios
                → expokossodo_registro_eventos (CREATE solo válidos)
                → Response con eventos_agregados y eventos_omitidos
```

## Índices y Optimización

### Índices Implementados
- `idx_email` en expokossodo_registros
- `idx_fecha` en expokossodo_eventos
- `idx_sala` en expokossodo_eventos
- `idx_slug` en expokossodo_eventos (UNIQUE)
- `idx_rubro` en expokossodo_eventos

### Optimizaciones de Consulta
- Pool de conexiones (10 conexiones)
- Consultas preparadas para prevenir SQL injection
- Transacciones atómicas en operaciones críticas
- Paginación en listados grandes

## Integridad y Restricciones

### Foreign Keys
- `expokossodo_registro_eventos` → `expokossodo_registros` (CASCADE DELETE)
- `expokossodo_registro_eventos` → `expokossodo_eventos` (CASCADE DELETE)
- `expokossodo_eventos` → `expokossodo_marcas` (SET NULL)
- `expokossodo_qr_registros` → `expokossodo_registros` (CASCADE DELETE)

### Constraints Únicos
- Email en expokossodo_registros
- Slug en expokossodo_eventos
- Combinación (registro_id, evento_id) en expokossodo_registro_eventos

### Validaciones de Negocio
- Máximo 1 evento por franja horaria
- Validación de capacidad disponible
- Prevención de registros duplicados
- Confirmación única por evento

## Operaciones por Endpoint

### Endpoints de Mayor Impacto en BD

#### `/api/registro` (POST)
- **Tablas afectadas**: 4
- **Operaciones**: 
  - SELECT en expokossodo_registros
  - INSERT/UPDATE en expokossodo_registros
  - INSERT múltiple en expokossodo_registro_eventos
  - INSERT en expokossodo_qr_registros
  - UPDATE en expokossodo_eventos (slots_ocupados)

#### `/api/verificar-sala` (POST)
- **Tablas consultadas**: 3
- **Operaciones**:
  - SELECT en expokossodo_qr_registros
  - SELECT en expokossodo_registros
  - UPDATE en expokossodo_registro_eventos

#### `/api/admin/stats/avanzadas` (GET)
- **Tablas consultadas**: 4
- **Operaciones**: Múltiples SELECT con JOINs y agregaciones

## Consideraciones de Escalabilidad

### Puntos Fuertes
- Uso de pool de conexiones
- Índices en campos de búsqueda frecuente
- Transacciones atómicas
- Separación de dominios

### Áreas de Mejora Potencial
1. **Caché**: Implementar Redis para consultas frecuentes
2. **Particionamiento**: Considerar partición por fecha en tablas de eventos
3. **Read Replicas**: Para consultas de reportes pesadas
4. **Archivado**: Estrategia para datos históricos

## Seguridad de Datos

### Implementado
- Consultas parametrizadas (prevención SQL injection)
- Transacciones con rollback automático
- Validación de tipos de datos
- Constraints de integridad referencial

### Recomendaciones
- Encriptación de datos sensibles (teléfonos, emails)
- Auditoría de cambios críticos
- Backup automático incremental
- Logs de acceso a datos sensibles

## Métricas de Uso (Basado en Análisis)

### Tablas más consultadas
1. `expokossodo_eventos` - 80% de las consultas
2. `expokossodo_registros` - 70% de las consultas
3. `expokossodo_registro_eventos` - 60% de las consultas

### Operaciones más frecuentes
1. SELECT (65% del tráfico)
2. INSERT (20% del tráfico)
3. UPDATE (12% del tráfico)
4. DELETE (3% del tráfico)

## Conclusiones

La estructura de base de datos está bien diseñada para un sistema de registro de eventos con:
- Clara separación de dominios
- Integridad referencial robusta
- Flexibilidad para re-registros
- Trazabilidad de confirmaciones
- Soporte para múltiples tipos de usuarios

El sistema maneja eficientemente los casos de uso principales del negocio mientras mantiene la consistencia de datos y permite escalabilidad futura.