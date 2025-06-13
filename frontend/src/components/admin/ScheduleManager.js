import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ToggleLeft, ToggleRight, Users, Calendar, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const ScheduleManager = () => {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHorarios();
  }, []);

  const loadHorarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getHorarios();
      setHorarios(data);
    } catch (error) {
      console.error('Error loading horarios:', error);
      setError(error.message);
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHorario = async (horario) => {
    const horarioString = horario.horario;
    
    try {
      setUpdating(prev => ({ ...prev, [horarioString]: true }));
      
      const response = await adminService.toggleHorario(horarioString);
      
      // Actualizar el estado local
      setHorarios(prev => prev.map(h => 
        h.horario === horarioString 
          ? { ...h, activo: response.activo }
          : h
      ));
      
      const accion = response.activo ? 'activado' : 'desactivado';
      toast.success(`Horario ${horarioString} ${accion} exitosamente`);
      
    } catch (error) {
      console.error('Error toggling horario:', error);
      toast.error(`Error al cambiar estado del horario: ${error.message}`);
    } finally {
      setUpdating(prev => {
        const newState = { ...prev };
        delete newState[horarioString];
        return newState;
      });
    }
  };

  const getStatusColor = (activo) => {
    return activo ? 'text-green-600' : 'text-red-600';
  };

  const getToggleColor = (activo) => {
    return activo ? 'text-green-500' : 'text-gray-400';
  };

  const getTotalStats = () => {
    const activos = horarios.filter(h => h.activo).length;
    const inactivos = horarios.length - activos;
    const totalEventos = horarios.reduce((sum, h) => sum + h.total_eventos, 0);
    const eventosConRegistros = horarios.reduce((sum, h) => sum + h.eventos_con_registros, 0);
    
    return { activos, inactivos, totalEventos, eventosConRegistros };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-3" />
          <span className="text-lg text-gray-600">Cargando horarios...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error de Conexión</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadHorarios}
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header y Estadísticas */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Gestión de Horarios</h2>
              <p className="text-gray-600">Activar/desactivar horarios del evento</p>
            </div>
          </div>
          <button 
            onClick={loadHorarios}
            className="btn-secondary flex items-center space-x-2"
            disabled={loading}
          >
            <Clock className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-700">Activos</span>
            </div>
            <p className="text-2xl font-bold text-blue-800">{stats.activos}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">Inactivos</span>
            </div>
            <p className="text-2xl font-bold text-red-800">{stats.inactivos}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-purple-700">Total Eventos</span>
            </div>
            <p className="text-2xl font-bold text-purple-800">{stats.totalEventos}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">Con Registros</span>
            </div>
            <p className="text-2xl font-bold text-green-800">{stats.eventosConRegistros}</p>
          </div>
        </div>
      </div>

      {/* Lista de Horarios */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Horarios Disponibles</h3>
        
        <div className="space-y-3">
          <AnimatePresence>
            {horarios.map((horario, index) => (
              <motion.div
                key={horario.horario}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  horario.activo 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <Clock className={`h-6 w-6 mx-auto mb-1 ${getStatusColor(horario.activo)}`} />
                      <div className="font-bold text-gray-800">{horario.horario}</div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Eventos</div>
                        <div className="font-semibold text-gray-800">{horario.total_eventos}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Con Registros</div>
                        <div className="font-semibold text-gray-800">{horario.eventos_con_registros}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Estado</div>
                        <div className={`font-semibold ${getStatusColor(horario.activo)}`}>
                          {horario.activo ? 'Activo' : 'Inactivo'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {horario.eventos_con_registros > 0 && !horario.activo && (
                      <div className="flex items-center space-x-1 text-yellow-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Tiene registros</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleToggleHorario(horario)}
                      disabled={updating[horario.horario]}
                      className={`p-2 rounded-full transition-all duration-200 hover:bg-gray-100 ${
                        updating[horario.horario] ? 'cursor-not-allowed' : 'cursor-pointer'
                      }`}
                      title={`${horario.activo ? 'Desactivar' : 'Activar'} horario`}
                    >
                      {updating[horario.horario] ? (
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                      ) : horario.activo ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Advertencia para horarios con registros */}
                {horario.eventos_con_registros > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <strong>Advertencia:</strong> Este horario tiene {horario.eventos_con_registros} evento(s) con registros. 
                        {!horario.activo && ' Al estar desactivado, estos eventos no serán visibles para los usuarios.'}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ScheduleManager; 