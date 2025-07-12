import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Calendar,
  Clock,
  MapPin,
  Globe,
  TrendingUp,
  UserCheck,
  Building,
  Target,
  Eye,
  Filter
} from 'lucide-react';
import { visualizacionUtils } from '../../services/visualizacionService';

const CharlaDetailModal = ({ 
  isOpen, 
  onClose, 
  charla, 
  registrados,
  onVerRegistrados 
}) => {
  if (!isOpen || !charla) return null;

  // Normalizar datos para soportar ambas estructuras (gráficos vs programación)
  const normalizarCharla = (charlaData) => {
    return {
      // Título: usar titulo_charla (programación) o titulo (gráficos)
      titulo: charlaData.titulo_charla || charlaData.titulo,
      titulo_charla: charlaData.titulo_charla || charlaData.titulo,
      
      // Registrados: usar slots_ocupados (programación) o registrados (gráficos)
      registrados: charlaData.slots_ocupados !== undefined ? charlaData.slots_ocupados : charlaData.registrados,
      slots_ocupados: charlaData.slots_ocupados !== undefined ? charlaData.slots_ocupados : charlaData.registrados,
      
      // Cupos totales: usar slots_disponibles (programación) o 60 por defecto (gráficos)
      slots_disponibles: charlaData.slots_disponibles || 60,
      
      // Resto de propiedades mantenerlas tal como están
      expositor: charlaData.expositor,
      fecha: charlaData.fecha,
      hora: charlaData.hora,
      sala: charlaData.sala,
      pais: charlaData.pais,
      disponible: charlaData.disponible
    };
  };

  const charlaNormalizada = normalizarCharla(charla);

  // Calcular estadísticas de la charla
  const totalCupos = charlaNormalizada.slots_disponibles;
  const registradosCount = charlaNormalizada.registrados || 0;
  const porcentajeOcupacion = ((registradosCount / totalCupos) * 100).toFixed(1);
  const cuposDisponibles = totalCupos - registradosCount;

  // Determinar estado de ocupación
  const getEstadoOcupacion = () => {
    const porcentaje = parseFloat(porcentajeOcupacion);
    if (porcentaje >= 90) return { color: 'red', text: 'Casi Lleno', icon: '🔥' };
    if (porcentaje >= 70) return { color: 'orange', text: 'Alta Demanda', icon: '⚠️' };
    if (porcentaje >= 40) return { color: 'green', text: 'Disponible', icon: '✅' };
    return { color: 'gray', text: 'Baja Demanda', icon: '📊' };
  };

  const estadoOcupacion = getEstadoOcupacion();

  // Filtrar registrados que asisten a esta charla específica
  const registradosEstaCharla = (registrados || []).filter(registro => {
    if (!registro.eventos) return false;
    const eventosFormateados = visualizacionUtils.formatearEventos(registro.eventos);
    return eventosFormateados.some(evento => 
      evento.titulo && charlaNormalizada.titulo_charla && 
      evento.titulo.toLowerCase().includes(charlaNormalizada.titulo_charla.toLowerCase().substring(0, 20))
    );
  });

  // Analizar perfil de asistentes
  const analizarPerfil = () => {
    if (registradosEstaCharla.length === 0) return null;

    const empresas = {};
    const cargos = {};

    registradosEstaCharla.forEach(registro => {
      // Contar empresas
      const empresa = registro.empresa || 'Sin especificar';
      empresas[empresa] = (empresas[empresa] || 0) + 1;

      // Contar cargos
      const cargo = registro.cargo || 'Sin especificar';
      cargos[cargo] = (cargos[cargo] || 0) + 1;
    });

    const topEmpresa = Object.entries(empresas).sort(([,a], [,b]) => b - a)[0];
    const topCargo = Object.entries(cargos).sort(([,a], [,b]) => b - a)[0];

    return {
      topEmpresa: topEmpresa ? { nombre: topEmpresa[0], cantidad: topEmpresa[1] } : null,
      topCargo: topCargo ? { nombre: topCargo[0], cantidad: topCargo[1] } : null,
      diversidadEmpresas: Object.keys(empresas).length,
      diversidadCargos: Object.keys(cargos).length
    };
  };

  const perfilAnalisis = analizarPerfil();

  const handleVerRegistrados = () => {
    onVerRegistrados(charlaNormalizada);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#01295c] to-[#1d2236] text-white p-6 rounded-t-xl">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="pr-12">
              <h2 className="text-2xl font-bold mb-2 leading-tight">
                {charlaNormalizada.titulo_charla}
              </h2>
              <p className="text-blue-200 text-lg mb-4">{charlaNormalizada.expositor}</p>
              
              {/* Info básica de la charla */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-300" />
                  <span>{charlaNormalizada.fecha}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-300" />
                  <span>{charlaNormalizada.hora}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-300" />
                  <span>{charlaNormalizada.sala}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-300" />
                  <span>Presencial</span>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas de ocupación */}
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-[#6cb79a]" />
                <span>Estadísticas de Registro</span>
              </h3>
              
              {/* Barra de progreso de ocupación */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Ocupación</span>
                  <span className={`text-sm font-bold ${
                    estadoOcupacion.color === 'red' ? 'text-red-600' :
                    estadoOcupacion.color === 'orange' ? 'text-orange-600' :
                    estadoOcupacion.color === 'green' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {estadoOcupacion.icon} {porcentajeOcupacion}% • {estadoOcupacion.text}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${porcentajeOcupacion}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-3 rounded-full ${
                      estadoOcupacion.color === 'red' ? 'bg-red-500' :
                      estadoOcupacion.color === 'orange' ? 'bg-orange-500' :
                      estadoOcupacion.color === 'green' ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                </div>
              </div>

              {/* Grid de métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{registradosCount}</div>
                  <div className="text-sm text-blue-600">Registrados</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{cuposDisponibles}</div>
                  <div className="text-sm text-green-600">Cupos Libres</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <UserCheck className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{totalCupos}</div>
                  <div className="text-sm text-purple-600">Total Cupos</div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-orange-600">
                    {registradosCount > 0 ? Math.round((registradosCount / totalCupos) * 100) : 0}%
                  </div>
                  <div className="text-sm text-orange-600">Ocupación</div>
                </div>
              </div>
            </div>

            {/* Análisis de perfil de asistentes */}
            {perfilAnalisis && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Building className="h-5 w-5 text-[#6cb79a]" />
                  <span>Perfil de Asistentes</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {perfilAnalisis.topEmpresa && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Empresa Principal</span>
                        <span className="text-xs text-gray-500">{perfilAnalisis.diversidadEmpresas} empresas</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">{perfilAnalisis.topEmpresa.nombre}</div>
                      <div className="text-sm text-gray-600">{perfilAnalisis.topEmpresa.cantidad} registrados</div>
                    </div>
                  )}
                  
                  {perfilAnalisis.topCargo && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">Cargo Predominante</span>
                        <span className="text-xs text-gray-500">{perfilAnalisis.diversidadCargos} cargos</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">{perfilAnalisis.topCargo.nombre}</div>
                      <div className="text-sm text-gray-600">{perfilAnalisis.topCargo.cantidad} personas</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Insights automáticos */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Insights</h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="space-y-2 text-sm">
                  {porcentajeOcupacion >= 80 && (
                    <p className="text-blue-700">
                      🔥 <strong>Alta demanda:</strong> Esta charla tiene más del 80% de ocupación.
                    </p>
                  )}
                  
                  {registradosEstaCharla.length > 0 && perfilAnalisis?.diversidadEmpresas > 5 && (
                    <p className="text-blue-700">
                      🏢 <strong>Gran diversidad:</strong> Asisten {perfilAnalisis.diversidadEmpresas} empresas diferentes.
                    </p>
                  )}
                  
                  {registradosCount < 20 && (
                    <p className="text-blue-700">
                      📈 <strong>Oportunidad:</strong> Aún hay {cuposDisponibles} cupos disponibles para promocionar.
                    </p>
                  )}
                  
                  {registradosCount === 0 && (
                    <p className="text-gray-600">
                      📊 <strong>Sin registros:</strong> Esta charla aún no tiene participantes registrados.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleVerRegistrados}
                disabled={registradosCount === 0}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  registradosCount > 0
                    ? 'bg-[#6cb79a] text-white hover:bg-[#5aa485]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Eye className="h-5 w-5" />
                <span>Ver Lista de Registrados ({registradosCount})</span>
              </button>
              
              <button
                onClick={() => {
                  // Aquí podrías agregar funcionalidad para exportar datos de esta charla específica
                  alert('Funcionalidad de exportación específica - próximamente');
                }}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <Filter className="h-5 w-5" />
                <span>Exportar Datos</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CharlaDetailModal; 