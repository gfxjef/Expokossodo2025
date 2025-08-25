import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRScanner from './QRScanner';
import { eventService } from '../services/api';
import API_CONFIG from '../config/api.config';

const VerificadorSala = () => {
  const { eventoId } = useParams();
  const navigate = useNavigate();
  
  const [eventoInfo, setEventoInfo] = useState(null);
  const [asistentes, setAsistentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filtroAsistentes, setFiltroAsistentes] = useState('todos');
  const [lastScannedQR, setLastScannedQR] = useState(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const processingRef = useRef(false);
  const cooldownTimeoutRef = useRef(null);

  // Cargar información del evento y asistentes
  useEffect(() => {
    if (eventoId) {
      cargarDatosEvento();
    }
  }, [eventoId]);

  const cargarDatosEvento = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const eventoData = await eventService.getVerificationEvent(eventoId);
      
      if (!eventoData.evento) {
        throw new Error('Evento no encontrado');
      }
      
      setEventoInfo(eventoData.evento);
      await cargarAsistentes();
      
    } catch (error) {
      console.error('Error cargando datos del evento:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarAsistentes = async (forceRefresh = false) => {
    try {
      const data = await eventService.getEventAttendees(eventoId, forceRefresh);
      setAsistentes(data.asistentes || []);
    } catch (error) {
      console.error('Error cargando asistentes:', error);
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
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar-sala/verificar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_code: qrCode,
          evento_id: parseInt(eventoId),
          asesor_verificador: 'Staff-Sala'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.error && data.error.includes('ya registró ingreso')) {
          setSuccess(`ℹ️ ${data.usuario} ya ingresó a esta sala anteriormente`);
          await cargarAsistentes(true);
        } else if (response.status === 403 && data.error && data.error.includes('no registrado en este evento')) {
          // Usuario no está registrado en este evento - ofrecer agregarlo
          const confirmar = window.confirm(
            `${data.usuario} no está registrado en este evento.\n\n` +
            `¿Deseas agregarlo automáticamente y registrar su asistencia?`
          );
          
          if (confirmar) {
            await agregarAsistenteAEvento(qrCode);
          } else {
            setError(`❌ ${data.usuario} no puede ingresar - no está registrado en este evento`);
          }
        } else {
          throw new Error(data.error || 'Error verificando asistencia');
        }
      } else {
        setSuccess(`✅ ¡${data.usuario.nombres} registrado exitosamente en la sala!`);
        eventService.invalidateAttendeeCache(parseInt(eventoId));
        eventService.clearVerificationCache();
        await cargarAsistentes(true);
      }

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      // En caso de error, permitir nuevo escaneo después de 1 segundo
      setTimeout(() => {
        processingRef.current = false;
      }, 1000);
    } finally {
      setScannerLoading(false);
    }
  };

  // Nueva función para agregar asistente al evento
  const agregarAsistenteAEvento = async (qrCode) => {
    try {
      setScannerLoading(true);
      setError(null);
      
      const response = await fetch(`${API_CONFIG.getApiUrl()}/verificar-sala/agregar-asistente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_code: qrCode,
          evento_id: parseInt(eventoId),
          asesor_verificador: 'Staff-Sala'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error agregando asistente');
      }

      setSuccess(`✅ ¡${data.usuario.nombres} agregado al evento y registrado exitosamente!`);
      eventService.invalidateAttendeeCache(parseInt(eventoId));
      eventService.clearVerificationCache();
      await cargarAsistentes(true);

    } catch (error) {
      console.error('Error agregando asistente:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setScannerLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearHora = (fecha) => {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar asistentes
  const asistentesFiltrados = asistentes.filter(asistente => {
    switch (filtroAsistentes) {
      case 'presente': return asistente.estado === 'presente';
      case 'ausente': return asistente.estado === 'ausente';
      default: return true;
    }
  });

  const estadisticas = {
    total: asistentes.length,
    presentes: asistentes.filter(a => a.estado === 'presente').length,
    ausentes: asistentes.filter(a => a.estado === 'ausente').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (!eventoInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Evento no encontrado</h3>
          <button
            onClick={() => navigate('/verificarSala')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🎯 HEADER SUPERIOR - PRIORIDAD 1 */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-800 truncate flex-1 mr-3">
              {eventoInfo.titulo_charla}
            </h1>
            <button
              onClick={() => navigate('/verificarSala')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors flex-shrink-0"
            >
              ← Volver
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{eventoInfo.sala}</span>
            <span className="mx-2">•</span>
            <span>{eventoInfo.hora}</span>
          </div>
        </div>
      </div>

      {/* 📊 HEADER INFERIOR - PRIORIDAD 2 */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{eventoInfo.registrados || 0}</span> registrados
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-600">{eventoInfo.presentes || 0}</span> presentes
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">
                {eventoInfo.registrados > 0 ? Math.round(((eventoInfo.presentes || 0) / eventoInfo.registrados) * 100) : 0}%
              </span> asistencia
            </div>
          </div>
        </div>
      </div>

      {/* 📱 SECCIÓN PRINCIPAL - ESCÁNER QR - PRIORIDAD 3 */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="w-full">
            <QRScanner 
              onScanSuccess={handleQRScan}
              onScanError={(error) => setError(`Error de escáner: ${error.message}`)}
              isActive={true}
            />
          </div>
        </div>

        {/* Mensajes de Estado */}
        {scannerLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800">Verificando acceso a la sala...</span>
            </div>
          </div>
        )}

        {scanCooldown && !scannerLoading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-yellow-800 text-xl mr-3">⏳</span>
              <span className="text-yellow-800">Esperando 3 segundos antes del próximo escaneo...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-red-800 text-2xl mr-3">❌</span>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-green-800 text-2xl mr-3">✅</span>
              <span className="text-green-800 font-medium">{success}</span>
            </div>
          </div>
        )}

        {/*  SECCIÓN INFERIOR - LISTA DE ASISTENTES - PRIORIDAD 4 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              👥 Asistentes ({asistentesFiltrados.length})
            </h3>
            
            <select
              value={filtroAsistentes}
              onChange={(e) => setFiltroAsistentes(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos</option>
              <option value="presente">Presentes</option>
              <option value="ausente">Ausentes</option>
            </select>
          </div>

          {/* Lista de Asistentes */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {asistentesFiltrados.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-500">
                  {asistentes.length === 0 
                    ? 'Aún no hay asistentes registrados para este evento.'
                    : 'No hay asistentes que coincidan con el filtro seleccionado.'
                  }
                </p>
              </div>
            ) : (
              asistentesFiltrados.map((asistente, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${
                    asistente.estado === 'presente' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 text-sm">{asistente.nombres}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      asistente.estado === 'presente' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {asistente.estado === 'presente' ? '✅ Presente' : '⏳ Ausente'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Empresa:</strong> {asistente.empresa}</p>
                    <p><strong>Cargo:</strong> {asistente.cargo}</p>
                    
                    {asistente.fecha_entrada && (
                      <p>
                        <strong>Entrada:</strong> {formatearHora(asistente.fecha_entrada)}
                      </p>
                    )}
                    
                    {asistente.verificado_por && (
                      <p>
                        <strong>Verificado por:</strong> {asistente.verificado_por}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Botón de Actualizar */}
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => cargarAsistentes(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            >
              🔄 Actualizar Lista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificadorSala; 