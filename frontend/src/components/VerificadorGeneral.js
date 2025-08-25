import React, { useState } from 'react';
import QRScanner from './QRScanner';
import { analyticsService } from '../services/analytics';
import API_CONFIG from '../config/api.config';

const VerificadorGeneral = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleQRScan = async (qrCode) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Buscar usuario por QR
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

      // ✅ CORRECCIÓN: Guardar el QR original para usarlo en confirmación
      setUserData({
        ...data,
        qr_original: qrCode  // Guardar el QR original escaneado
      });
      
      setSuccess('✅ Usuario encontrado exitosamente');
      analyticsService.trackQRVerification('General', 'Usuario Encontrado');

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setUserData(null);
      analyticsService.trackQRVerification('General', 'Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarAsistencia = async () => {
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
          // ✅ CORRECCIÓN: Usar el QR original en lugar del reconstruido
          qr_code: userData.qr_original || (userData.qr_validado ? Object.values(userData.qr_validado).join('|') : ''),
          verificado_por: 'Staff-Recepción'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error confirmando asistencia');
      }

      setSuccess('🎉 ¡Asistencia confirmada exitosamente!');
      analyticsService.trackQRVerification('General', 'Asistencia Confirmada');
      // Actualizar estado local
      setUserData(prev => ({
        ...prev,
        usuario: {
          ...prev.usuario,
          asistencia_confirmada: true,
          estado_asistencia: 'confirmada'
        }
      }));

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      analyticsService.trackQRVerification('General', 'Error Confirmación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'confirmada': return 'text-green-600 bg-green-100';
      case 'presente': return 'text-green-600 bg-green-100';
      case 'ausente': return 'text-gray-600 bg-gray-100';
      case 'pendiente': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📋 Verificador de Asistencia General
          </h1>
          <p className="text-gray-600">
            Escanea el código QR del asistente para verificar su registro y confirmar su asistencia al evento.
          </p>
        </div>
      </div>

      {/* Contenido Principal - 2 Columnas */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMNA IZQUIERDA - Escáner QR */}
        <div className="space-y-4">
          <QRScanner 
            onScanSuccess={handleQRScan}
            onScanError={(error) => setError(`Error de escáner: ${error.message}`)}
            isActive={true}
          />

          {/* Mensajes de Estado */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Procesando código QR...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-red-800 text-2xl mr-3">❌</span>
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-green-800 text-2xl mr-3">✅</span>
                <span className="text-green-800 font-medium">{success}</span>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA - Información del Asistente */}
        <div className="space-y-6">
          {!userData ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Esperando escaneo de código QR
              </h3>
              <p className="text-gray-500">
                La información del asistente aparecerá aquí después de escanear un código QR válido.
              </p>
            </div>
          ) : (
            <>
              {/* Información Personal */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    👤 Información del Asistente
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(userData.usuario.estado_asistencia)}`}>
                    {userData.usuario.estado_asistencia === 'confirmada' ? '✅ Confirmado' : '⏳ Pendiente'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
                    <p className="text-lg font-semibold text-gray-800">{userData.usuario.nombres}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-gray-700">{userData.usuario.correo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Empresa</label>
                    <p className="text-gray-700">{userData.usuario.empresa}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Cargo</label>
                    <p className="text-gray-700">{userData.usuario.cargo}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono</label>
                    <p className="text-gray-700">{userData.usuario.numero}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Fecha de Registro</label>
                    <p className="text-gray-700">
                      {userData.usuario.fecha_registro ? 
                        new Date(userData.usuario.fecha_registro).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'No disponible'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Eventos Registrados */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  📅 Eventos Registrados ({userData.eventos?.length || 0})
                </h3>
                
                {userData.eventos && userData.eventos.length > 0 ? (
                  <div className="space-y-3">
                    {userData.eventos.map((evento, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">{evento.titulo_charla}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getEstadoColor(evento.estado_sala)}`}>
                            {evento.estado_sala === 'presente' ? '✅ Presente' : '⏳ Ausente'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><strong>📅 Fecha:</strong> {new Date(evento.fecha).toLocaleDateString('es-ES')}</p>
                          <p><strong>🕐 Hora:</strong> {evento.hora}</p>
                          <p><strong>🏛️ Sala:</strong> {evento.sala}</p>
                          <p><strong>👨‍💼 Expositor:</strong> {evento.expositor} ({evento.pais})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay eventos registrados para este usuario.
                  </p>
                )}
              </div>

              {/* Botón de Confirmación */}
              {userData.usuario.estado_asistencia !== 'confirmada' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <button
                    onClick={handleConfirmarAsistencia}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Confirmando...
                      </span>
                    ) : (
                      '✅ Confirmar Asistencia General'
                    )}
                  </button>
                </div>
              )}

              {/* Estadísticas Rápidas */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Resumen</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{userData.eventos?.length || 0}</div>
                    <div className="text-sm text-gray-600">Eventos Registrados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {userData.eventos?.filter(e => e.estado_sala === 'presente').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Asistencias Confirmadas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {userData.eventos?.filter(e => e.estado_sala === 'ausente').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Pendientes</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificadorGeneral; 