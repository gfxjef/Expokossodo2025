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
  Loader2,
  Search
} from 'lucide-react';

const ClientesSala = () => {
  
  // Cache de registros para búsqueda rápida
  const [registrosCache, setRegistrosCache] = useState([]);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [lastCacheUpdate, setLastCacheUpdate] = useState(null);
  
  // Cache de eventos para filtrado local ultrarrápido
  const [eventosCache, setEventosCache] = useState(new Map());
  const [eventosCacheLoading, setEventosCacheLoading] = useState(true);
  
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

  // Estados para búsqueda de usuarios
  const [showBuscarModal, setShowBuscarModal] = useState(false);
  const [buscarQuery, setBuscarQuery] = useState('');

  // Cargar configuración inicial al montar el componente
  useEffect(() => {
    // Cargar cache de registros SOLO UNA VEZ
    cargarCacheRegistros();
    // Cargar cache de eventos SOLO UNA VEZ (al recargar página)
    cargarCacheEventos();
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
    // Solo mantener focus si está en modo físico Y NINGÚN modal está abierto
    if (scannerMode === 'physical' && !showRegistroModal && !showBuscarModal) {
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
  }, [scannerMode, userData, showRegistroModal, showBuscarModal]); // Agregar ambos modales como dependencia

  // Effect para hacer focus al primer campo del modal cuando se abre
  useEffect(() => {
    if (showRegistroModal && firstModalInputRef.current) {
      // Delay pequeño para asegurar que el modal esté completamente renderizado
      setTimeout(() => {
        firstModalInputRef.current.focus();
      }, 100);
    }
  }, [showRegistroModal]);

  // Effect para manejar tecla Escape en los modales
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (showRegistroModal) {
          handleCloseRegistroModal();
        } else if (showBuscarModal) {
          handleCloseBuscarModal();
        }
      }
    };

    if (showRegistroModal || showBuscarModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showRegistroModal, showBuscarModal]);

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

  // Función para cargar cache de eventos (llamada al recargar página)
  const cargarCacheEventos = async () => {
    setEventosCacheLoading(true);
    try {
      // 🔧 SOLUCIÓN: Usar endpoint sin filtros para obtener TODOS los eventos
      console.log('[EVENTOS CACHE] Iniciando carga desde endpoint SIN FILTROS...');
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar/obtener-todos-eventos`);
      const data = await response.json();
      
      console.log('[EVENTOS CACHE] Respuesta recibida:', {
        status: response.status,
        ok: response.ok,
        success: !!data.success,
        totalEventos: data.total || 0,
        hasEventos: !!data.eventos && Array.isArray(data.eventos),
        dataKeys: Object.keys(data)
      });
      
      if (response.ok && data.success && data.eventos) {
        // 🔧 NUEVA ESTRUCTURA: Lista plana de eventos
        const cache = new Map();
        
        data.eventos.forEach(evento => {
          cache.set(evento.id, {
            ...evento,
            estado_sala: 'pendiente' // Estado por defecto
          });
        });
        
        setEventosCache(cache);
        console.log(`[EVENTOS CACHE] ${cache.size} eventos cargados en cache`);
        console.log('[EVENTOS CACHE] Eventos disponibles (IDs):', Array.from(cache.keys()).slice(0, 15));
        console.log('[EVENTOS CACHE] Muestra de eventos:', Array.from(cache.entries()).slice(0, 3).map(([id, evento]) => ({
          id: id,
          titulo: evento.titulo_charla,
          sala: evento.sala
        })));
        
        // 🔍 DIAGNÓSTICO CRÍTICO: Verificar si los IDs buscados existen
        const idsBuscados = [32, 33, 4, 8, 43, 12, 16, 48, 52, 53, 23, 26];
        const coincidencias = idsBuscados.map(id => ({
          id: id,
          existe: cache.has(id),
          titulo: cache.get(id)?.titulo_charla || 'NO EXISTE'
        }));
        console.log('[EVENTOS CACHE] ⚠️  VERIFICACIÓN DE IDs PROBLEMÁTICOS:', coincidencias);
        
        // Mostrar TODOS los IDs disponibles en el cache
        console.log('[EVENTOS CACHE] 📋 TODOS LOS IDs EN CACHE:', Array.from(cache.keys()).sort((a, b) => a - b));
      } else {
        console.error('Error cargando cache de eventos:', data.error);
      }
    } catch (error) {
      console.error('Error cargando cache de eventos:', error);
    } finally {
      setEventosCacheLoading(false);
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
      
      // 🚀 FILTRADO LOCAL ULTRARRÁPIDO DE EVENTOS
      let eventosUsuario = [];
      try {
        const eventosSeleccionados = JSON.parse(registro.eventos_seleccionados || '[]');
        console.log('[EVENTOS] IDs seleccionados:', eventosSeleccionados);
        
        // 🔍 DIAGNÓSTICO: Verificar estado del cache de eventos
        console.log('[EVENTOS DEBUG] Cache size:', eventosCache.size);
        console.log('[EVENTOS DEBUG] Cache keys (primeros 10):', Array.from(eventosCache.keys()).slice(0, 10));
        console.log('[EVENTOS DEBUG] IDs buscados:', eventosSeleccionados);
        
        // Verificar cuáles IDs existen en el cache
        const existenEnCache = eventosSeleccionados.map(id => ({
          id: id,
          existe: eventosCache.has(id),
          evento: eventosCache.get(id)?.titulo_charla || 'NO ENCONTRADO'
        }));
        console.log('[EVENTOS DEBUG] Verificación por ID:', existenEnCache);
        
        // Filtrar eventos localmente usando el cache (O(1) por evento)
        eventosUsuario = eventosSeleccionados
          .map(id => {
            const evento = eventosCache.get(id);
            if (!evento) {
              console.warn(`[EVENTOS] Evento ID ${id} no encontrado en cache`);
            }
            return evento;
          })
          .filter(evento => evento !== undefined)
          .map(evento => ({
            evento_id: evento.id,
            titulo_charla: evento.titulo_charla,
            sala: evento.sala,
            hora: evento.hora,
            fecha: evento.fecha,
            expositor: evento.expositor,
            pais: evento.pais,
            estado_sala: 'pendiente' // Se actualizará si hay asistencias confirmadas
          }));
        
        console.log(`[EVENTOS] ${eventosUsuario.length} eventos filtrados localmente`);
      } catch (error) {
        console.error('[EVENTOS] Error filtrando eventos:', error);
        eventosUsuario = [];
      }
      
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
          total_eventos: eventosUsuario.length // Conteo real de eventos filtrados
        },
        eventos: eventosUsuario, // ✅ Eventos filtrados localmente
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
      // ✅ MOSTRAR DATOS INMEDIATAMENTE DESDE EL CACHE (CON EVENTOS YA FILTRADOS)
      setCurrentQR(qrCode);
      
      const newUserData = {
        ...cachedData,
        qr_original: qrCode
        // Los eventos ya están filtrados en cachedData.eventos ✅
      };
      setUserData(newUserData); // ✅ MOSTRAR INMEDIATAMENTE CON EVENTOS
      
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
      }, 300); // Aún más rápido porque no hay carga adicional
      
      console.log('[CACHE] ⚡ Datos y eventos mostrados instantáneamente desde cache local');
    } else {
      // No está en cache, hacer consulta al servidor
      await verificarUsuarioConQR(qrCode);
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

        // Los eventos se filtrarán localmente si están disponibles en el cache
        if (data.usuario && data.usuario.eventos_seleccionados) {
          try {
            const eventosSeleccionados = JSON.parse(data.usuario.eventos_seleccionados || '[]');
            const eventos = eventosSeleccionados
              .map(id => eventosCache.get(id))
              .filter(evento => evento !== undefined)
              .map(evento => ({
                evento_id: evento.id,
                titulo_charla: evento.titulo_charla,
                sala: evento.sala,
                hora: evento.hora,
                fecha: evento.fecha,
                expositor: evento.expositor,
                pais: evento.pais,
                estado_sala: 'pendiente'
              }));
            newUserData.eventos = eventos;
            console.log(`[SERVER + CACHE] ${eventos.length} eventos filtrados localmente`);
          } catch (error) {
            console.error('[SERVER] Error filtrando eventos:', error);
            newUserData.eventos = [];
          }
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

      // OPTIMIZACIÓN: Imprimir etiqueta térmica EN PARALELO (no bloquea)
      if (currentQR) {
        // Ejecutar impresión en background sin esperar
        imprimirTermica().catch(printError => {
          console.error('Error al imprimir etiqueta automáticamente:', printError);
          // Error silencioso - no interrumpe flujo principal
        });
        console.log('[PRINT] 🖨️ Impresión iniciada en paralelo (no bloquea)');
      }
      
      // 📸 CAPTURAR FOTO SÍNCRONA PRIMERO, LUEGO WHATSAPP
      let photoURL = null;
      try {
        console.log('[FOTO-SYNC] 📷 Capturando foto SÍNCRONA antes de WhatsApp...');
        const fotoResponse = await fetch(`${API_CONFIG.getApiUrl()}/verificar/capturar-foto-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registro_id: userData.usuario.id,
            nombres: userData.usuario.nombres
          }),
        });
        
        if (fotoResponse.ok) {
          const fotoData = await fotoResponse.json();
          if (fotoData.success && fotoData.photo_url) {
            photoURL = fotoData.photo_url;
            console.log('[FOTO-SYNC] ✅ Foto capturada y subida EXITOSAMENTE:', photoURL);
            console.log('[FOTO-SYNC] 📁 Archivo:', fotoData.filename);
          } else {
            console.log('[FOTO-SYNC] ⚠️ Error:', fotoData.error || 'Captura fallida sin URL válida');
          }
        } else {
          const errorData = await fotoResponse.json().catch(() => ({}));
          console.log('[FOTO-SYNC] ⚠️ Error HTTP:', fotoResponse.status, errorData.error || 'Sin detalles');
        }
      } catch (err) {
        console.log('[FOTO-SYNC] ❌ Error de red capturando foto:', err);
        // Continuar sin foto
      }

      // 📲 OBTENER DATOS COMPLETOS Y ENVIAR WHATSAPP
      (async () => {
        try {
          console.log('[WHATSAPP] Usando datos cacheados del usuario...');
          
          // Buscar el usuario actual por ID en los datos ya cargados
          const usuarioCompleto = registrosCache.find(r => r.id === userData.usuario.id);
          
          if (!usuarioCompleto) {
            console.error('[WHATSAPP] Usuario no encontrado en los datos cacheados');
            return;
          }
          
          console.log('[WHATSAPP] Datos completos obtenidos:', usuarioCompleto);
          
          // Generar timestamp en formato YYYY-MM-DD HH:MM:SS
          const now = new Date();
          const fecha_hora = now.toISOString().slice(0, 19).replace('T', ' ');
          
          // Función para limpiar tildes y caracteres especiales (WhatsApp requirement)
          const limpiarTexto = (texto) => {
            return texto
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "") // Quitar tildes (á→a, é→e, í→i, ó→o, ú→u)
              .replace(/ñ/g, "n")              // ñ → n
              .replace(/Ñ/g, "N")              // Ñ → N
              .trim();
          };
          
          // Usar datos reales de la base de datos CON LIMPIEZA de tildes
          const whatsappData = {
            nombre: limpiarTexto(usuarioCompleto.nombres),
            empresa: limpiarTexto(usuarioCompleto.empresa),
            cargo: limpiarTexto(usuarioCompleto.cargo),
            fecha_hora: fecha_hora,
            numero: usuarioCompleto.numero // IMPORTANTE: Incluir número real
          };
          
          // Solo agregar photo si fue capturada y subida exitosamente
          if (photoURL) {
            whatsappData.photo = photoURL;
            console.log('[WHATSAPP] 📸 Incluyendo foto CONFIRMADA desde captura síncrona:', photoURL);
          } else {
            console.log('[WHATSAPP] 📸 Sin foto confirmada - enviando solo datos de texto');
          }
          
          console.log('[WHATSAPP] 📤 Enviando notificación con datos reales:', whatsappData);
          
          // Usar proxy con headers EXACTOS del script de referencia
          const endpoint = `${API_CONFIG.getApiUrl()}/verificar/whatsapp-proxy`;
            
          console.log('[WHATSAPP] 🎯 Endpoint destino:', endpoint);
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'RealMultipleDataTester/1.0'
            },
            body: JSON.stringify(whatsappData),
          });
          
          console.log('[WHATSAPP] 📨 Respuesta recibida - Status:', response.status);
          console.log('[WHATSAPP] 📨 Respuesta recibida - OK:', response.ok);
          
          const data = await response.json();
          console.log('[WHATSAPP] 📋 Datos de respuesta:', data);
          
          if (data.success) {
            console.log('[WHATSAPP] ✅ ÉXITO - Mensaje enviado correctamente');
            console.log('[WHATSAPP] 📱 Message ID:', data.data?.message_id || 'No disponible');
            console.log('[WHATSAPP] 👤 Empleado:', data.data?.employee_name || 'No disponible');
            console.log('[WHATSAPP] 📸 Tiene foto:', data.data?.has_photo || false);
            console.log('[WHATSAPP] 📞 Número:', usuarioCompleto.numero);
          } else {
            console.warn('[WHATSAPP] ⚠️  API devolvió success: false');
            console.warn('[WHATSAPP] ⚠️  Error:', data.message || 'Sin mensaje de error');
          }
          
        } catch (error) {
          console.error('[WHATSAPP] ❌ Error enviando notificación:', error);
          console.error('[WHATSAPP] ❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
      })();
      
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
  
  // Función para filtrar usuarios en el cache
  const filtrarUsuarios = (query) => {
    if (!query.trim()) return [];
    
    const queryLower = query.toLowerCase();
    return registrosCache
      .filter(registro => 
        registro.nombres.toLowerCase().includes(queryLower) ||
        registro.numero.toLowerCase().includes(queryLower) ||
        registro.correo.toLowerCase().includes(queryLower)
      )
      .slice(0, 10); // Limitar a 10 resultados para performance
  };

  // Función para seleccionar usuario desde búsqueda
  const seleccionarUsuario = (registro) => {
    setShowBuscarModal(false);
    setBuscarQuery('');
    
    // Usar el QR del usuario para activar el flujo normal
    const qrCode = registro.qr_code || registro.qr_text;
    if (qrCode) {
      handleQRScan(qrCode);
    }
  };

  // Función para cerrar modal de búsqueda
  const handleCloseBuscarModal = () => {
    setShowBuscarModal(false);
    setBuscarQuery('');
    
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

            {/* Controles esenciales */}
            <div className="flex items-center space-x-6">
              {/* Botón de búsqueda de usuario */}
              <button
                onClick={() => setShowBuscarModal(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
                title="Buscar usuario registrado"
              >
                <Search size={24} />
                <span className="hidden lg:inline font-medium">Buscar Usuario</span>
              </button>

              {/* Estadísticas de cache */}
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
            
            <div className="max-w-4xl mx-auto">
              {/* Información del asistente */}
              <div className="space-y-6">
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
                  <div className="ml-2 flex items-center">
                    <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                      ⚡ Carga instantánea
                    </span>
                  </div>
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
      
      {/* Modal de Búsqueda de Usuario */}
      {showBuscarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                <Search className="mr-2" size={24} />
                Buscar Usuario
              </h3>
              <button
                onClick={handleCloseBuscarModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>
            
            {/* Barra de búsqueda */}
            <div className="mb-4">
              <input
                type="text"
                value={buscarQuery}
                onChange={(e) => setBuscarQuery(e.target.value)}
                className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Buscar por nombre, teléfono o correo..."
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Escribe para buscar entre {registrosCache.length} usuarios registrados
              </p>
            </div>
            
            {/* Resultados de búsqueda */}
            <div className="max-h-96 overflow-y-auto">
              {(() => {
                const resultados = filtrarUsuarios(buscarQuery);
                
                if (!buscarQuery.trim()) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <Search size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Buscar Usuario</p>
                      <p className="text-sm">Escribe nombre, teléfono o correo para comenzar</p>
                    </div>
                  );
                }
                
                if (resultados.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">Sin resultados</p>
                      <p className="text-sm">No se encontraron usuarios con "{buscarQuery}"</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">
                      {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
                    </p>
                    {resultados.map((registro) => (
                      <motion.div
                        key={registro.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => seleccionarUsuario(registro)}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-800">
                                {registro.nombres}
                              </h4>
                              {/* Badge de estado */}
                              {(() => {
                                const badge = getEstadoBadge(registro.asistencia_general_confirmada ? 'confirmada' : 'pendiente');
                                const Icon = badge.icon;
                                return (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${badge.bg} ${badge.text}`}>
                                    <Icon size={12} className="mr-1" />
                                    {badge.label}
                                  </span>
                                );
                              })()}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Building2 size={14} className="mr-2 text-gray-400" />
                                {registro.empresa} - {registro.cargo}
                              </div>
                              <div className="flex items-center">
                                <Phone size={14} className="mr-2 text-gray-400" />
                                {registro.numero}
                              </div>
                              <div className="flex items-center md:col-span-2">
                                <Mail size={14} className="mr-2 text-gray-400" />
                                {registro.correo}
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <ChevronRight size={20} className="text-gray-400" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}

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

export default ClientesSala;