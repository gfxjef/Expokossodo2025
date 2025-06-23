import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const LandingPage = ({ onScrollToNext }) => {
  // Estado para el countdown
  const [timeLeft, setTimeLeft] = React.useState(null);
  const [showCountdown, setShowCountdown] = React.useState(true);

  // Calcular tiempo restante hasta el 2 de septiembre de 2025
  React.useEffect(() => {
    const targetDate = new Date('2025-09-02T00:00:00');
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate - now;
      
      if (difference <= 0) {
        setShowCountdown(false);
        return null;
      }
      
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      return { days, hours, minutes, seconds };
    };
    
    // Actualizar inmediatamente
    setTimeLeft(calculateTimeLeft());
    
    // Actualizar cada segundo
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Logos de partners con estados active y hover
  const partners = [
    { name: 'CAMAG', active: 'https://i.ibb.co/LjKTY8n/camag-blanco.webp', hover: 'https://i.ibb.co/YFYknC9N/camag-color.webp' },
    { name: 'CHEM', active: 'https://i.ibb.co/My7PfY0f/chem-blanco.webp', hover: 'https://i.ibb.co/LXZ02Zb3/chem-color.webp' },
    { name: 'AMS', active: 'https://i.ibb.co/LD44PGkG/ams-blanco.webp', hover: 'https://i.ibb.co/Z16k8Xcy/ams-color.webp' },
    { name: 'EVIDENT', active: 'https://i.ibb.co/9MgkP7L/evident-blanco.webp', hover: 'https://i.ibb.co/RpHJ7W0C/evident-color.webp' },
    { name: 'ESCO', active: 'https://i.ibb.co/0RpVnmPF/esco-blanco.webp', hover: 'https://i.ibb.co/wFCJ2RK3/esco-color.webp' },
    { name: 'VACUUBRAND', active: 'https://i.ibb.co/Y4tvtKyb/vacubrand-blanco.webp', hover: 'https://i.ibb.co/8nCL3Ksb/vacubrand-color.webp' },
    { name: 'BINDER', active: 'https://i.ibb.co/sv2g4YPT/binder-blanco.webp', hover: 'https://i.ibb.co/JR51wysn/binder-color.webp' },
    { name: 'LAUDA', active: 'https://i.ibb.co/M5f6dwxS/lauda-blanco.webp', hover: 'https://i.ibb.co/GfrzYHYS/lauda-color.webp' },
    { name: 'SARTORIUS', active: 'https://i.ibb.co/GvJhvb3w/sartorius-blanco.webp', hover: 'https://i.ibb.co/pYPPZ6m/sartorius-color.webp' },
    { name: 'VELP', active: 'https://i.ibb.co/QvT055f5/velp-blanco.webp', hover: 'https://i.ibb.co/tVn3sdB/velp-color.webp' }
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ zIndex: 1 }}>
      {/* Capa de fondo: Video */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
          src="https://github.com/gfxjef/Expokossodo2025/raw/refs/heads/main/frontend/public/video/expo_kssd_2.mp4"
          onError={(e) => {
            // Fallback en caso de error con el video
            console.error('Error loading video:', e);
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
          className="absolute top-6 left-6 md:top-8 md:left-16 lg:left-24 drop-shadow-lg"
          style={{ zIndex: 30, position: 'absolute' }}
        >
          <div className="rounded-lg p-3">
            <img 
              src="https://i.ibb.co/xS9mYqWt/logo-expokssd-mediano.webp"
              alt="EXPO KOSSODO 2025"
              className="w-48 h-16 md:w-72 md:h-40 object-contain"
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

            {/* Countdown si está activo */}
            {showCountdown && timeLeft && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="mb-2 md:mb-8 bg-white/10 md:backdrop-blur-md rounded-2xl p-3 md:p-6 inline-block"
              >
                <p className="text-white/90 text-xs md:text-base mb-2 md:mb-3 font-medium">Faltan para el evento:</p>
                <div className="flex space-x-2 md:space-x-6">
                  <div className="text-center">
                    <div className="text-lg md:text-3xl font-bold text-white">{timeLeft.days}</div>
                    <div className="text-xs md:text-sm text-white/80">días</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg md:text-3xl font-bold text-white">{timeLeft.hours}</div>
                    <div className="text-xs md:text-sm text-white/80">horas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg md:text-3xl font-bold text-white">{timeLeft.minutes}</div>
                    <div className="text-xs md:text-sm text-white/80">minutos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg md:text-3xl font-bold text-white">{timeLeft.seconds}</div>
                    <div className="text-xs md:text-sm text-white/80">segundos</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Botón de acción mejorado */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              onClick={onScrollToNext}
              className="group mt-4 md:mt-6 px-4 md:px-8 py-2 md:py-4 bg-white/15 border-2 rounded-full text-white hover:bg-white/25 transition-all duration-300 backdrop-blur-md shadow-2xl flex items-center space-x-2 md:space-x-3"
              style={{ borderColor: '#6cb79a' }}
            >
              <span className="text-sm md:text-lg font-medium">Aprende más sobre sostenibilidad</span>
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border flex items-center justify-center transition-all duration-300" style={{ borderColor: '#6cb79a', backgroundColor: '#6cb79a' }}>
                <ChevronDown className="h-3 w-3 md:h-4 md:w-4 group-hover:translate-y-1 transition-transform text-white" />
              </div>
            </motion.button>
          </div>
        </div>

        {/* Partners/Sponsors mejorados en la parte inferior derecha */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="absolute bottom-6 right-6 md:bottom-8 md:right-8 max-w-md"
          style={{ zIndex: 30, position: 'absolute' }}
        >
          <div className="backdrop-blur-sm rounded-lg p-4 shadow-xl">
            <div className="text-left md:text-right">
              <div className="text-xs md:text-sm mb-2 md:mb-4 tracking-widest font-medium" style={{ color: '#6cb79a' }}>PARTNERS</div>
              <div className="grid grid-cols-4 gap-2 md:gap-3 items-center">
                {partners.slice(0, 8).map((partner, index) => (
                  <motion.div
                    key={partner.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.1 + index * 0.05 }}
                    className="group relative"
                  >
                    <div className="relative h-[2rem] md:h-[2.5rem] flex items-center justify-center overflow-hidden">
                      <img
                        src={partner.active}
                        alt={partner.name}
                        className="h-full w-auto object-contain transition-all duration-300 group-hover:opacity-0"
                        onError={(e) => {
                          console.error(`Error loading ${partner.name} active logo`);
                          e.target.style.display = 'none';
                        }}
                      />
                      <img
                        src={partner.hover}
                        alt={partner.name}
                        className="absolute inset-0 h-full w-auto object-contain opacity-0 transition-all duration-300 group-hover:opacity-100 mx-auto"
                        onError={(e) => {
                          console.error(`Error loading ${partner.name} hover logo`);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
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