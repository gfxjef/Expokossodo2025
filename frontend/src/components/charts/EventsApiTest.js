import React, { useState, useEffect } from 'react';
import { visualizacionService } from '../../services/visualizacionService';

const EventsApiTest = () => {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    testApiData();
  }, []);

  const testApiData = async () => {
    try {
      setLoading(true);
      
      // Probar diferentes endpoints
      console.log('🔍 Probando getEventos()...');
      const eventosData = await visualizacionService.getEventos();
      console.log('📊 Datos de getEventos():', eventosData);
      
      console.log('🔍 Probando getEventosPorFecha()...');
      const eventosPorFecha = await visualizacionService.getEventosPorFecha();
      console.log('📊 Datos de getEventosPorFecha():', eventosPorFecha);
      
      setApiData({
        eventos: eventosData,
        eventosPorFecha: eventosPorFecha
      });
      
    } catch (err) {
      console.error('❌ Error en prueba API:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Cargando datos de prueba...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700">Error: {error}</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔍 Prueba de API de Eventos</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">getEventos() - Tipo: {typeof apiData?.eventos}</h4>
          <p>Es array: {Array.isArray(apiData?.eventos) ? 'Sí' : 'No'}</p>
          <p>Cantidad de elementos: {
            Array.isArray(apiData?.eventos) 
              ? apiData.eventos.length 
              : Object.keys(apiData?.eventos || {}).length
          }</p>
          <pre className="bg-white p-2 rounded text-xs max-h-32 overflow-auto">
            {JSON.stringify(apiData?.eventos, null, 2)}
          </pre>
        </div>
        
        <div>
          <h4 className="font-semibold">getEventosPorFecha() - Tipo: {typeof apiData?.eventosPorFecha}</h4>
          <p>Es array: {Array.isArray(apiData?.eventosPorFecha) ? 'Sí' : 'No'}</p>
          <p>Cantidad de elementos: {
            Array.isArray(apiData?.eventosPorFecha) 
              ? apiData.eventosPorFecha.length 
              : Object.keys(apiData?.eventosPorFecha || {}).length
          }</p>
          <pre className="bg-white p-2 rounded text-xs max-h-32 overflow-auto">
            {JSON.stringify(apiData?.eventosPorFecha, null, 2)}
          </pre>
        </div>
      </div>
      
      <button 
        onClick={testApiData}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        🔄 Recargar Datos
      </button>
    </div>
  );
};

export default EventsApiTest; 