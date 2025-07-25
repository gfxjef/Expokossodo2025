import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Globe, 
  FileText, 
  Tag, 
  Building2, 
  Download, 
  MessageSquare, 
  Link as LinkIcon,
  Users
} from 'lucide-react';

const CharlaDetailModal = ({ evento, isOpen, onClose }) => {
  if (!evento) return null;

  // Formatear fecha
  const formatFecha = (fecha) => {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Formatear hora
  const formatHora = (hora) => {
    return hora.replace('-', ' - ');
  };

  // Calcular ocupación
  const ocupacionPorcentaje = evento.slots_disponibles > 0 
    ? Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100) 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Compacto */}
            <div className="relative bg-gradient-to-r from-[#6cb79a]/10 to-[#1f2f56]/10 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight line-clamp-2">
                    {evento.titulo_charla}
                  </h2>
                  
                  {/* Información básica en fila compacta */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-[#6cb79a]" />
                      <span>{formatFecha(evento.fecha)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-[#6cb79a]" />
                      <span>{formatHora(evento.hora)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-[#6cb79a]" />
                      <span className="font-medium">{evento.sala}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4 text-[#6cb79a]" />
                      <span>{evento.slots_ocupados}/{evento.slots_disponibles}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      evento.disponible 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {evento.disponible ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                
                {/* Botón cerrar */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-lg flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Contenido Principal - Layout Compacto */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* Columna Principal - 3 columnas */}
                <div className="lg:col-span-3 space-y-4">
                  
                  {/* Expositor y Descripción en una fila */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Información del Expositor */}
                    <div className="bg-gradient-to-br from-[#6cb79a]/5 to-[#1f2f56]/5 rounded-lg p-4 border border-[#6cb79a]/10">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <User className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Expositor
                      </h3>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6cb79a] to-[#1f2f56] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {evento.expositor.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">{evento.expositor}</p>
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <Globe className="w-3 h-3" />
                            <span>{evento.pais}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Marca Patrocinadora */}
                    {evento.marca_nombre && (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                          <Building2 className="w-4 h-4 text-[#6cb79a] mr-2" />
                          Marca
                        </h3>
                        <div className="flex items-center justify-center">
                          {evento.marca_logo ? (
                            <img 
                              src={evento.marca_logo} 
                              alt={evento.marca_nombre}
                              className="h-12 w-auto object-contain"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-[#6cb79a] to-[#1f2f56] rounded flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  {evento.descripcion && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <FileText className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Descripción
                      </h3>
                      <div className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: evento.descripcion
                              .replace(/\n/g, '<br>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Lateral - 1 columna */}
                <div className="space-y-4">
                  
                  {/* Rubros */}
                  {Array.isArray(evento.rubro) && evento.rubro.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <Tag className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Rubros
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {evento.rubro.map((rubro, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-medium"
                          >
                            {rubro}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información de la Sala */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 text-[#6cb79a] mr-2" />
                      Ubicación
                    </h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#6cb79a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[#6cb79a]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{evento.sala}</p>
                        <p className="text-xs text-gray-600">Sala de conferencias</p>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Ocupación */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 text-[#6cb79a] mr-2" />
                      Ocupación
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Participantes</span>
                        <span className="font-medium">{evento.slots_ocupados}/{evento.slots_disponibles}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            ocupacionPorcentaje < 50 ? 'bg-green-500' :
                            ocupacionPorcentaje < 70 ? 'bg-yellow-500' :
                            ocupacionPorcentaje < 90 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${ocupacionPorcentaje}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium text-gray-600">
                          {ocupacionPorcentaje}% ocupado
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Compacto con Botones */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm">
                  <Download className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Descargar Imagen</span>
                </button>
                
                <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm">
                  <MessageSquare className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Obtener Speech</span>
                </button>
                
                <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm">
                  <LinkIcon className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Obtener Link</span>
                </button>
              </div>
              
              <p className="text-center text-xs text-gray-500 mt-3">
                Los botones de acción estarán disponibles próximamente
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CharlaDetailModal; 