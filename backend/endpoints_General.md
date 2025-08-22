
# Documentación de Endpoints de la API

Este documento detalla todos los endpoints disponibles en la API del sistema de registro.

---

## Autenticación y Configuración

### `GET /api/test-db`
- **Descripción:** Endpoint de prueba para verificar el estado de la conexión con la base de datos.
- **Métodos:** `GET`
- **Respuesta Exitosa (200):**
  ```json
  {
    "status": "success",
    "message": "Database connection successful."
  }
  ```
- **Respuesta de Error (500):**
  ```json
  {
    "status": "error",
    "message": "<descripción del error>"
  }
  ```

### `GET, POST /api/config`
- **Descripción:** Gestiona las configuraciones generales del sistema. Permite obtener todas las configuraciones o establecer un nuevo par clave-valor.
- **Métodos:** `GET`, `POST`
- **Body (POST):**
  ```json
  {
    "key": "nombreDeLaConfiguracion",
    "value": "valorDeLaConfiguracion"
  }
  ```
- **Respuesta Exitosa (200/201):**
  - `GET`:
    ```json
    {
      "key1": "value1",
      "key2": "value2"
    }
    ```
  - `POST`:
    ```json
    {
      "message": "Configuración <key> guardada."
    }
    ```
- **Respuesta de Error (400):**
  ```json
  {
    "error": "Se requieren clave y valor"
  }
  ```

---

## Charlas

### `GET /api/charlas`
- **Descripción:** Obtiene una lista de todas las charlas disponibles, ordenadas por su horario de inicio. Incluye el número de cupos disponibles para cada una.
- **Métodos:** `GET`
- **Respuesta Exitosa (200):**
  ```json
  [
    {
      "id": 1,
      "nombre": "Charla de Ejemplo",
      "disertante": "John Doe",
      "horario_inicio": "2025-08-11T09:00:00",
      "horario_fin": "2025-08-11T10:00:00",
      "cupo": 100,
      "cupos_disponibles": 85,
      "sala": "Sala A",
      "slug": "charla-de-ejemplo"
    }
  ]
  ```

### `GET /api/charlas/<string:slug>`
- **Descripción:** Obtiene los detalles de una charla específica a través de su `slug`.
- **Métodos:** `GET`
- **Parámetros de URL:**
  - `slug`: El identificador único (slug) de la charla.
- **Respuesta Exitosa (200):**
  ```json
  {
    "id": 1,
    "nombre": "Charla de Ejemplo",
    "disertante": "John Doe",
    "horario_inicio": "2025-08-11T09:00:00",
    "horario_fin": "2025-08-11T10:00:00",
    "cupo": 100,
    "cupos_disponibles": 85,
    "sala": "Sala A",
    "slug": "charla-de-ejemplo"
  }
  ```
- **Respuesta de Error (404):**
  ```json
  {
    "error": "Charla no encontrada"
  }
  ```

---

## Registro de Participantes

### `POST /api/registro`
- **Descripción:** Registra un nuevo participante en el evento. El email debe ser único.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "nombre": "Jane Doe",
    "email": "jane.doe@example.com",
    "telefono": "0981123456",
    "empresa": "Empresa Ejemplo",
    "cargo": "Developer",
    "rubro": "Tecnología",
    "post_feria": "opcion1",
    "charlas": [1, 2]
  }
  ```
- **Respuesta Exitosa (201):**
  ```json
  {
    "id": 123,
    "message": "Registro exitoso"
  }
  ```
- **Respuesta de Error (400, 409):**
  - Email duplicado: `{"error": "Este email ya ha sido registrado."}`
  - Datos faltantes: `{"error": "El email es obligatorio"}`

### `POST /api/registro-charla-directo`
- **Descripción:** Permite a un usuario registrarse directamente en una charla específica. Si el usuario no existe, se crea; si ya existe, solo se le inscribe en la charla.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "nombre": "Jane Doe",
    "email": "jane.doe@example.com",
    "telefono": "0981123456",
    "charla_id": 1
  }
  ```
- **Respuesta Exitosa (201):**
  ```json
  {
    "id": 123,
    "message": "Registro a la charla exitoso"
  }
  ```
- **Respuesta de Error (400, 404, 409):**
  - Charla sin cupo: `{"error": "No hay cupos disponibles para esta charla."}`
  - Usuario ya registrado: `{"error": "Ya estás registrado en esta charla."}`

