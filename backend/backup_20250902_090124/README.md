# Backup de Base de Datos - ExpoKossodo 2025

## Información del Backup

- **Fecha y Hora**: 2025-09-02 09:01:31
- **Base de Datos**: atusalud_kossomet
- **Host**: to1.fcomet.com
- **Tablas Respaldadas**: 6
- **Total de Registros**: 4,133
- **Tamaño Total**: 2.76 MB

## Tablas Incluidas

- expokossodo_registros
- expokossodo_registro_eventos
- expokossodo_eventos
- expokossodo_asistencias_generales
- expokossodo_asistencias_por_sala
- expokossodo_qr_registros
- expokossodo_fecha_info
- expokossodo_marcas
- expokossodo_asesores
- expokossodo_asesor_marcas
- expokossodo_leads
- fb_leads


## Archivos Generados

Para cada tabla se generaron 3 archivos:
- `[tabla]_structure.sql`: Estructura de la tabla (CREATE TABLE)
- `[tabla]_data.sql`: Datos en formato INSERT
- `[tabla]_data.json`: Datos en formato JSON

## Cómo Restaurar

### Opción 1: Script Automático
```bash
python restaurar_backup.py
```

### Opción 2: MySQL Manual
```bash
mysql -h to1.fcomet.com -u atusalud_atusalud -p atusalud_kossomet < [tabla]_structure.sql
mysql -h to1.fcomet.com -u atusalud_atusalud -p atusalud_kossomet < [tabla]_data.sql
```

### Opción 3: Importar JSON (requiere script personalizado)
Los archivos JSON pueden ser procesados con un script Python para reimportar los datos.

## Notas Importantes

1. **Antes de restaurar**: Haga un backup de los datos actuales
2. **Orden de restauración**: Primero estructura, luego datos
3. **Integridad referencial**: Desactive foreign keys durante la restauración si es necesario
4. **Verificación**: Después de restaurar, verifique la integridad de los datos

## Errores Durante el Backup

Se encontraron los siguientes errores:

- expokossodo_eventos: Object of type date is not JSON serializable
- expokossodo_fecha_info: Object of type date is not JSON serializable
