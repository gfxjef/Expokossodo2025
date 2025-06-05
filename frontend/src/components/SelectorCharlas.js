import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SelectorCharlas = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroSala, setFiltroSala] = useState('');
  const navigate = useNavigate();

  // Cargar eventos al montar el componente
  useEffect(() => {
    cargarEventos();
  }, []);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/verificar-sala/eventos');
      
      if (!response.ok) {
        throw new Error('Error cargando eventos');
      }

      const data = await response.json();
      setEventos(data.eventos || []);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarEvento = (eventoId) => {
    navigate(`/verificarSala/${eventoId}`);
  };

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(evento => {
    const cumpleFecha = !filtroFecha || evento.fecha.includes(filtroFecha);
    const cumpleSala = !filtroSala || evento.sala.toLowerCase().includes(filtroSala.toLowerCase());
    return cumpleFecha && cumpleSala;
  });

  // Obtener fechas únicas para el filtro
  const fechasUnicas = [...new Set(eventos.map(evento => evento.fecha))].sort();
  const salasUnicas = [...new Set(eventos.map(evento => evento.sala))].sort();

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'programado': return 'bg-blue-100 text-blue-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🏛️ Verificador por Sala
              </h1>
              <p className="text-gray-600">
                Selecciona un evento para verificar asistencias específicas por sala.
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Volver
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Filtrar por Fecha
              </label>
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las fechas</option>
                {fechasUnicas.map(fecha => (
                  <option key={fecha} value={fecha}>
                    {formatearFecha(fecha)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏛️ Filtrar por Sala
              </label>
              <select
                value={filtroSala}
                onChange={(e) => setFiltroSala(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las salas</option>
                {salasUnicas.map(sala => (
                  <option key={sala} value={sala}>
                    {sala}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={cargarEventos}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🔄 Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{eventos.length}</div>
            <div className="text-sm text-gray-600">Total Eventos</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{eventosFiltrados.length}</div>
            <div className="text-sm text-gray-600">Eventos Filtrados</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{fechasUnicas.length}</div>
            <div className="text-sm text-gray-600">Días de Evento</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{salasUnicas.length}</div>
            <div className="text-sm text-gray-600">Salas Disponibles</div>
          </div>
        </div>
      </div>

      {/* Grid de Eventos */}
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-800 text-2xl mr-3">❌</span>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {eventosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No hay eventos disponibles
            </h3>
            <p className="text-gray-500">
              {eventos.length === 0 
                ? 'No se encontraron eventos en el sistema.'
                : 'Los filtros aplicados no coinciden con ningún evento.'
              }
            </p>
            {eventos.length > 0 && eventosFiltrados.length === 0 && (
              <button
                onClick={() => {
                  setFiltroFecha('');
                  setFiltroSala('');
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventosFiltrados.map((evento) => (
              <div
                key={evento.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
                onClick={() => handleSeleccionarEvento(evento.id)}
              >
                <div className="p-6">
                  {/* Header del Evento */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                        {evento.titulo_charla}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(evento.estado)}`}>
                        {evento.estado || 'Programado'}
                      </span>
                    </div>
                  </div>

                  {/* Información del Evento */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg mr-2">📅</span>
                      <span>{formatearFecha(evento.fecha)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg mr-2">🕐</span>
                      <span>{evento.hora}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg mr-2">🏛️</span>
                      <span>{evento.sala}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg mr-2">👨‍💼</span>
                      <span>{evento.expositor}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="text-lg mr-2">🌍</span>
                      <span>{evento.pais}</span>
                    </div>
                  </div>

                  {/* Estadísticas del Evento */}
                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-xl font-bold text-blue-600">
                          {evento.total_registrados || 0}
                        </div>
                        <div className="text-xs text-gray-600">Registrados</div>
                      </div>
                      <div>
                        <div className="text-xl font-bold text-green-600">
                          {evento.total_presentes || 0}
                        </div>
                        <div className="text-xs text-gray-600">Presentes</div>
                      </div>
                    </div>
                  </div>

                  {/* Botón de Acción */}
                  <div className="mt-4">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                      📱 Verificar Asistencias
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectorCharlas; 