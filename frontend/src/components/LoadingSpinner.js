import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'large', message = 'Cargando...', className = '' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
    xlarge: 'h-16 w-16'
  };
  
  const containerClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8',
    xlarge: 'p-12'
  };
  
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`text-center ${containerClasses[size]}`}
      >
        {/* Logo animado */}
        <motion.div
          className="mb-6"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-6xl font-bold text-gradient mb-2">
            ExpoKossodo
          </div>
          <div className="text-primary-600 font-medium">2024</div>
        </motion.div>
        
        {/* Spinner principal */}
        <div className="relative mb-6">
          {/* Círculo exterior */}
          <motion.div
            className={`${sizeClasses[size]} border-4 border-primary-200 rounded-full mx-auto`}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className={`${sizeClasses[size]} border-4 border-transparent border-t-primary-600 rounded-full`}></div>
          </motion.div>
          
          {/* Círculo interior */}
          <motion.div
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
              size === 'large' || size === 'xlarge' ? 'h-6 w-6' : 'h-4 w-4'
            } border-2 border-transparent border-b-primary-400 rounded-full`}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          ></motion.div>
        </div>
        
        {/* Mensaje de carga */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h3 className="text-lg font-semibold text-gray-800">{message}</h3>
          
          {/* Puntos animados */}
          <div className="flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-primary-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Preparando el mejor evento médico del año...
          </p>
        </motion.div>
        
        {/* Indicador de progreso */}
        <motion.div
          className="mt-8 w-64 mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Componente de spinner pequeño para usar dentro de botones o formularios
export const SmallSpinner = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <motion.div
        className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};

// Componente de spinner para overlay
export const OverlaySpinner = ({ message = 'Procesando...', isVisible = true }) => {
  if (!isVisible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl p-8 shadow-2xl max-w-sm w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            className="h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{message}</h3>
          <p className="text-sm text-gray-600">Por favor espera...</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Componente de skeleton loader para tarjetas
export const SkeletonCard = () => {
  return (
    <div className="h-32 bg-gray-100 rounded-lg border border-gray-200 p-3 animate-pulse">
      <div className="flex justify-between items-start mb-2">
        <div className="h-4 bg-gray-300 rounded w-16"></div>
        <div className="h-4 bg-gray-300 rounded w-12"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 rounded w-full"></div>
        <div className="h-3 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
      </div>
      <div className="flex justify-between items-center mt-3">
        <div className="h-3 bg-gray-300 rounded w-12"></div>
        <div className="h-3 bg-gray-300 rounded w-8"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 