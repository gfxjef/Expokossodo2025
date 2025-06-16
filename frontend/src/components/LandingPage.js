import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const LandingPage = ({ onScrollToNext }) => {
  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ zIndex: 1 }}>
      {/* Capa de fondo: Imagen */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <img 
          src="https://www.comexperu.org.pe/upload/images/comercio-exterior-300922-111503.jpg"
          alt="Background"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback en caso de error con la imagen
            e.target.style.display = 'none';
            e.target.parentElement.style.background = 'linear-gradient(135deg, #1e3a8a, #1e40af, #1e3a8a)';
          }}
        />
      </div>

      {/* Capa de overlay: Color negro semitransparente */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/60 to-black/70" style={{ zIndex: 2 }}></div>

      {/* Capa de contenido: Todos los elementos visibles */}
      <div className="relative h-full" style={{ zIndex: 20, position: 'relative' }}>
        
        {/* Logo completo en la esquina superior izquierda */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-6 left-6 md:top-8 md:left-8 drop-shadow-lg"
          style={{ zIndex: 30, position: 'absolute' }}
        >
          <div className="rounded-lg p-3">
            <img 
              src="https://i.ibb.co/xS9mYqWt/logo-expokssd-mediano.webp"
              alt="EXPO KOSSODO 2025"
              className="w-36 h-12 md:w-72 md:h-40 object-contain"
              onError={(e) => {
                console.log('Error loading logo image');
                e.target.style.display = 'none';
              }}
            />
          </div>
        </motion.div>

        {/* Contenido principal centrado */}
        <div className="absolute inset-0 flex flex-col justify-center items-start px-6 md:px-16 lg:px-24" style={{ zIndex: 30, position: 'absolute' }}>
          <div className="max-w-5xl">
            {/* Título principal con mejor contraste */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-white mb-6 leading-tight drop-shadow-2xl">
                <span className="block bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  Preparando
                </span>
                <span className="block font-normal text-white drop-shadow-lg">
                  el futuro para ti.
                </span>
              </h1>
            </motion.div>

            {/* Botón de acción mejorado */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              onClick={onScrollToNext}
              className="group mt-6 px-8 py-4 bg-white/15 border-2 rounded-full text-white hover:bg-white/25 transition-all duration-300 backdrop-blur-md shadow-2xl flex items-center space-x-3"
              style={{ borderColor: '#6cb79a' }}
            >
              <span className="text-lg font-medium">Aprende más sobre sostenibilidad</span>
              <div className="w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300" style={{ borderColor: '#6cb79a', backgroundColor: '#6cb79a' }}>
                <ChevronDown className="h-4 w-4 group-hover:translate-y-1 transition-transform text-white" />
              </div>
            </motion.button>
          </div>
        </div>

        {/* Partners/Sponsors mejorados en la parte inferior derecha */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="absolute bottom-6 right-6 md:bottom-8 md:right-8"
          style={{ zIndex: 30, position: 'absolute' }}
        >
          <div className="backdrop-blur-sm rounded-lg p-4 shadow-xl">
            <div className="text-right">
              <div className="text-xs md:text-sm mb-3 tracking-widest font-medium" style={{ color: '#6cb79a' }}>PARTNERS</div>
              <div className="flex flex-col md:flex-row items-end md:items-center space-y-2 md:space-y-0 md:space-x-6 text-white">
                <div className="text-sm md:text-lg font-bold drop-shadow-md">BINDER</div>
                <div className="text-sm md:text-lg font-bold drop-shadow-md">SARTORIS</div>
                <div className="text-sm md:text-lg font-bold drop-shadow-md">velp</div>
                <div className="text-sm md:text-lg font-bold drop-shadow-md">VACUUBRAND</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Indicador de scroll mejorado */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
          style={{ zIndex: 30, position: 'absolute' }}
        >
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="cursor-pointer flex flex-col items-center space-y-2"
            onClick={onScrollToNext}
          >
            <div className="text-white/90 text-sm tracking-wider">SCROLL</div>
            <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/25 transition-all duration-300">
              <ChevronDown className="h-5 w-5 text-white" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingPage; 