import React, { useState, useEffect, useRef } from 'react';
import QRScanner from './QRScanner';
import API_CONFIG from '../config/api.config';

const LeadsCapture = () => {
  const [cliente, setCliente] = useState(null);
  const [asesores, setAsesores] = useState([]);
  const [asesorSeleccionado, setAsesorSeleccionado] = useState('');
  const [asesorConfirmado, setAsesorConfirmado] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [consultasAnteriores, setConsultasAnteriores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modoScanner, setModoScanner] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const processingRef = useRef(false);
  const cooldownTimeoutRef = useRef(null);
  const [lastScannedQR, setLastScannedQR] = useState(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const isRecordingRef = useRef(false);
  const [usoTranscripcion, setUsoTranscripcion] = useState(false);
  const [historialLoading, setHistorialLoading] = useState(false);

  // Cargar lista de asesores y configurar reconocimiento de voz al montar el componente
  useEffect(() => {
    cargarAsesores();
    initializeSpeechRecognition();
    
    // Recuperar asesor guardado en localStorage
    const asesorGuardado = localStorage.getItem('leadsCaptureAsesor');
    if (asesorGuardado) {
      setAsesorSeleccionado(asesorGuardado);
      setAsesorConfirmado(true);
      setModoScanner(true);
    }
  }, []);

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true; // DEBE ser true para seguir escuchando
      recognition.interimResults = true; // Para ver texto en tiempo real
      recognition.lang = 'es-ES';
      recognition.maxAlternatives = 1;
      
      // Variable para rastrear lo que ya se procesó
      let lastProcessedIndex = 0;
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Procesar solo desde el último índice procesado
        for (let i = lastProcessedIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript;
            lastProcessedIndex = i + 1; // Actualizar índice procesado
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Solo agregar texto final (confirmado) al textarea
        if (finalTranscript.trim()) {
          // Marcar que se usó transcripción
          setUsoTranscripcion(true);
          
          setConsulta(prev => {
            let processedText = finalTranscript.trim();
            
            // Agregar coma si termina abrupto (para marcar pausas)
            if (prev.trim() && !prev.trim().endsWith(',') && !prev.trim().endsWith('.') && !prev.trim().endsWith('!') && !prev.trim().endsWith('?')) {
              return prev.trim() + ', ' + processedText;
            }
            
            const newText = prev.trim() ? prev + ' ' + processedText : processedText;
            return newText;
          });
        }
      };
      
      recognition.onstart = () => {
        lastProcessedIndex = 0; // Resetear al iniciar
        console.log('Reconocimiento de voz iniciado');
      };
      
      recognition.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        if (event.error !== 'no-speech') { // No detener por falta de voz
          setIsRecording(false);
          if (event.error === 'audio-capture') {
            setError('Error de micrófono. Verifica permisos.');
          } else if (event.error === 'not-allowed') {
            setError('Permisos de micrófono denegados.');
          }
        }
      };
      
      recognition.onend = () => {
        // Solo detener si el usuario presionó el botón parar
        if (isRecordingRef.current) {
          // Si se detiene inesperadamente, reiniciar automáticamente
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
                console.log('Reconocimiento reiniciado automáticamente');
              } catch (error) {
                console.log('No se pudo reiniciar automáticamente:', error);
                setIsRecording(false);
                isRecordingRef.current = false;
              }
            }
          }, 100);
        }
      };
      
      setRecognition(recognition);
    }
  };

  const cargarAsesores = async () => {
    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/leads/asesores`);
      const data = await response.json();
      setAsesores(data.asesores || []);
    } catch (error) {
      console.error('Error cargando asesores:', error);
    }
  };

  const confirmarAsesor = () => {
    if (!asesorSeleccionado.trim()) {
      setError('Por favor selecciona un asesor');
      return;
    }
    
    localStorage.setItem('leadsCaptureAsesor', asesorSeleccionado);
    setAsesorConfirmado(true);
    setModoScanner(true);
    setError(null);
  };

  const cambiarAsesor = () => {
    localStorage.removeItem('leadsCaptureAsesor');
    setAsesorConfirmado(false);
    setModoScanner(false);
    setCliente(null);
    setConsulta('');
    setError(null);
    setSuccess(null);
  };

  const toggleRecording = () => {
    if (!recognition) {
      setError('Reconocimiento de voz no disponible en este navegador');
      return;
    }
    
    if (isRecording) {
      // Parar grabación
      isRecordingRef.current = false;
      recognition.stop();
      setIsRecording(false);
      console.log('Grabación detenida por el usuario');
    } else {
      // Iniciar grabación
      setError(null);
      try {
        recognition.start();
        setIsRecording(true);
        isRecordingRef.current = true;
        console.log('Grabación iniciada');
      } catch (error) {
        console.error('Error iniciando reconocimiento:', error);
        setError('Error iniciando reconocimiento de voz');
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    }
  };

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
    
    // Limpiar timeout anterior si existe
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
    }
    
    // Configurar nuevo timeout para resetear después de 3 segundos
    cooldownTimeoutRef.current = setTimeout(() => {
      setScanCooldown(false);
      setLastScannedQR(null);
      processingRef.current = false;
    }, 3000);

    setScannerLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // ETAPA 1: Cargar solo datos básicos del cliente (RÁPIDO)
      const response = await fetch(`${API_CONFIG.getApiUrl()}/leads/cliente-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_code: qrCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo datos del cliente');
      }

      // Mostrar cliente INMEDIATAMENTE y cambiar a modo formulario
      setCliente(data.cliente);
      setModoScanner(false);
      setScannerLoading(false); // Quitar loading inmediatamente
      
      // ETAPA 2: Cargar historial en background (PUEDE DEMORAR)
      // No bloqueamos la UI mientras carga el historial
      setHistorialLoading(true); // Mostrar indicador de carga
      fetch(`${API_CONFIG.getApiUrl()}/leads/cliente-historial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registro_id: data.cliente.id
        }),
      })
      .then(response => response.json())
      .then(historialData => {
        if (historialData.consultas_anteriores) {
          setConsultasAnteriores(historialData.consultas_anteriores);
        }
        setHistorialLoading(false);
      })
      .catch(error => {
        console.error('Error cargando historial:', error);
        setHistorialLoading(false);
        // No mostramos error al usuario porque el historial es secundario
      });

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setScannerLoading(false);
      // En caso de error, permitir nuevo escaneo después de 1 segundo
      setTimeout(() => {
        processingRef.current = false;
      }, 1000);
    }
  };

  const handleGuardarConsulta = async () => {
    if (!asesorSeleccionado.trim()) {
      setError('Por favor selecciona un asesor');
      return;
    }

    if (!consulta.trim()) {
      setError('Por favor ingresa la consulta');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_CONFIG.getApiUrl()}/leads/guardar-consulta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registro_id: cliente.id,
          asesor_nombre: asesorSeleccionado,
          consulta: consulta.trim(),
          uso_transcripcion: usoTranscripcion
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error guardando consulta');
      }

      setSuccess(`✅ Consulta guardada exitosamente para ${data.cliente}`);
      
      // Resetear formulario y volver al scanner
      setTimeout(() => {
        resetearFormulario();
      }, 2000);

    } catch (error) {
      console.error('Error guardando consulta:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetearFormulario = () => {
    setCliente(null);
    setConsultasAnteriores([]);
    setConsulta('');
    setError(null);
    setSuccess(null);
    setModoScanner(true);
    processingRef.current = false;
    setUsoTranscripcion(false); // Resetear estado de transcripción
    
    // Parar grabación si está activa
    if (isRecording && recognition) {
      isRecordingRef.current = false;
      recognition.stop();
      setIsRecording(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pantalla de selección de asesor
  if (!asesorConfirmado) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#01295c] to-[#1d2236]">
        {/* Header con logo */}
        <div className="pt-8 pb-6 px-4 text-center">
          <img 
            src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
            alt="EXPO KOSSODO 2025"
            className="h-16 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-white mb-2">
            📋 Sistema de Leads
          </h1>
          <p className="text-[#6cb79a] text-sm">
            Selecciona tu nombre para comenzar
          </p>
        </div>

        {/* Formulario de selección */}
        <div className="px-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <label className="block text-white font-medium mb-4 text-center">
              👤 ¿Quién eres?
            </label>
            <select
              value={asesorSeleccionado}
              onChange={(e) => setAsesorSeleccionado(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#6cb79a] focus:border-transparent"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <option value="" className="bg-gray-800 text-white">Selecciona tu nombre...</option>
              {asesores.map((asesor, index) => (
                <option key={index} value={asesor} className="bg-gray-800 text-white">
                  {asesor}
                </option>
              ))}
            </select>

            <button
              onClick={confirmarAsesor}
              disabled={!asesorSeleccionado.trim()}
              className={`w-full mt-6 py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                asesorSeleccionado.trim()
                  ? 'bg-[#6cb79a] hover:bg-[#5aa485] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              ✅ Confirmar y Continuar
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (modoScanner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#01295c] to-[#1d2236]">
        {/* Header compacto */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
                alt="Logo"
                className="h-8 object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-white">Leads</h1>
                <p className="text-xs text-[#6cb79a]">👤 {asesorSeleccionado}</p>
              </div>
            </div>
            <button
              onClick={cambiarAsesor}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Cambiar
            </button>
          </div>
        </div>

        {/* Scanner - Responsive con tamaño controlado en desktop */}
        <div className="p-4">
          <div className="flex justify-center">
            <div className="w-full md:w-3/4 lg:w-1/2 xl:w-1/2 2xl:w-1/3">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                {/* Contenedor del scanner con altura controlada */}
                <div className="scanner-wrapper">
                  <QRScanner 
                    onScanSuccess={handleQRScan}
                    onScanError={(error) => setError(`Error de escáner: ${error.message}`)}
                    isActive={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mensajes de Estado */}
          {scannerLoading && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-300 mr-3"></div>
                <span className="text-blue-200 text-sm">Obteniendo datos...</span>
              </div>
            </div>
          )}

          {scanCooldown && !scannerLoading && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-yellow-300 text-lg mr-2">⏳</span>
                <span className="text-yellow-200 text-sm">Esperando 3s...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-red-300 text-lg mr-2">❌</span>
                <span className="text-red-200 text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center">
                <span className="text-green-300 text-lg mr-2">✅</span>
                <span className="text-green-200 text-sm font-medium">{success}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#01295c] to-[#1d2236] flex flex-col">
      {/* Header compacto */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
              alt="Logo"
              className="h-8 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-white">Cliente</h1>
              <p className="text-xs text-[#6cb79a]">👤 {asesorSeleccionado}</p>
            </div>
          </div>
          <button
            onClick={resetearFormulario}
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            ← Nuevo
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col space-y-4">
        {/* Información del Cliente - Ultra Compacta */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Nombre */}
            <div>
              <p className="text-white font-semibold truncate">{cliente?.nombres}</p>
              <p className="text-white/60 text-xs">Nombre</p>
            </div>
            
            {/* Email */}
            <div>
              <p className="text-white truncate">{cliente?.correo}</p>
              <p className="text-white/60 text-xs">Email</p>
            </div>
            
            {/* Teléfono */}
            <div>
              <p className="text-white">{cliente?.numero}</p>
              <p className="text-white/60 text-xs">Tel</p>
            </div>
            
            {/* Empresa */}
            <div>
              <p className="text-white truncate">{cliente?.empresa}</p>
              <p className="text-white/60 text-xs">Empresa</p>
            </div>
            
            {/* Cargo - ocupa toda la fila inferior */}
            <div className="col-span-2">
              <p className="text-white truncate">{cliente?.cargo}</p>
              <p className="text-white/60 text-xs">Cargo</p>
            </div>
          </div>
        </div>

        {/* Formulario de Consulta - Altura Completa */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col space-y-4">
            {/* Campo de Consulta con altura completa */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-medium text-sm flex items-center">
                  💬 <span className="ml-2">Consulta</span>
                </label>
                {isRecording && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-red-300 text-xs">Escuchando...</span>
                  </div>
                )}
              </div>
              
              <textarea
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Escribe o usa el botón 🔴 para dictar la consulta del cliente..."
                className="flex-1 w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#6cb79a] focus:border-transparent resize-none text-sm min-h-[200px]"
              />
            </div>

            {/* Botones - Guardar y Record */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGuardarConsulta}
                disabled={loading || !consulta.trim()}
                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                  loading || !consulta.trim()
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-[#6cb79a] hover:bg-[#5aa485] text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  '💾 Guardar Consulta'
                )}
              </button>
              
              {/* Botón de Record */}
              <button
                onClick={toggleRecording}
                disabled={!recognition}
                className={`w-12 h-12 rounded-full font-bold transition-all duration-300 flex items-center justify-center ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-lg'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                } ${!recognition ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? '⏹️' : '🔴'}
              </button>
            </div>
          </div>
        </div>

        {/* Consultas Anteriores */}
        {(historialLoading || consultasAnteriores.length > 0) && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h2 className="text-white font-medium text-sm mb-3 flex items-center">
              📝 <span className="ml-2">
                Historial 
                {historialLoading ? (
                  <span className="ml-2 text-xs text-white/60">(cargando...)</span>
                ) : (
                  ` (${consultasAnteriores.length})`
                )}
              </span>
            </h2>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {historialLoading ? (
                // Skeleton loader mientras carga
                <>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10 animate-pulse">
                    <div className="h-3 bg-white/20 rounded w-1/3 mb-2"></div>
                    <div className="h-2 bg-white/10 rounded w-full"></div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10 animate-pulse">
                    <div className="h-3 bg-white/20 rounded w-1/3 mb-2"></div>
                    <div className="h-2 bg-white/10 rounded w-full"></div>
                  </div>
                </>
              ) : consultasAnteriores.length > 0 ? (
                consultasAnteriores.map((consultaAnterior, index) => (
                <div 
                  key={index}
                  className="bg-white/5 rounded-lg p-3 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[#6cb79a] text-xs font-medium">
                      {consultaAnterior.asesor_nombre}
                    </span>
                    <span className="text-white/50 text-xs">
                      {formatearFecha(consultaAnterior.fecha_consulta)}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed">
                    {consultaAnterior.consulta}
                  </p>
                </div>
                ))
              ) : (
                <p className="text-white/50 text-xs text-center">No hay consultas anteriores</p>
              )}
            </div>
          </div>
        )}

        {/* Mensajes de Estado */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-red-300 text-lg mr-2">❌</span>
              <span className="text-red-200 text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
            <div className="flex items-center">
              <span className="text-green-300 text-lg mr-2">✅</span>
              <span className="text-green-200 text-sm font-medium">{success}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadsCapture;