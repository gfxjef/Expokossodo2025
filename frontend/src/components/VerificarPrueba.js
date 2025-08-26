import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRScanner from './QRScanner';
import API_CONFIG from '../config/api.config';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Building2, 
  Mail, 
  Phone,
  Edit2,
  Save,
  X,
  Clock,
  Calendar,
  MapPin,
  ChevronRight,
  RefreshCw,
  Users,
  Activity,
  Camera,
  Wifi
} from 'lucide-react';

const VerificarPrueba = () => {
  
  // Cache de registros para búsqueda rápida
  const [registrosCache, setRegistrosCache] = useState([]);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [lastCacheUpdate, setLastCacheUpdate] = useState(null);
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    confirmados: 0,
    pendientes: 0,
    tiempoPromedio: 0,
    ultimaVerificacion: new Date().toLocaleTimeString()
  });
  
  // Estados y refs para el scanner QR
  const [scannerActive, setScannerActive] = useState(true); // Scanner activo por defecto
  const [scannerLoading, setScannerLoading] = useState(false);
  const processingRef = useRef(false);
  const cooldownTimeoutRef = useRef(null);
  const [lastScannedQR, setLastScannedQR] = useState(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [currentQR, setCurrentQR] = useState(null); // QR actualmente procesado
  
  // Estados para carga de eventos bajo demanda
  const [eventosLoading, setEventosLoading] = useState(false);
  
  // Estados para impresión térmica
  const [thermalStatus, setThermalStatus] = useState('idle'); // 'idle', 'printing', 'success', 'error'
  const [thermalError, setThermalError] = useState(null);
  const [printerStatus, setPrinterStatus] = useState(null);

  // Cargar configuración inicial al montar el componente
  useEffect(() => {
    // Cargar cache de registros
    cargarCacheRegistros();
    // Verificar estado de impresora térmica
    verificarEstadoImpresora();
  }, []);
  
  // Cleanup del timeout al desmontar
  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, []);

  // Actualizar estadísticas cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        ultimaVerificacion: new Date().toLocaleTimeString()
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Función para cargar cache de registros
  const cargarCacheRegistros = async () => {
    setCacheLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/obtener-todos-registros`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setRegistrosCache(data.registros);
        setLastCacheUpdate(Date.now());
        
        // Actualizar estadísticas reales
        const confirmados = data.registros.filter(r => r.asistencia_confirmada).length;
        const pendientes = data.registros.filter(r => !r.asistencia_confirmada).length;
        
        setStats(prev => ({
          ...prev,
          confirmados,
          pendientes,
          ultimaVerificacion: new Date().toLocaleTimeString()
        }));
        
        console.log(`[CACHE] ${data.total} registros cargados en cache`);
      } else {
        console.error('Error cargando cache:', data.error);
      }
    } catch (error) {
      console.error('Error cargando cache:', error);
    } finally {
      setCacheLoading(false);
    }
  };
  
  // Función para buscar en cache primero
  const buscarEnCache = (qrCode) => {
    // Buscar por QR exacto
    const registro = registrosCache.find(r => 
      r.qr_text === qrCode || 
      r.qr_code === qrCode
    );
    
    if (registro) {
      console.log('[CACHE HIT] Usuario encontrado en cache:', registro.nombres);
      return {
        usuario: registro,
        eventos: registro.eventos || [],
        qr_validado: true
      };
    }
    
    console.log('[CACHE MISS] Usuario no encontrado en cache, consultando servidor...');
    return null;
  };

  // Función para manejar el escaneo del QR con prevención de lecturas múltiples
  const handleQRScan = async (qrCode) => {
    // Verificar si ya estamos procesando algo
    if (processingRef.current) {
      console.log('Ya hay un procesamiento en curso, ignorando lectura');
      return;
    }

    // Verificar si el mismo QR está en cooldown
    if (scanCooldown && qrCode === lastScannedQR) {
      console.log('QR en cooldown, ignorando lectura repetida');
      return;
    }

    // Marcar inmediatamente que estamos procesando
    processingRef.current = true;
    setLastScannedQR(qrCode);
    setScanCooldown(true);
    setScannerLoading(true);
    
    // Limpiar timeout anterior si existe
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
    }
    
    // Configurar nuevo timeout para resetear después de 3 segundos
    cooldownTimeoutRef.current = setTimeout(() => {
      setScanCooldown(false);
      setLastScannedQR(null);
      processingRef.current = false;
      setScannerLoading(false);
    }, 3000);

    // Buscar primero en cache
    const cachedData = buscarEnCache(qrCode);
    
    if (cachedData) {
      // Usuario encontrado en cache - respuesta instantánea
      setCurrentQR(qrCode);
      
      // Cargar eventos bajo demanda
      const eventos = await cargarEventosUsuario(cachedData.usuario.id);
      
      const newUserData = {
        ...cachedData,
        qr_original: qrCode,
        eventos: eventos
      };
      setUserData(newUserData);
      
      // Inicializar datos para edición
      if (cachedData.usuario) {
        setEditData({
          nombres: cachedData.usuario.nombres,
          correo: cachedData.usuario.correo,
          empresa: cachedData.usuario.empresa,
          cargo: cachedData.usuario.cargo,
          numero: cachedData.usuario.numero
        });
      }
      
      // Resetear estados de procesamiento más rápido
      setTimeout(() => {
        setScanCooldown(false);
        setLastScannedQR(null);
        processingRef.current = false;
        setScannerLoading(false);
      }, 1000); // Más rápido porque fue desde cache
    } else {
      // No está en cache, hacer consulta al servidor
      await verificarUsuarioConQR(qrCode);
    }
  };

  // Función para cargar eventos de un usuario específico bajo demanda
  const cargarEventosUsuario = async (usuarioId) => {
    if (eventosLoading) return null;
    
    setEventosLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/obtener-eventos-usuario/${usuarioId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        return data.eventos;
      } else {
        console.error('Error cargando eventos:', data.error);
        return [];
      }
    } catch (error) {
      console.error('Error cargando eventos:', error);
      return [];
    } finally {
      setEventosLoading(false);
    }
  };

  // Función mejorada para verificar usuario con QR dinámico
  const verificarUsuarioConQR = async (qrCode) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentQR(qrCode);

    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/buscar-usuario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_code: qrCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error buscando usuario');
      }

      const newUserData = {
        ...data,
        qr_original: qrCode
      };

      setUserData(newUserData);
      setCurrentQR(qrCode); // Guardar el QR escaneado para impresión
      
      // Inicializar datos para edición
      if (data.usuario) {
        setEditData({
          nombres: data.usuario.nombres,
          correo: data.usuario.correo,
          empresa: data.usuario.empresa,
          cargo: data.usuario.cargo,
          numero: data.usuario.numero
        });

        // Cargar eventos bajo demanda si se necesitan para mostrar
        if (data.usuario) {
          const eventos = await cargarEventosUsuario(data.usuario.id);
          newUserData.eventos = eventos;
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const confirmarAsistencia = async () => {
    if (!userData?.usuario?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/confirmar-asistencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registro_id: userData.usuario.id,
          qr_code: userData.qr_original,
          verificado_por: 'Staff-Recepción'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error confirmando asistencia');
      }

      setSuccess('Asistencia confirmada exitosamente');
      
      // Actualizar estado local
      setUserData(prev => ({
        ...prev,
        usuario: {
          ...prev.usuario,
          asistencia_confirmada: true,
          estado_asistencia: 'confirmada'
        }
      }));

      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        confirmados: prev.confirmados + 1,
        pendientes: Math.max(0, prev.pendientes - 1),
        ultimaVerificacion: new Date().toLocaleTimeString()
      }));
      
      // Resetear el scanner para el siguiente escaneo
      setTimeout(() => {
        processingRef.current = false;
        setScanCooldown(false);
      }, 2000);

      // Auto-limpiar después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarCambios = async () => {
    if (!userData?.usuario?.id) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/registros/actualizar-datos`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registro_id: userData.usuario.id,
          qr_code: userData.qr_original,
          ...editData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error actualizando datos');
      }

      // Actualizar datos locales
      setUserData(prev => ({
        ...prev,
        usuario: {
          ...prev.usuario,
          ...data.datos_actualizados
        }
      }));

      setSuccess('Datos actualizados correctamente');
      setEditMode(false);

      // Auto-limpiar mensaje
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Función para verificar estado de impresora térmica
  const verificarEstadoImpresora = async () => {
    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/estado-impresora`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setPrinterStatus(data);
        return data;
      } else {
        setPrinterStatus(null);
        return null;
      }
    } catch (error) {
      console.error('Error verificando impresora:', error);
      setPrinterStatus(null);
      return null;
    }
  };

  // Función para impresión térmica
  const imprimirTermica = async () => {
    if (!userData?.usuario || !currentQR) return;
    
    setThermalStatus('printing');
    setThermalError(null);

    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/imprimir-termica`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_datos: {
            nombres: userData.usuario.nombres,
            empresa: userData.usuario.empresa,
            cargo: userData.usuario.cargo,
            numero: userData.usuario.numero
          },
          qr_text: currentQR,  // USAR EL QR ORIGINAL ESCANEADO, NO GENERAR UNO NUEVO
          mode: 'TSPL'  // Usar comandos TSPL para 4BARCODE
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setThermalStatus('success');
        setSuccess(`Etiqueta enviada a ${data.printer || 'impresora térmica'}`);
        
        // Limpiar estado después de 3 segundos
        setTimeout(() => {
          setThermalStatus('idle');
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error(data.error || 'Error en impresión térmica');
      }

    } catch (error) {
      console.error('Error imprimiendo en térmica:', error);
      setThermalError(error.message);
      setThermalStatus('error');
      setError(`Error térmica: ${error.message}`);
    }
  };

  // Función para imprimir etiqueta de prueba
  const imprimirPruebaTermica = async () => {
    setThermalStatus('printing');
    setThermalError(null);

    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/test-impresora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setThermalStatus('success');
        setSuccess('Etiqueta de prueba enviada correctamente');
        
        setTimeout(() => {
          setThermalStatus('idle');
          setSuccess(null);
        }, 3000);
      } else {
        throw new Error(data.error || 'Error en impresión de prueba');
      }

    } catch (error) {
      console.error('Error en prueba térmica:', error);
      setThermalError(error.message);
      setThermalStatus('error');
      setError(`Error prueba: ${error.message}`);
    }
  };


  const getEstadoBadge = (estado) => {
    const badges = {
      confirmada: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'CONFIRMADO' },
      pendiente: { bg: 'bg-orange-100', text: 'text-orange-800', icon: Clock, label: 'PENDIENTE' },
      presente: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle, label: 'PRESENTE' },
      ausente: { bg: 'bg-gray-100', text: 'text-gray-600', icon: AlertCircle, label: 'AUSENTE' }
    };
    return badges[estado] || badges.pendiente;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* Header con estadísticas */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Activity size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Sistema de Verificación</h1>
                <p className="text-sm text-gray-500">ExpoKossodo 2025 - Entrada Principal</p>
              </div>
            </div>

            {/* Indicador de Scanner y Estadísticas */}
            <div className="flex items-center space-x-6">
              {/* Indicador de estado del scanner */}
              <div className="flex items-center space-x-3 bg-white border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${scannerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <Camera size={16} className={scannerActive ? 'text-green-600' : 'text-gray-400'} />
                  <span className="text-sm font-medium text-gray-700">
                    {scannerActive ? 'Scanner Activo' : 'Scanner Inactivo'}
                  </span>
                </div>
                {scanCooldown && (
                  <div className="flex items-center space-x-1">
                    <Wifi size={14} className="text-orange-500 animate-pulse" />
                    <span className="text-xs text-orange-600">Cooldown</span>
                  </div>
                )}
                {scannerLoading && (
                  <div className="flex items-center space-x-1">
                    <RefreshCw size={14} className="text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-600">Procesando...</span>
                  </div>
                )}
                {currentQR && (
                  <span className="text-xs text-gray-500 font-mono">
                    QR: {currentQR.substring(0, 8)}...
                  </span>
                )}
              </div>

              {/* Indicador del QR escaneado */}
              <div className="flex items-center space-x-3 bg-white border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    currentQR ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  {currentQR ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <AlertCircle size={16} className="text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {currentQR ? 'QR Escaneado' : 'Sin QR'}
                  </span>
                </div>
                {currentQR && (
                  <span className="text-xs text-gray-500 font-mono">
                    {currentQR.substring(0, 8)}...
                  </span>
                )}
              </div>

              {/* Estadísticas en tiempo real */}
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.confirmados}</div>
                <div className="text-xs text-gray-500">Confirmados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
                <div className="text-xs text-gray-500">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{registrosCache.length}</div>
                <div className="text-xs text-gray-500">Total en cache</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{cacheLoading ? '⏳' : '✓'}</div>
                <div className="text-xs text-gray-500">Cache status</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">{stats.ultimaVerificacion}</div>
                <div className="text-xs text-gray-500">Última verificación</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-5xl mx-auto p-6">
        {/* Alertas */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center"
            >
              <XCircle className="text-red-500 mr-3" size={24} />
              <span className="text-red-800 font-medium">{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center"
            >
              <CheckCircle className="text-green-500 mr-3" size={24} />
              <span className="text-green-800 font-medium">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando información...</p>
          </div>
        ) : userData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal - Información del asistente */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tarjeta de información principal */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                {/* Header con estado */}
                <div className={`p-6 ${userData.usuario.estado_asistencia === 'confirmada' ? 'bg-green-50' : 'bg-orange-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-full ${userData.usuario.estado_asistencia === 'confirmada' ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <User size={32} className={userData.usuario.estado_asistencia === 'confirmada' ? 'text-green-600' : 'text-orange-600'} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {editMode ? (
                            <input
                              type="text"
                              value={editData.nombres}
                              onChange={(e) => setEditData({...editData, nombres: e.target.value})}
                              className="border-b-2 border-blue-400 focus:outline-none bg-transparent"
                            />
                          ) : (
                            userData.usuario.nombres
                          )}
                        </h2>
                        <p className="text-gray-600">
                          ID: {userData.usuario.id} | QR: {currentQR ? currentQR.substring(0, 15) + '...' : 'Esperando scan'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Badge de estado */}
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const badge = getEstadoBadge(userData.usuario.estado_asistencia);
                        const Icon = badge.icon;
                        return (
                          <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center ${badge.bg} ${badge.text}`}>
                            <Icon size={18} className="mr-2" />
                            {badge.label}
                          </span>
                        );
                      })()}
                      
                      {!editMode && (
                        <button
                          onClick={() => setEditMode(true)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={20} className="text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalles del asistente */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Building2 className="text-gray-400" size={20} />
                      <div>
                        <p className="text-xs text-gray-500">Empresa</p>
                        {editMode ? (
                          <input
                            type="text"
                            value={editData.empresa}
                            onChange={(e) => setEditData({...editData, empresa: e.target.value})}
                            className="font-medium text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-400 w-full"
                          />
                        ) : (
                          <p className="font-medium text-gray-800">{userData.usuario.empresa}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="text-gray-400" size={20} />
                      <div>
                        <p className="text-xs text-gray-500">Cargo</p>
                        {editMode ? (
                          <input
                            type="text"
                            value={editData.cargo}
                            onChange={(e) => setEditData({...editData, cargo: e.target.value})}
                            className="font-medium text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-400 w-full"
                          />
                        ) : (
                          <p className="font-medium text-gray-800">{userData.usuario.cargo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Mail className="text-gray-400" size={20} />
                      <div>
                        <p className="text-xs text-gray-500">Correo</p>
                        {editMode ? (
                          <input
                            type="email"
                            value={editData.correo}
                            onChange={(e) => setEditData({...editData, correo: e.target.value})}
                            className="font-medium text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-400 w-full"
                          />
                        ) : (
                          <p className="font-medium text-gray-800">{userData.usuario.correo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="text-gray-400" size={20} />
                      <div>
                        <p className="text-xs text-gray-500">Teléfono</p>
                        {editMode ? (
                          <input
                            type="tel"
                            value={editData.numero}
                            onChange={(e) => setEditData({...editData, numero: e.target.value})}
                            className="font-medium text-gray-800 border-b border-gray-300 focus:outline-none focus:border-blue-400 w-full"
                          />
                        ) : (
                          <p className="font-medium text-gray-800">{userData.usuario.numero}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción para edición */}
                  {editMode && (
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditData({
                            nombres: userData.usuario.nombres,
                            correo: userData.usuario.correo,
                            empresa: userData.usuario.empresa,
                            cargo: userData.usuario.cargo,
                            numero: userData.usuario.numero
                          });
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={saving}
                      >
                        <X size={20} className="inline mr-2" />
                        Cancelar
                      </button>
                      <button
                        onClick={guardarCambios}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <RefreshCw size={20} className="mr-2 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save size={20} className="mr-2" />
                            Guardar cambios
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Lista de eventos */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Eventos Registrados ({userData.eventos?.length || 0})
                </h3>
                
                {userData.eventos && userData.eventos.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {userData.eventos.map((evento, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 mb-1">{evento.titulo_charla}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <span className="flex items-center">
                                <Calendar size={14} className="mr-1" />
                                {new Date(evento.fecha).toLocaleDateString('es-ES')}
                              </span>
                              <span className="flex items-center">
                                <Clock size={14} className="mr-1" />
                                {evento.hora}
                              </span>
                              <span className="flex items-center">
                                <MapPin size={14} className="mr-1" />
                                {evento.sala}
                              </span>
                              <span className="flex items-center">
                                <User size={14} className="mr-1" />
                                {evento.expositor} ({evento.pais})
                              </span>
                            </div>
                          </div>
                          <div>
                            {(() => {
                              const badge = getEstadoBadge(evento.estado_sala);
                              const Icon = badge.icon;
                              return (
                                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${badge.bg} ${badge.text}`}>
                                  <Icon size={14} className="mr-1" />
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hay eventos registrados para este usuario.
                  </p>
                )}
              </motion.div>
            </div>

            {/* Columna lateral - Acciones rápidas */}
            <div className="space-y-6">
              {/* Panel de acciones principales */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">Acciones Rápidas</h3>
                
                <div className="space-y-3">
                  {userData.usuario.estado_asistencia !== 'confirmada' ? (
                    <button
                      onClick={confirmarAsistencia}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center"
                    >
                      {loading ? (
                        <RefreshCw size={24} className="animate-spin" />
                      ) : (
                        <>
                          <CheckCircle size={24} className="mr-2" />
                          CONFIRMAR ASISTENCIA
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
                      <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                      <p className="text-green-800 font-bold">Asistencia Confirmada</p>
                      <p className="text-green-600 text-sm mt-1">
                        {new Date().toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}

                  {currentQR && (
                    <button
                      onClick={() => verificarUsuarioConQR(currentQR)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <RefreshCw size={20} className="mr-2" />
                      Recargar Datos
                    </button>
                  )}
                  

                  <button
                    onClick={() => {
                      setUserData(null);
                      setError(null);
                      setSuccess(null);
                      setCurrentQR(null);
                      // Resetear scanner para estar listo para el siguiente
                      processingRef.current = false;
                      setScanCooldown(false);
                      setLastScannedQR(null);
                      setScannerLoading(false);
                      // Limpiar estados de impresión térmica
                      setThermalStatus('idle');
                      setThermalError(null);
                    }}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <ChevronRight size={20} className="mr-2" />
                    Siguiente Asistente
                  </button>
                  
                  {/* Botón de impresión térmica */}
                  <button
                    onClick={imprimirTermica}
                    disabled={!userData || !currentQR || thermalStatus === 'printing'}
                    className={`w-full font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center text-sm mb-2 ${
                      thermalStatus === 'success' 
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : thermalStatus === 'printing'
                        ? 'bg-yellow-500 text-white cursor-not-allowed animate-pulse'
                        : thermalStatus === 'error'
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : currentQR
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-400 text-white cursor-not-allowed'
                    }`}
                  >
                    {thermalStatus === 'printing' ? (
                      <>
                        <RefreshCw size={18} className="mr-2 animate-spin" />
                        Imprimiendo Etiqueta...
                      </>
                    ) : thermalStatus === 'success' ? (
                      <>
                        <CheckCircle size={18} className="mr-2" />
                        Etiqueta Impresa
                      </>
                    ) : thermalStatus === 'error' ? (
                      <>
                        <XCircle size={18} className="mr-2" />
                        Error Impresión
                      </>
                    ) : (
                      <>
                        <Activity size={18} className="mr-2" />
                        🖨️ Impresión Térmica (50x50mm)
                      </>
                    )}
                  </button>

                </div>
              </motion.div>

              {/* Resumen de estadísticas del usuario */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-4">Resumen del Asistente</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Total Eventos</span>
                    <span className="font-bold text-blue-600">{userData.eventos?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Asistencias</span>
                    <span className="font-bold text-green-600">
                      {userData.eventos?.filter(e => e.estado_sala === 'presente').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Pendientes</span>
                    <span className="font-bold text-orange-600">
                      {userData.eventos?.filter(e => e.estado_sala === 'ausente').length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Fecha Registro</span>
                    <span className="font-medium text-gray-800">
                      {userData.usuario.fecha_registro ? 
                        new Date(userData.usuario.fecha_registro).toLocaleDateString('es-ES') : 
                        'N/A'}
                    </span>
                  </div>
                </div>
              </motion.div>


              {/* Botón discreto para actualizar cache */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <button
                  onClick={cargarCacheRegistros}
                  disabled={cacheLoading}
                  className="text-xs bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-3 py-1 rounded-lg transition-colors"
                >
                  {cacheLoading ? (
                    <>🔄 Actualizando...</>
                  ) : (
                    <>📊 Actualizar Cache ({registrosCache.length})</>
                  )}
                </button>
              </motion.div>

              {/* Panel de ayuda rápida */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-blue-50 rounded-xl p-4 border border-blue-200"
              >
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                  <AlertCircle size={16} className="mr-2" />
                  Información del Sistema
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• QR de prueba activo</li>
                  <li>• Modo de verificación: Manual</li>
                  <li>• Punto de acceso: Entrada Principal</li>
                  <li>• Staff: Recepción</li>
                  <li>• Etiquetas: 50x50mm / 203 DPI</li>
                </ul>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda - Scanner QR */}
            <div className="space-y-6">
              {/* Scanner QR visible */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <Camera className="mr-2" size={24} />
                  Escanear Código QR
                </h3>
                <div className="w-full">
                  <QRScanner 
                    onScanSuccess={handleQRScan}
                    onScanError={(error) => setError(`Error de escáner: ${error.message}`)}
                    isActive={scannerActive}
                  />
                </div>
                
                {/* Indicadores de estado del scanner */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        scannerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`} />
                      <span className={scannerActive ? 'text-green-700' : 'text-gray-500'}>
                        {scannerActive ? 'Cámara activa' : 'Cámara inactiva'}
                      </span>
                    </div>
                    
                    {scanCooldown && (
                      <div className="flex items-center space-x-1 text-orange-600">
                        <Wifi size={14} className="animate-pulse" />
                        <span>Cooldown 3s</span>
                      </div>
                    )}
                    
                    {scannerLoading && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Procesando...</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Columna derecha - Instrucción */}
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg p-8 text-center"
              >
                <div className="text-6xl mb-4">👤</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Esperando escaneo de código QR
                </h3>
                <p className="text-gray-500 mb-4">
                  Coloca el código QR del asistente frente a la cámara para comenzar la verificación.
                </p>
                <div className="text-sm text-gray-400">
                  <p>• Asegúrate de tener buena iluminación</p>
                  <p>• Mantén el QR centrado en la cámara</p>
                  <p>• Espera 3 segundos entre escaneos</p>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificarPrueba;