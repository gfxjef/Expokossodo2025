import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRScanner from './QRScanner';

const VerificadorSala = () => {
  const { eventoId } = useParams();
  const navigate = useNavigate();
  
  const [eventoInfo, setEventoInfo] = useState(null);
  const [asistentes, setAsistentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filtroAsistentes, setFiltroAsistentes] = useState('todos'); // todos, presente, ausente

  // Cargar información del evento y asistentes
  useEffect(() => {
    if (eventoId) {
      cargarDatosEvento();
    }
  }, [eventoId]);

  const cargarDatosEvento = async () => {
    try {
      setLoading(true);
      
      // Cargar información del evento desde la lista de eventos
      const eventosResponse = await fetch('http://localhost:5000/api/verificar-sala/eventos');
      if (!eventosResponse.ok) throw new Error('Error cargando eventos');
      
      const eventosData = await eventosResponse.json();
      const evento = eventosData.eventos.find(e => e.id === parseInt(eventoId));
      
      if (!evento) {
        throw new Error('Evento no encontrado');
      }
      
      setEventoInfo(evento);

      // Cargar asistentes del evento
      await cargarAsistentes();
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarAsistentes = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/verificar-sala/asistentes/${eventoId}`);
      
      if (!response.ok) {
        throw new Error('Error cargando asistentes');
      }

      const data = await response.json();
      setAsistentes(data.asistentes || []);
      
    } catch (error) {
      console.error('Error cargando asistentes:', error);
      // No mostrar error aquí porque puede ser normal que no haya asistentes aún
    }
  };

  const handleQRScan = async (qrCode) => {
    setScannerLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:5000/api/verificar-sala/verificar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qr_code: qrCode,
          evento_id: parseInt(eventoId),
          verificado_por: 'Staff-Sala'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error verificando asistencia');
      }

      setSuccess(`✅ ¡${data.usuario.nombres} registrado exitosamente en la sala!`);
      
      // Recargar asistentes para mostrar la nueva entrada
      await cargarAsistentes();

    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
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
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header del Evento */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                🎯 {eventoInfo.titulo_charla}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="text-lg mr-2">📅</span>
                  <span>{formatearFecha(eventoInfo.fecha)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg mr-2">🕐</span>
                  <span>{eventoInfo.hora}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg mr-2">🏛️</span>
                  <span>{eventoInfo.sala}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-lg mr-2">👨‍💼</span>
                  <span>{eventoInfo.expositor}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/verificarSala')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Volver
            </button>
          </div>

          {/* Estadísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{estadisticas.total}</div>
              <div className="text-sm text-blue-800">Total Registrados</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{estadisticas.presentes}</div>
              <div className="text-sm text-green-800">Presentes</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{estadisticas.ausentes}</div>
              <div className="text-sm text-orange-800">Ausentes</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {estadisticas.total > 0 ? Math.round((estadisticas.presentes / estadisticas.total) * 100) : 0}%
              </div>
              <div className="text-sm text-purple-800">Asistencia</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal - 2 Columnas */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUMNA IZQUIERDA - Escáner QR */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              📱 Escáner de Asistencia
            </h3>
            <QRScanner 
              onScanSuccess={handleQRScan}
              onScanError={(error) => setError(`Error de escáner: ${error.message}`)}
              isActive={true}
            />
          </div>

          {/* Mensajes de Estado */}
          {scannerLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Verificando acceso a la sala...</span>
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

          {/* Instrucciones */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">📋 Instrucciones</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Solicita al asistente mostrar su código QR</p>
              <p>• Centra el código en el área del escáner</p>
              <p>• El sistema verificará automáticamente el acceso</p>
              <p>• Solo pueden ingresar usuarios registrados para este evento</p>
              <p>• No se permiten entradas duplicadas</p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA - Lista de Asistentes */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                👥 Asistentes ({asistentesFiltrados.length})
              </h3>
              
              {/* Filtro de Asistentes */}
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
            <div className="max-h-96 overflow-y-auto space-y-3">
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
                    className={`border rounded-lg p-4 ${
                      asistente.estado === 'presente' 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">{asistente.nombres}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        asistente.estado === 'presente' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {asistente.estado === 'presente' ? '✅ Presente' : '⏳ Ausente'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>📧 Email:</strong> {asistente.correo}</p>
                      <p><strong>🏢 Empresa:</strong> {asistente.empresa}</p>
                      <p><strong>💼 Cargo:</strong> {asistente.cargo}</p>
                      
                      {asistente.fecha_entrada && (
                        <p>
                          <strong>🕐 Entrada:</strong> {formatearHora(asistente.fecha_entrada)}
                        </p>
                      )}
                      
                      {asistente.verificado_por && (
                        <p>
                          <strong>👤 Verificado por:</strong> {asistente.verificado_por}
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
                onClick={cargarAsistentes}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                🔄 Actualizar Lista
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificadorSala; 