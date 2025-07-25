import React, { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, Calendar, Building2, Globe, Tag } from 'lucide-react';
import CharlaDetailModal from './CharlaDetailModal';

const EventRow = memo(({ evento, index }) => {
  const [showModal, setShowModal] = useState(false);

  // Calcular porcentaje de ocupación
  const ocupacionPorcentaje = evento.slots_disponibles > 0 
    ? Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100) 
    : 0;

  // Determinar color de ocupación
  const getOcupacionColor = (porcentaje) => {
    if (porcentaje < 50) return 'bg-green-500';
    if (porcentaje < 70) return 'bg-yellow-500';
    if (porcentaje < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Determinar color de estado
  const getEstadoColor = (disponible) => {
    return disponible 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Formatear hora para mostrar
  const formatHora = (hora) => {
    return hora.replace('-', ' - ');
  };

  const handleCardClick = () => {
    setShowModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:border-[#6cb79a]/30 cursor-pointer group relative"
        onClick={handleCardClick}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Hora y Sala - 2 columnas */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-[#6cb79a]" />
              <span className="font-semibold text-gray-800 text-sm">
                {formatHora(evento.hora)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600 font-medium">
                {evento.sala}
              </span>
            </div>
          </div>
          
          {/* Rubro - 1 columna (donde estaba la sala) */}
          <div className="lg:col-span-1">
            {Array.isArray(evento.rubro) && evento.rubro.length > 0 ? (
              <div className="flex flex-col space-y-1">
                {evento.rubro.slice(0, 2).map((rubro, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-medium text-center"
                  >
                    {rubro}
                  </span>
                ))}
                {evento.rubro.length > 2 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded font-medium text-center">
                    +{evento.rubro.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="text-xs text-gray-400 italic">Sin rubro</span>
              </div>
            )}
          </div>
          
          {/* Título - 4 columnas */}
          <div className="lg:col-span-4">
            <h3 className="font-medium text-gray-900 text-sm leading-tight mb-1 group-hover:text-[#6cb79a] transition-colors">
              {evento.titulo_charla}
            </h3>
            {evento.marca_nombre && (
              <div className="flex items-center space-x-2">
                <Building2 className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">
                  {evento.marca_nombre}
                </span>
              </div>
            )}
          </div>
          
          {/* Expositor - 2 columnas */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4 text-[#6cb79a]" />
              <p className="text-sm text-gray-700 font-medium">
                {evento.expositor}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">
                {evento.pais}
              </p>
            </div>
          </div>
          
          {/* Cupos - 2 columnas */}
          <div className="lg:col-span-2">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-800">
                  {evento.slots_ocupados}/{evento.slots_disponibles}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  className={`h-2 rounded-full ${getOcupacionColor(ocupacionPorcentaje)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${ocupacionPorcentaje}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {ocupacionPorcentaje}% ocupado
              </p>
            </div>
          </div>
          
          {/* Estado - 1 columna */}
          <div className="lg:col-span-1">
            <div className="flex justify-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(evento.disponible)}`}>
                {evento.disponible ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        </div>

        {/* Información adicional en móvil */}
        <div className="lg:hidden mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#6cb79a]" />
              <span className="text-gray-600">{formatHora(evento.hora)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{evento.sala}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#6cb79a]" />
              <span className="text-gray-600">{evento.expositor}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{evento.pais}</span>
            </div>
            {/* Agregar rubros en móvil */}
            {Array.isArray(evento.rubro) && evento.rubro.length > 0 && (
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  <div className="flex flex-wrap gap-1">
                    {evento.rubro.map((rubro, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded font-medium"
                      >
                        {rubro}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Indicador de click */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-2 h-2 bg-[#6cb79a] rounded-full"></div>
        </div>
      </motion.div>

      {/* Modal de Detalles */}
      <CharlaDetailModal
        evento={evento}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
});

EventRow.displayName = 'EventRow';

export default EventRow; 