### `GET /api/registros`
- **Descripción:** Obtiene una lista paginada de todos los participantes registrados.
- **Métodos:** `GET`
- **Parámetros de Query:**
  - `page` (opcional): Número de página (default: 1).
  - `per_page` (opcional): Resultados por página (default: 10).
- **Respuesta Exitosa (200):**
  ```json
  {
    "registros": [
      {
        "id": 1,
        "nombre": "Jane Doe",
        "email": "jane.doe@example.com",
        "charlas": [{"id": 1, "nombre": "Charla 1", "confirmado": false}]
      }
    ],
    "total": 100,
    "page": 1,
    "per_page": 10,
    "total_pages": 10
  }
  ```

---

## Verificación y QR

### `GET /api/qr/<int:registro_id>`
- **Descripción:** Genera y devuelve una imagen de código QR para un participante específico.
- **Métodos:** `GET`
- **Parámetros de URL:**
  - `registro_id`: El ID del participante.
- **Respuesta Exitosa (200):** Una imagen PNG con el código QR.
- **Respuesta de Error (404, 500):**
  - Registro no encontrado.
  - Error al generar el QR.

### `POST /api/verificar`
- **Descripción:** Verifica un código QR para confirmar la asistencia general de un participante al evento.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "data": "{"id": 1, "nombre": "Jane Doe", "email": "jane.doe@example.com"}"
  }
  ```
- **Respuesta Exitosa (200):**
  ```json
  {
    "id": 1,
    "nombre": "Jane Doe",
    "email": "jane.doe@example.com",
    "confirmacion_asistencia": true,
    "charlas": [{"id": 1, "nombre": "Charla 1", "sala": "A", "horario_inicio": "...", "confirmado": false}]
  }
  ```
- **Respuesta de Error (400, 404):**
  - QR inválido: `{"error": "Código QR inválido o malformado."}`
  - Registro no encontrado: `{"error": "Registro no encontrado."}`

### `POST /api/confirmar-charla`
- **Descripción:** Confirma la asistencia de un participante a una charla específica.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "registro_id": 1,
    "charla_id": 2
  }
  ```
- **Respuesta Exitosa (200):**
  ```json
  {
    "message": "Confirmación de asistencia a la charla exitosa."
  }
  ```
- **Respuesta de Error (400, 404):**
  - Datos faltantes: `{"error": "Faltan datos para la confirmación."}`
  - Inscripción no encontrada: `{"error": "El usuario no está registrado en esta charla."}`

### `POST /api/verificar-sala`
- **Descripción:** Endpoint específico para verificar el acceso de un usuario a una sala de charla mediante QR. Confirma la asistencia si el usuario está inscrito y no había confirmado antes.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "data": "{"id": 1, ...}",
    "charla_slug": "nombre-de-la-charla"
  }
  ```
- **Respuesta Exitosa (200):**
  ```json
  {
    "status": "success",
    "message": "Acceso confirmado para Jane Doe a la charla 'Charla de Ejemplo'.",
    "nombre_usuario": "Jane Doe",
    "nombre_charla": "Charla de Ejemplo",
    "timestamp_confirmacion": "..."
  }
  ```
- **Respuesta de Advertencia (208):**
  ```json
  {
    "status": "warning",
    "message": "La asistencia de Jane Doe a esta charla ya fue confirmada."
  }
  ```
- **Respuesta de Error (403, 404):**
  - No inscrito: `{"status": "error", "message": "Jane Doe no está inscripto en esta charla."}`
  - Usuario/Charla no encontrados.

---

## Panel de Administración

### `GET, POST /api/admin/charlas`
- **Descripción:** Gestiona las charlas. `GET` para listar todas, `POST` para crear una nueva.
- **Métodos:** `GET`, `POST`
- **Respuesta (GET):** Lista de todas las charlas con detalles administrativos.
- **Body (POST):**
  ```json
  {
    "nombre": "Nueva Charla",
    "disertante": "Admin",
    "horario_inicio": "2025-08-12T10:00:00",
    "horario_fin": "2025-08-12T11:00:00",
    "cupo": 50,
    "sala": "Sala C",
    "slug": "nueva-charla"
  }
  ```
- **Respuesta (POST):** `{"id": 10, "message": "Charla creada exitosamente"}`

### `PUT, DELETE /api/admin/charlas/<int:id>`
- **Descripción:** Actualiza (`PUT`) o elimina (`DELETE`) una charla específica.
- **Métodos:** `PUT`, `DELETE`
- **Body (PUT):** Objeto con los campos a actualizar.
- **Respuesta:** Mensaje de confirmación.

### `GET /api/admin/registros/all`
- **Descripción:** Obtiene una lista completa de todos los registros sin paginación. Permite búsqueda por nombre, email o empresa.
- **Métodos:** `GET`
- **Parámetros de Query:**
  - `search` (opcional): Término de búsqueda.
- **Respuesta:** Lista de objetos de registro con detalles completos.

### `PUT, DELETE /api/admin/registros/<int:id>`
- **Descripción:** Actualiza (`PUT`) o elimina (`DELETE`) un registro de participante.
- **Métodos:** `PUT`, `DELETE`
- **Body (PUT):** Objeto con los campos a actualizar.
- **Respuesta:** Mensaje de confirmación.

### `POST /api/admin/cancelar-confirmacion-charla`
- **Descripción:** Cancela/revierte la confirmación de asistencia de un usuario a una charla.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "registro_id": 1,
    "charla_id": 2
  }
  ```
