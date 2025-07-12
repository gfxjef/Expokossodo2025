import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building,
  MapPin,
  Clock,
  Target,
  Award,
  Activity,
  Calendar
} from 'lucide-react';

const EstadisticasAvanzadas = ({ 
  registros, 
  empresasTop, 
  cargosTop, 
  registrosPorDia, 
  registrosPorCharla,
  resumenStats 
}) => {
  
  // Análisis de tendencias
  const getTendencia = () => {
    if (registrosPorDia.length < 2) return { tipo: 'estable', porcentaje: 0 };
    
    const ultimosDias = registrosPorDia.slice(-2);
    const diferencia = ultimosDias[1].cantidad - ultimosDias[0].cantidad;
    const porcentaje = Math.abs((diferencia / ultimosDias[0].cantidad) * 100).toFixed(1);
    
    return {
      tipo: diferencia > 0 ? 'subida' : diferencia < 0 ? 'bajada' : 'estable',
      porcentaje: porcentaje
    };
  };

  // Análisis de diversidad empresarial
  const getDiversidadEmpresarial = () => {
    const totalEmpresas = empresasTop.length;
    const empresasConUnSoloRegistro = empresasTop.filter(e => e.cantidad === 1).length;
    const porcentajeDiversidad = ((empresasConUnSoloRegistro / totalEmpresas) * 100).toFixed(1);
    
    return {
      totalEmpresas,
      empresasConUnSoloRegistro,
      porcentajeDiversidad
    };
  };

  // Análisis de popularidad de charlas
  const getAnalisisCharlas = () => {
    if (registrosPorCharla.length === 0) return { capacidadPromedio: 0, charlasPopulares: 0 };
    
    const totalRegistros = registrosPorCharla.reduce((acc, charla) => acc + charla.registrados, 0);
    const capacidadPromedio = (totalRegistros / registrosPorCharla.length).toFixed(1);
    const charlasPopulares = registrosPorCharla.filter(charla => 
      charla.registrados > capacidadPromedio
    ).length;
    
    return {
      capacidadPromedio,
      charlasPopulares
    };
  };

  // Análisis de cargos
  const getAnalisisCargos = () => {
    const cargosDirectivos = cargosTop.filter(cargo => 
      cargo.cargo.toLowerCase().includes('director') || 
      cargo.cargo.toLowerCase().includes('gerente') || 
      cargo.cargo.toLowerCase().includes('presidente') ||
      cargo.cargo.toLowerCase().includes('ceo')
    );
    const totalDirectivos = cargosDirectivos.reduce((acc, cargo) => acc + cargo.cantidad, 0);
    
    return {
      totalDirectivos,
      porcentajeDirectivos: ((totalDirectivos / resumenStats.totalRegistros) * 100).toFixed(1)
    };
  };

  const tendencia = getTendencia();
  const diversidadEmpresarial = getDiversidadEmpresarial();
  const analisisCharlas = getAnalisisCharlas();
  const analisisCargos = getAnalisisCargos();

  return (
    <div className="space-y-6">
      {/* Métricas de rendimiento */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
          <Activity className="h-5 w-5 text-[#6cb79a]" />
          <span>Métricas de Rendimiento</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tendencia de registros */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">Tendencia</span>
              {tendencia.tipo === 'subida' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : tendencia.tipo === 'bajada' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Activity className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div className="text-xl font-bold text-blue-600">
              {tendencia.porcentaje}%
            </div>
            <div className="text-xs text-blue-600">
              {tendencia.tipo === 'subida' ? 'Crecimiento' : 
               tendencia.tipo === 'bajada' ? 'Descenso' : 'Estable'}
            </div>
          </div>

          {/* Diversidad empresarial */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-600">Diversidad</span>
              <Building className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-xl font-bold text-green-600">
              {diversidadEmpresarial.totalEmpresas}
            </div>
            <div className="text-xs text-green-600">
              Empresas diferentes
            </div>
          </div>

          {/* Charlas populares */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-600">Charlas</span>
              <Award className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-purple-600">
              {analisisCharlas.charlasPopulares}
            </div>
            <div className="text-xs text-purple-600">
              Sobre el promedio
            </div>
          </div>

          {/* Nivel directivo */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-600">Directivos</span>
              <Target className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-orange-600">
              {analisisCargos.porcentajeDirectivos}%
            </div>
            <div className="text-xs text-orange-600">
              Nivel gerencial
            </div>
          </div>
        </div>
      </motion.div>

      {/* Análisis detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Análisis de participación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Users className="h-5 w-5 text-[#6cb79a]" />
            <span>Análisis de Participación</span>
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">Promedio charlas/usuario</span>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {resumenStats.promedioCharlasPorUsuario}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700">Capacidad promedio/charla</span>
              </div>
              <span className="text-sm font-bold text-green-600">
                {analisisCharlas.capacidadPromedio}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Registros últimas 24h</span>
              </div>
              <span className="text-sm font-bold text-purple-600">
                {resumenStats.registrosUltimas24h}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Top empresas con detalles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Building className="h-5 w-5 text-[#6cb79a]" />
            <span>Empresas Destacadas</span>
          </h4>
          
          <div className="space-y-3">
            {empresasTop.slice(0, 5).map((empresa, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {empresa.empresa}
                    </div>
                    <div className="text-xs text-gray-500">
                      {((empresa.cantidad / resumenStats.totalRegistros) * 100).toFixed(1)}% del total
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#6cb79a]">
                  {empresa.cantidad}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Insights y recomendaciones */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200"
      >
        <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <span>Insights y Recomendaciones</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">🎯 Participación</h5>
            <p className="text-sm text-gray-600">
              Con {resumenStats.promedioCharlasPorUsuario} charlas por usuario en promedio, 
              el nivel de engagement es {resumenStats.promedioCharlasPorUsuario > 2 ? 'excelente' : 'bueno'}.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">🏢 Diversidad</h5>
            <p className="text-sm text-gray-600">
              {diversidadEmpresarial.totalEmpresas} empresas participan, 
              con {diversidadEmpresarial.porcentajeDiversidad}% representando participación única.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">👥 Perfil Audiencia</h5>
            <p className="text-sm text-gray-600">
              {analisisCargos.porcentajeDirectivos}% de los registrados tienen cargos directivos, 
              indicando un perfil {analisisCargos.porcentajeDirectivos > 30 ? 'senior' : 'mixto'}.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h5 className="font-semibold text-gray-900 mb-2">📈 Tendencia</h5>
            <p className="text-sm text-gray-600">
              La tendencia de registros muestra un {tendencia.tipo} de {tendencia.porcentaje}% 
              en el período reciente.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EstadisticasAvanzadas; 