# Configuración para Producción

## Frontend (Vercel)

### Variables de Entorno

En el dashboard de Vercel, configura las siguientes variables de entorno:

```
REACT_APP_API_URL=https://expokossodo2025-backend.onrender.com/api
```

### Pasos en Vercel:

1. Ve a tu proyecto en Vercel
2. Click en "Settings"
3. Ve a "Environment Variables"
4. Agrega la variable:
   - Key: `REACT_APP_API_URL`
   - Value: `https://expokossodo2025-backend.onrender.com/api`
   - Environment: Production, Preview, Development
5. Click en "Save"
6. Redespliega tu aplicación

## Backend (Render)

El backend ya está configurado correctamente con CORS para aceptar solicitudes desde:
- `https://expokossodo2025.vercel.app`
- Cualquier subdominio de `*.vercel.app`
- `localhost:3000` y `localhost:3001` para desarrollo
- Cualquier subdominio de `*.ngrok-free.app` y `*.ngrok.io` para pruebas con ngrok

### Variables de Entorno en Render:

Asegúrate de tener configuradas:
- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `OPENAI_API_KEY` (si usas el chat)
- `OPENAI_ASSISTANT_ID` (si usas el chat)

## Solución de Problemas

### Error CORS

Si sigues teniendo errores de CORS:

1. Verifica que la URL del backend esté correcta
2. Asegúrate de que el backend esté corriendo
3. Revisa los logs del backend en Render
4. Verifica que las variables de entorno estén configuradas en Vercel

### Error 404

Si obtienes error 404:

1. Verifica que estés usando las rutas correctas con el prefijo `/api`
2. Asegúrate de que el backend esté desplegado correctamente
3. Revisa que las rutas en el frontend coincidan con las del backend

## Testing

Para verificar que todo funciona:

1. Abre la consola del navegador
2. Ve a la aplicación en `https://expokossodo2025.vercel.app`
3. Verifica que no haya errores CORS
4. Prueba navegar al panel de admin

## Uso con ngrok

Si estás usando ngrok para compartir tu aplicación local:

1. El frontend detectará automáticamente que está ejecutándose en ngrok
2. Se agregarán los headers necesarios (`ngrok-skip-browser-warning`)
3. El backend aceptará peticiones desde dominios de ngrok

### Para iniciar con ngrok:

```bash
# En una terminal, inicia el frontend
cd frontend
npm start

# En otra terminal, expón el puerto con ngrok
ngrok http 3000
```

## Comandos Útiles

### Verificar las variables de entorno en el frontend:

```javascript
console.log('API URL:', process.env.REACT_APP_API_URL);
```

### Verificar CORS en el backend:

```bash
curl -H "Origin: https://expokossodo2025.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://expokossodo2025-backend.onrender.com/api/admin/eventos \
     -v
```

### Verificar CORS con ngrok:

```bash
curl -H "Origin: https://tu-dominio.ngrok-free.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With,ngrok-skip-browser-warning" \
     -X OPTIONS \
     https://expokossodo2025-backend.onrender.com/api/admin/eventos \
     -v
``` 