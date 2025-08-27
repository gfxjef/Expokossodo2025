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
  Briefcase,
  MessageSquare,
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
  Wifi,
  Keyboard,
  ToggleLeft,
  ToggleRight,
  Scan,
  Plus,
  Loader2
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
  const [scannerActive, setScannerActive] = useState(false); // Cámara desactivada por defecto
  const [scannerLoading, setScannerLoading] = useState(false);
  const processingRef = useRef(false);
  const cooldownTimeoutRef = useRef(null);
  const [lastScannedQR, setLastScannedQR] = useState(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [currentQR, setCurrentQR] = useState(null); // QR actualmente procesado
  
  // Estados para lector físico de QR
  const [scannerMode, setScannerMode] = useState('physical'); // 'physical' o 'camera'
  const [physicalScannerInput, setPhysicalScannerInput] = useState('');
  const physicalScannerInputRef = useRef(null);
  const [isPhysicalScannerReady, setIsPhysicalScannerReady] = useState(true);
  
  // Ref para auto-focus del primer campo del modal
  const firstModalInputRef = useRef(null);
  
  // Estados para carga de eventos bajo demanda
  const [eventosLoading, setEventosLoading] = useState(false);
  
  // Estados para impresión térmica
  const [thermalStatus, setThermalStatus] = useState('idle'); // 'idle', 'printing', 'success', 'error'
  const [thermalError, setThermalError] = useState(null);
  const [printerStatus, setPrinterStatus] = useState(null);
  
  // Estados para registro rápido
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [registroLoading, setRegistroLoading] = useState(false);
  const [registroData, setRegistroData] = useState({
    nombres: '',
    correo: '',
    empresa: '',
    cargo: '',
    numero: '',
    expectativas: 'Registro de asistencia general'
  });
  const [registroErrors, setRegistroErrors] = useState({});

  // Cargar configuración inicial al montar el componente
  useEffect(() => {
    // Cargar cache de registros SOLO UNA VEZ
    cargarCacheRegistros();
    // Verificar estado de impresora térmica SOLO UNA VEZ
    verificarEstadoImpresora();
    
    // Si está en modo lector físico, hacer focus en el input
    if (scannerMode === 'physical' && physicalScannerInputRef.current) {
      physicalScannerInputRef.current.focus();
    }
  }, []); // Array vacío = solo se ejecuta al montar

  // Effect separado para la función de prueba del cache
  useEffect(() => {
    // Función de prueba del cache (se ejecutará en consola)
    window.testCache = (qrCode) => {
      console.log('=== TEST DE CACHE ===');
      console.log('Código a buscar:', qrCode);
      console.log('Código normalizado:', normalizeQRCode(qrCode));
      console.log('Registros en cache:', registrosCache.length);
      
      const resultado = buscarEnCache(qrCode);
      if (resultado) {
        console.log('✅ ENCONTRADO EN CACHE:', resultado);
      } else {
        console.log('❌ NO ENCONTRADO EN CACHE');
        console.log('Primeros 10 QRs en cache:');
        registrosCache.slice(0, 10).forEach((r, i) => {
          console.log(`${i + 1}. QR_TEXT: ${r.qr_text || 'N/A'} | QR_CODE: ${r.qr_code || 'N/A'}`);
        });
      }
      return resultado;
    };
    
    if (registrosCache.length > 0) {
      console.log('💡 TIP: Usa window.testCache("CODIGO_QR") en la consola para probar búsquedas');
    }
  }, [registrosCache]); // Este sí puede depender de registrosCache porque no lo modifica
  
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

  // Effect para mantener focus en el input cuando está en modo lector físico
  useEffect(() => {
    // Solo mantener focus si está en modo físico Y el modal de registro NO está abierto
    if (scannerMode === 'physical' && !showRegistroModal) {
      const handleFocus = () => {
        if (physicalScannerInputRef.current && document.activeElement !== physicalScannerInputRef.current) {
          physicalScannerInputRef.current.focus();
        }
      };

      // Establecer focus inicial
      handleFocus();

      // Re-establecer focus cuando se pierde (por ejemplo, al hacer clic en otro lugar)
      const interval = setInterval(handleFocus, 500);
      
      // También escuchar clicks en el documento
      document.addEventListener('click', handleFocus);

      return () => {
        clearInterval(interval);
        document.removeEventListener('click', handleFocus);
      };
    }
  }, [scannerMode, userData, showRegistroModal]); // Agregar showRegistroModal como dependencia

  // Effect para hacer focus al primer campo del modal cuando se abre
  useEffect(() => {
    if (showRegistroModal && firstModalInputRef.current) {
      // Delay pequeño para asegurar que el modal esté completamente renderizado
      setTimeout(() => {
        firstModalInputRef.current.focus();
      }, 100);
    }
  }, [showRegistroModal]);

  // Effect para manejar tecla Escape en el modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showRegistroModal) {
        handleCloseRegistroModal();
      }
    };

    if (showRegistroModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showRegistroModal]);

  // Función para normalizar el código QR del lector físico
  const normalizeQRCode = (code) => {
    // Algunos lectores interpretan el pipe | como ]
    // También manejar otros caracteres problemáticos comunes
    let normalized = code
      .replace(/\]/g, '|')  // Reemplazar ] con |
      .replace(/¡/g, '+')   // Algunos lectores convierten + en ¡
      .trim();
    
    console.log('[NORMALIZACIÓN] Original:', code);
    console.log('[NORMALIZACIÓN] Normalizado:', normalized);
    
    return normalized;
  };

  // Handler para el input del lector físico cuando presiona Enter
  const handlePhysicalScannerKeyPress = (e) => {
    // Detectar cuando se presiona Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      let qrCode = physicalScannerInput.trim();
      
      if (qrCode && qrCode.length > 0) {
        // Normalizar el código antes de procesarlo
        qrCode = normalizeQRCode(qrCode);
        
        console.log('[LECTOR FÍSICO] QR escaneado y normalizado:', qrCode);
        handleQRScan(qrCode);
        // Limpiar el input después de procesar
        setTimeout(() => {
          setPhysicalScannerInput('');
          // Re-enfocar el input
          if (physicalScannerInputRef.current) {
            physicalScannerInputRef.current.focus();
          }
        }, 100);
      }
    }
  };

  // Handler para cambio de texto en el input
  const handlePhysicalScannerChange = (e) => {
    const value = e.target.value;
    setPhysicalScannerInput(value);
    
    // Algunos lectores no envían Enter, pero sí el texto completo de una vez
    // Si detectamos un patrón de QR válido completo, procesarlo automáticamente
    // Buscar tanto | como ] ya que algunos lectores convierten el pipe
    if (value.length > 10 && (value.includes('|') || value.includes(']') || value.match(/^[A-Z0-9]+$/))) {
      // Dar un pequeño delay para asegurar que el lector terminó
      setTimeout(() => {
        if (physicalScannerInput === value && value.length > 0) {
          // Normalizar antes de procesar
          const normalizedQR = normalizeQRCode(value);
          console.log('[LECTOR FÍSICO] QR detectado automáticamente:', normalizedQR);
          handleQRScan(normalizedQR);
          setPhysicalScannerInput('');
          if (physicalScannerInputRef.current) {
            physicalScannerInputRef.current.focus();
          }
        }
      }, 500);
    }
  };

  // Función para cambiar entre modos
  const toggleScannerMode = () => {
    const newMode = scannerMode === 'physical' ? 'camera' : 'physical';
    setScannerMode(newMode);
    
    if (newMode === 'physical') {
      setScannerActive(false); // Desactivar cámara
      setPhysicalScannerInput('');
      // Focus automático se maneja en el effect
    } else {
      setScannerActive(true); // Activar cámara
    }
  };

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
        const confirmados = data.registros.filter(r => r.asistencia_general_confirmada).length;
        const pendientes = data.registros.filter(r => !r.asistencia_general_confirmada).length;
        
        setStats(prev => ({
          ...prev,
          confirmados,
          pendientes,
          ultimaVerificacion: new Date().toLocaleTimeString()
        }));
        
        console.log(`[CACHE] ${data.total} registros cargados en cache`);
        console.log('[CACHE] Muestra de datos (primeros 3 registros):');
        data.registros.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. Nombre: ${r.nombres}`);
          console.log(`     QR_TEXT: ${r.qr_text || 'N/A'}`);
          console.log(`     QR_CODE: ${r.qr_code || 'N/A'}`);
          console.log(`     Asistencia: ${r.asistencia_general_confirmada ? 'Confirmada' : 'Pendiente'}`);
          console.log(`     Total Eventos: ${r.total_eventos || 0}`);
        });
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
    // Normalizar el código QR para la búsqueda
    const normalizedQR = normalizeQRCode(qrCode);
    
    console.log('[CACHE] 🔍 Buscando QR:', qrCode);
    console.log('[CACHE] 🔍 QR normalizado:', normalizedQR);
    console.log('[CACHE] 📦 Total registros en cache:', registrosCache.length);
    
    // Buscar por QR exacto (tanto el original como el normalizado)
    const registro = registrosCache.find(r => {
      // Comparar con QR normalizado
      const cacheQRText = r.qr_text ? normalizeQRCode(r.qr_text) : null;
      const cacheQRCode = r.qr_code ? normalizeQRCode(r.qr_code) : null;
      
      const matchText = cacheQRText === normalizedQR;
      const matchCode = cacheQRCode === normalizedQR;
      const matchOrigText = r.qr_text === qrCode;
      const matchOrigCode = r.qr_code === qrCode;
      
      // Log para debugging
      if (r.id === 872 || r.id === 858) { // IDs que sabemos que existen
        console.log(`[CACHE] 🔍 Comparando con Usuario ${r.id} (${r.nombres})`);
        console.log(`  QR_TEXT: "${r.qr_text}" → normalizado: "${cacheQRText}"`);
        console.log(`  QR_CODE: "${r.qr_code}" → normalizado: "${cacheQRCode}"`);
        console.log(`  Matches - Text: ${matchText}, Code: ${matchCode}, OrigText: ${matchOrigText}, OrigCode: ${matchOrigCode}`);
      }
      
      return matchText || matchCode || matchOrigText || matchOrigCode;
    });
    
    if (registro) {
      console.log('[CACHE HIT] Usuario encontrado en cache:', registro.nombres);
      console.log('[CACHE HIT] Datos completos:', registro);
      
      // Mapear correctamente los campos del cache
      return {
        usuario: {
          id: registro.id,
          nombres: registro.nombres,
          correo: registro.correo,
          empresa: registro.empresa,
          cargo: registro.cargo,
          numero: registro.numero,
          qr_code: registro.qr_code || registro.qr_text,
          asistencia_confirmada: registro.asistencia_general_confirmada || false,
          estado_asistencia: registro.estado_asistencia || 'pendiente',
          fecha_registro: registro.fecha_registro,
          fecha_asistencia_general: registro.fecha_asistencia_general,
          total_eventos: registro.total_eventos || 0 // Número de eventos desde el cache
        },
        eventos: registro.eventos || [],
        qr_validado: true
      };
    }
    
    console.log('[CACHE MISS] Usuario no encontrado en cache, consultando servidor...');
    console.log('[CACHE MISS] QRs en cache (primeros 5):', 
      registrosCache.slice(0, 5).map(r => ({ qr_text: r.qr_text, qr_code: r.qr_code }))
    );
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
      // ✅ MOSTRAR DATOS INMEDIATAMENTE DESDE EL CACHE
      setCurrentQR(qrCode);
      
      const newUserData = {
        ...cachedData,
        qr_original: qrCode,
        eventos: [] // Vacío inicialmente, se cargarán después
      };
      setUserData(newUserData); // ✅ MOSTRAR INMEDIATAMENTE
      
      // Inicializar datos para edición inmediatamente
      if (cachedData.usuario) {
        setEditData({
          nombres: cachedData.usuario.nombres,
          correo: cachedData.usuario.correo,
          empresa: cachedData.usuario.empresa,
          cargo: cachedData.usuario.cargo,
          numero: cachedData.usuario.numero
        });
      }
      
      // ✅ RESETEAR LOADING INMEDIATAMENTE
      setTimeout(() => {
        setScanCooldown(false);
        setLastScannedQR(null);
        processingRef.current = false;
        setScannerLoading(false);
      }, 500); // Mucho más rápido
      
      // 🔄 CARGAR EVENTOS EN SEGUNDO PLANO (NO BLOQUEA LA UI)
      console.log('[CACHE] Mostrando datos inmediatamente, cargando eventos en segundo plano...');
      cargarEventosUsuario(cachedData.usuario.id).then(eventos => {
        if (eventos) {
          console.log('[CACHE] Eventos cargados, actualizando UI...');
          // Solo actualizar si todavía estamos mostrando este usuario
          setUserData(prevData => {
            if (prevData && prevData.usuario.id === cachedData.usuario.id) {
              return {
                ...prevData,
                eventos: eventos
              };
            }
            return prevData;
          });
        }
      }).catch(error => {
        console.error('[CACHE] Error cargando eventos:', error);
      });
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


  // Función para validar campos del registro
  const validateRegistroField = (field, value) => {
    switch(field) {
      case 'nombres':
        return value.trim().length >= 2 ? '' : 'Nombre muy corto';
      case 'correo':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? '' : 'Email inválido';
      case 'empresa':
        return value.trim().length >= 2 ? '' : 'Empresa requerida';
      case 'cargo':
        return value.trim().length >= 2 ? '' : 'Cargo requerido';
      case 'numero':
        return value.trim().length >= 8 ? '' : 'Número inválido';
      default:
        return '';
    }
  };
  
  // Función para manejar cambios en el formulario de registro
  const handleRegistroChange = (field, value) => {
    setRegistroData(prev => ({ ...prev, [field]: value }));
    const error = validateRegistroField(field, value);
    setRegistroErrors(prev => ({ ...prev, [field]: error }));
  };
  
  // Función para cerrar el modal y restaurar focus
  const handleCloseRegistroModal = () => {
    setShowRegistroModal(false);
    
    // Limpiar errores
    setRegistroErrors({});
    
    // Restaurar focus al lector físico si está en modo físico
    if (scannerMode === 'physical') {
      setTimeout(() => {
        if (physicalScannerInputRef.current) {
          physicalScannerInputRef.current.focus();
        }
      }, 100);
    }
  };
  
  // Función para crear registro rápido
  const handleRegistroRapido = async () => {
    // Validar todos los campos
    const errors = {};
    Object.keys(registroData).forEach(field => {
      if (field !== 'expectativas') {
        const error = validateRegistroField(field, registroData[field]);
        if (error) errors[field] = error;
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setRegistroErrors(errors);
      return;
    }
    
    setRegistroLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registroData,
          eventos_seleccionados: [],
          tipo_registro: 'general'
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Limpiar formulario
        setRegistroData({
          nombres: '',
          correo: '',
          empresa: '',
          cargo: '',
          numero: '',
          expectativas: 'Registro de asistencia general'
        });
        setRegistroErrors({});
        
        // Cerrar modal y restaurar focus
        handleCloseRegistroModal();
        
        // Actualizar cache primero
        await cargarCacheRegistros();
        
        // Buscar automáticamente el QR creado
        setTimeout(() => {
          handleQRScan(data.qr_code);
        }, 500);
        
        // Mostrar mensaje de éxito
        setSuccess(`Usuario registrado exitosamente. QR: ${data.qr_code}`);
      } else {
        throw new Error(data.error || 'Error al crear registro');
      }
    } catch (error) {
      console.error('Error en registro rápido:', error);
      setError(`Error al registrar: ${error.message}`);
    } finally {
      setRegistroLoading(false);
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
              {/* Toggle de modo de scanner */}
              <div className="flex items-center space-x-2 bg-white border rounded-lg px-4 py-2">
                <button
                  onClick={toggleScannerMode}
                  className="flex items-center space-x-2 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                >
                  {scannerMode === 'physical' ? (
                    <>
                      <Keyboard size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Lector Físico</span>
                      <ToggleLeft size={24} className="text-blue-600" />
                    </>
                  ) : (
                    <>
                      <Camera size={18} className="text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Cámara</span>
                      <ToggleRight size={24} className="text-green-600" />
                    </>
                  )}
                </button>
              </div>

              {/* Indicador de estado del scanner */}
              <div className="flex items-center space-x-3 bg-white border rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    scannerMode === 'physical' ? 
                      (isPhysicalScannerReady ? 'bg-green-500 animate-pulse' : 'bg-gray-400') :
                      (scannerActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400')
                  }`} />
                  {scannerMode === 'physical' ? (
                    <>
                      <Keyboard size={16} className={isPhysicalScannerReady ? 'text-green-600' : 'text-gray-400'} />
                      <span className="text-sm font-medium text-gray-700">
                        {isPhysicalScannerReady ? 'Lector Listo' : 'Lector Inactivo'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Camera size={16} className={scannerActive ? 'text-green-600' : 'text-gray-400'} />
                      <span className="text-sm font-medium text-gray-700">
                        {scannerActive ? 'Cámara Activa' : 'Cámara Inactiva'}
                      </span>
                    </>
                  )}
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

              {/* Botón de registro rápido */}
              <button
                onClick={() => setShowRegistroModal(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
                title="Registro rápido sin eventos"
              >
                <Plus size={28} className="font-bold" />
                <span className="hidden lg:inline font-medium">Nuevo Registro</span>
              </button>

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
          <>
            {/* Input para lector físico - Siempre visible en modo físico incluso con userData */}
            {scannerMode === 'physical' && (
              <div className="mb-4 bg-white rounded-lg shadow p-4">
                <div className="flex items-center space-x-4">
                  <Keyboard className="text-blue-600" size={20} />
                  <input
                    ref={physicalScannerInputRef}
                    type="text"
                    value={physicalScannerInput}
                    onChange={handlePhysicalScannerChange}
                    onKeyPress={handlePhysicalScannerKeyPress}
                    className="flex-1 px-3 py-2 text-lg font-mono border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Escanear nuevo QR..."
                    autoComplete="off"
                  />
                  <button
                    onClick={() => {
                      let qrCode = physicalScannerInput.trim();
                      if (qrCode) {
                        // Normalizar antes de procesar
                        qrCode = normalizeQRCode(qrCode);
                        handleQRScan(qrCode);
                        setPhysicalScannerInput('');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    disabled={!physicalScannerInput}
                  >
                    Procesar
                  </button>
                </div>
              </div>
            )}
            
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
                  Eventos Registrados ({userData.eventos?.length || 0}
                  {userData.usuario?.total_eventos && userData.usuario.total_eventos > 0 && 
                   (!userData.eventos || userData.eventos.length === 0) && 
                   ` de ${userData.usuario.total_eventos}`})
                  {eventosLoading && (
                    <div className="ml-2 flex items-center">
                      <RefreshCw size={16} className="text-blue-500 animate-spin mr-1" />
                      <span className="text-sm text-blue-600">
                        {userData.usuario?.total_eventos && userData.usuario.total_eventos > 0 
                          ? `Cargando ${userData.usuario.total_eventos} eventos...` 
                          : 'Cargando...'}
                      </span>
                    </div>
                  )}
                </h3>
                
                {eventosLoading && (!userData.eventos || userData.eventos.length === 0) ? (
                  <div className="flex items-center justify-center py-8 text-gray-500">
                    <RefreshCw size={24} className="animate-spin mr-3" />
                    <span>
                      {userData.usuario?.total_eventos && userData.usuario.total_eventos > 0 
                        ? `Cargando ${userData.usuario.total_eventos} eventos registrados...` 
                        : 'Cargando eventos del asistente...'}
                    </span>
                  </div>
                ) : userData.eventos && userData.eventos.length > 0 ? (
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
                    <span className="font-bold text-blue-600">
                      {userData.eventos?.length || 0}
                      {userData.usuario?.total_eventos && userData.usuario.total_eventos > 0 && 
                       userData.eventos?.length !== userData.usuario.total_eventos && 
                       ` de ${userData.usuario.total_eventos}`}
                    </span>
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
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda - Scanner QR */}
            <div className="space-y-6">
              {/* Mostrar scanner según el modo */}
              {scannerMode === 'physical' ? (
                /* Modo Lector Físico */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Keyboard className="mr-2" size={24} />
                    Lector Físico de QR / Código de Barras
                  </h3>
                  
                  {/* Input de texto VISIBLE para el lector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código QR del Asistente
                    </label>
                    <div className="relative">
                      <input
                        ref={physicalScannerInputRef}
                        type="text"
                        value={physicalScannerInput}
                        onChange={handlePhysicalScannerChange}
                        onKeyPress={handlePhysicalScannerKeyPress}
                        className="w-full px-4 py-3 pr-12 text-lg font-mono border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="Esperando lectura del scanner..."
                        autoComplete="off"
                        autoFocus={true}
                      />
                      {physicalScannerInput && (
                        <button
                          onClick={() => {
                            setPhysicalScannerInput('');
                            if (physicalScannerInputRef.current) {
                              physicalScannerInputRef.current.focus();
                            }
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded transition-colors"
                        >
                          <X size={20} className="text-gray-500" />
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      El scanner enviará el código automáticamente • Presiona Enter para procesar manualmente
                    </p>
                    {/* Mostrar normalización si hay diferencias */}
                    {physicalScannerInput && physicalScannerInput.includes(']') && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        <p className="text-yellow-700 font-semibold">Normalización detectada:</p>
                        <p className="text-yellow-600">Original: {physicalScannerInput}</p>
                        <p className="text-green-600">Normalizado: {normalizeQRCode(physicalScannerInput)}</p>
                      </div>
                    )}
                  </div>

                  {/* Área visual indicando estado */}
                  <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex flex-col items-center justify-center border-2 border-blue-200 border-dashed">
                    <Scan size={48} className="text-blue-600 mb-4 animate-pulse" />
                    <p className="text-lg font-semibold text-blue-800 mb-2">
                      {physicalScannerInput ? 'Recibiendo datos...' : 'Lector Listo'}
                    </p>
                    <p className="text-sm text-blue-600 text-center px-4">
                      {physicalScannerInput ? 
                        `Código: ${physicalScannerInput.substring(0, 20)}${physicalScannerInput.length > 20 ? '...' : ''}` : 
                        'Escanea el QR o ingresa el código manualmente'
                      }
                    </p>
                  </div>

                  {/* Botón manual de procesamiento */}
                  {physicalScannerInput && (
                    <button
                      onClick={() => {
                        let qrCode = physicalScannerInput.trim();
                        if (qrCode) {
                          // Normalizar antes de procesar
                          qrCode = normalizeQRCode(qrCode);
                          handleQRScan(qrCode);
                          setTimeout(() => {
                            setPhysicalScannerInput('');
                            if (physicalScannerInputRef.current) {
                              physicalScannerInputRef.current.focus();
                            }
                          }, 100);
                        }
                      }}
                      className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
                    >
                      <CheckCircle size={20} className="mr-2" />
                      Procesar Código QR
                    </button>
                  )}
                  
                  {/* Indicadores de estado */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-700">Lector listo</span>
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
                    
                    <div className="mt-2 text-xs text-gray-500">
                      <p>• El lector debe estar configurado para enviar Enter al final</p>
                      <p>• Mantén esta ventana activa para capturar la lectura</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Modo Cámara */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Camera className="mr-2" size={24} />
                    Escanear con Cámara
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
              )}
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
                  {scannerMode === 'physical' 
                    ? 'Usa tu lector de códigos de barras para escanear el QR del asistente'
                    : 'Coloca el código QR del asistente frente a la cámara para comenzar la verificación'
                  }
                </p>
                <div className="text-sm text-gray-400">
                  {scannerMode === 'physical' ? (
                    <>
                      <p>• El lector enviará los datos automáticamente</p>
                      <p>• Asegúrate de que está configurado para enviar Enter</p>
                      <p>• Mantén esta ventana activa para capturar</p>
                    </>
                  ) : (
                    <>
                      <p>• Asegúrate de tener buena iluminación</p>
                      <p>• Mantén el QR centrado en la cámara</p>
                      <p>• Espera 3 segundos entre escaneos</p>
                    </>
                  )}
                </div>
                
                {/* Botón para cambiar modo */}
                <button
                  onClick={toggleScannerMode}
                  className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors flex items-center justify-center mx-auto"
                >
                  {scannerMode === 'physical' ? (
                    <>
                      <Camera size={16} className="mr-2" />
                      Cambiar a Cámara
                    </>
                  ) : (
                    <>
                      <Keyboard size={16} className="mr-2" />
                      Cambiar a Lector Físico
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Registro Rápido */}
      {showRegistroModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Registro Rápido</h3>
              <button
                onClick={handleCloseRegistroModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              Registro de asistencia general sin eventos específicos
            </p>
            
            <div className="space-y-4">
              {/* Campo Nombres */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User size={16} className="inline mr-1" />
                  Nombres Completos *
                </label>
                <input
                  ref={firstModalInputRef}
                  type="text"
                  value={registroData.nombres}
                  onChange={(e) => handleRegistroChange('nombres', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    registroErrors.nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Juan Pérez"
                />
                {registroErrors.nombres && (
                  <p className="text-red-500 text-xs mt-1">{registroErrors.nombres}</p>
                )}
              </div>
              
              {/* Campo Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail size={16} className="inline mr-1" />
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={registroData.correo}
                  onChange={(e) => handleRegistroChange('correo', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    registroErrors.correo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="juan@empresa.com"
                />
                {registroErrors.correo && (
                  <p className="text-red-500 text-xs mt-1">{registroErrors.correo}</p>
                )}
              </div>
              
              {/* Campo Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 size={16} className="inline mr-1" />
                  Empresa *
                </label>
                <input
                  type="text"
                  value={registroData.empresa}
                  onChange={(e) => handleRegistroChange('empresa', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    registroErrors.empresa ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nombre de la empresa"
                />
                {registroErrors.empresa && (
                  <p className="text-red-500 text-xs mt-1">{registroErrors.empresa}</p>
                )}
              </div>
              
              {/* Campo Cargo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Briefcase size={16} className="inline mr-1" />
                  Cargo *
                </label>
                <input
                  type="text"
                  value={registroData.cargo}
                  onChange={(e) => handleRegistroChange('cargo', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    registroErrors.cargo ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Gerente, Director, etc."
                />
                {registroErrors.cargo && (
                  <p className="text-red-500 text-xs mt-1">{registroErrors.cargo}</p>
                )}
              </div>
              
              {/* Campo Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={16} className="inline mr-1" />
                  Número de Teléfono *
                </label>
                <input
                  type="tel"
                  value={registroData.numero}
                  onChange={(e) => handleRegistroChange('numero', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    registroErrors.numero ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+507 6000-0000"
                />
                {registroErrors.numero && (
                  <p className="text-red-500 text-xs mt-1">{registroErrors.numero}</p>
                )}
              </div>
              
              {/* Campo Expectativas (Opcional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare size={16} className="inline mr-1" />
                  Expectativas (Opcional)
                </label>
                <textarea
                  value={registroData.expectativas}
                  onChange={(e) => handleRegistroChange('expectativas', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="¿Qué espera del evento?"
                  rows={3}
                />
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCloseRegistroModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={registroLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistroRapido}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={registroLoading}
              >
                {registroLoading ? (
                  <>
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="mr-2" />
                    Crear Registro
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VerificarPrueba;