- **Respuesta:** `{"message": "Se ha cancelado la confirmación de asistencia a la charla."}`

---

## Estadísticas

### `GET /api/stats`
- **Descripción:** Obtiene estadísticas básicas del evento.
- **Métodos:** `GET`
- **Respuesta:**
  ```json
  {
    "total_registros": 150,
    "total_asistentes": 100,
    "registros_por_dia": [{"date": "2025-08-10", "count": 50}],
    "registros_por_charla": [{"charla": "Charla 1", "registros": 75}],
    "confirmados_por_charla": [{"charla": "Charla 1", "confirmados": 50}]
  }
  ```

### `GET /api/admin/stats/avanzadas`
- **Descripción:** Proporciona un conjunto de métricas y estadísticas avanzadas para el análisis del evento.
- **Métodos:** `GET`
- **Respuesta:**
  ```json
  {
    "total_registros": 150,
    "total_asistentes_evento": 100,
    "tasa_asistencia_general": 66.67,
    "distribucion_registros_por_dia": [...],
    "top_5_rubros": [...],
    "estadisticas_por_charla": [...],
    "checkin_por_hora_en_charlas": [...]
  }
  ```

---

## Asesores y Marcas

### `POST /api/asesores/registro`
- **Descripción:** Registra un nuevo asesor.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "nombre": "Asesor Uno",
    "email": "asesor@example.com",
    "telefono": "0991123456",
    "empresa": "Marca Corp",
    "cargo": "Asesor de Ventas"
  }
  ```
- **Respuesta:** `{"id": 1, "message": "Asesor registrado exitosamente"}`

### `GET, POST /api/marcas`
- **Descripción:** Gestiona las marcas. `GET` para listar, `POST` para crear una nueva.
- **Métodos:** `GET`, `POST`
- **Respuesta (GET):** `[{"id": 1, "nombre": "Marca Ejemplo"}]`
- **Body (POST):** `{"nombre": "Nueva Marca"}`
- **Respuesta (POST):** `{"id": 2, "nombre": "Nueva Marca"}`

### `POST /api/asesores/asignar-marca`
- **Descripción:** Asigna una marca a un asesor.
- **Métodos:** `POST`
- **Body:**
  ```json
  {
    "asesor_id": 1,
    "marca_id": 2
  }
  ```
- **Respuesta:** `{"message": "Marca asignada correctamente"}`

### `GET /api/asesores/dashboard`
- **Descripción:** Obtiene un resumen de los asesores y las marcas que tienen asignadas.
- **Métodos:** `GET`
- **Respuesta:**
  ```json
  [
    {
      "id": 1,
      "nombre": "Asesor Uno",
      "email": "asesor@example.com",
      "empresa": "Marca Corp",
      "marcas": ["Marca Ejemplo", "Nueva Marca"]
    }
  ]
  ```

### `GET /api/asesores/charlas-por-usuario`
- **Descripción:** Obtiene la lista de charlas a las que se ha inscrito un usuario, buscado por su email.
- **Métodos:** `GET`
- **Parámetros de Query:**
  - `email`: El email del usuario a buscar.
- **Respuesta:**
  ```json
  {
    "id": 123,
    "nombre": "Jane Doe",
    "email": "jane.doe@example.com",
    "charlas": [...]
  }
  ```
