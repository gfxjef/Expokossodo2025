import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ className = '' }) => {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-b from-[#01295c] to-[#1d2236] text-white ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center p-8 flex flex-col items-center w-full px-4 sm:px-6 lg:px-8"
      >
        {/* Logo */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <img
            src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
            alt="ExpoKossodo"
            className="w-48 h-16 md:w-64 md:h-20 object-contain"
          />
        </motion.div>
        
        {/* Mensaje de carga */}
        <motion.p
            className="text-lg md:text-xl text-white/80 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
        >
            Preparando el mejor evento sostenible...
        </motion.p>
        
        {/* Indicador de progreso */}
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-[#6cb79a] rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
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