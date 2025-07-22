import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Info, UserPlus, ChevronRight } from 'lucide-react';

const SimpleMenu = ({ 
  activeSection = 'inicio', 
  onSectionChange, 
  className = '',
  textColor = 'text-white',
  hoverColor = 'hover:text-[#6cb79a]',
  mobileMenuBg = 'bg-white/95',
  logoUrl = null
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'inicio', label: 'INICIO', icon: Home },
    { id: 'informacion', label: 'INFORMACIÓN', icon: Info },
    { id: 'registro', label: 'REGISTRO', icon: UserPlus }
  ];

  // Cerrar menú móvil con tecla Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  const handleMenuClick = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Menú Desktop */}
      <nav className={`hidden md:flex items-center space-x-8 ${className}`} style={{ zIndex: 9997 }}>
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleMenuClick(item.id)}
            className={`text-sm font-medium tracking-wider transition-colors duration-300 ${textColor} ${hoverColor} ${
              activeSection === item.id ? 'text-[#6cb79a]' : ''
            } cursor-pointer relative`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ zIndex: 9997 }}
          >
            {item.label}
          </motion.button>
        ))}
      </nav>

      {/* Botón menú móvil */}
      <div className="md:hidden" style={{ zIndex: 9997 }}>
        <motion.button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-3 rounded-xl bg-gradient-to-r from-[#01295c]/20 to-[#1d2236]/20 backdrop-blur-sm border border-white/20 ${textColor} ${hoverColor} transition-all duration-300 cursor-pointer relative shadow-lg hover:shadow-xl`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ zIndex: 9997 }}
        >
          <AnimatePresence mode="wait">
            {isMobileMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X size={24} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu size={24} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Menú móvil rediseñado */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay de fondo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden"
            />
            
            {/* Menú principal */}
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm z-[9999] md:hidden"
            >
              {/* Fondo con gradiente */}
              <div className="h-full bg-gradient-to-br from-[#01295c] via-[#1d2236] to-[#0f172a] relative overflow-hidden">
                {/* Efectos de fondo */}
                <div className="absolute inset-0 opacity-50">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
                </div>
                
                {/* Header del menú */}
                <div className="relative z-10 flex justify-between items-center p-6 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    {logoUrl ? (
                      <img 
                        src={logoUrl}
                        alt="EXPO KOSSODO 2025"
                        className="h-10 object-contain"
                        onError={(e) => {
                          console.log('Error loading menu logo');
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gradient-to-br from-[#6cb79a] to-[#5aa485] rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-sm">EK</span>
                      </div>
                    )}
                    <div>
                      <h2 className="text-white font-bold text-lg">EXPO KOSSODO</h2>
                      <p className="text-[#6cb79a] text-xs font-medium">2025</p>
                    </div>
                  </div>
                  
                  <motion.button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={20} />
                  </motion.button>
                </div>

                {/* Contenido del menú */}
                <div className="relative z-10 p-6">
                  <div className="space-y-2">
                    {menuItems.map((item, index) => {
                      const IconComponent = item.icon;
                      const isActive = activeSection === item.id;
                      
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => handleMenuClick(item.id)}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`w-full group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                            isActive 
                              ? 'bg-gradient-to-r from-[#6cb79a] to-[#5aa485] shadow-lg shadow-[#6cb79a]/25' 
                              : 'bg-white/5 hover:bg-white/10 border border-white/10'
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {/* Efecto de brillo */}
                          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 transition-transform duration-700 ${
                            isActive ? 'translate-x-full' : 'group-hover:translate-x-full'
                          }`} />
                          
                          <div className="relative flex items-center justify-between p-4">
                            <div className="flex items-center space-x-4">
                              <div className={`p-3 rounded-xl transition-all duration-300 ${
                                isActive 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-white/10 text-[#6cb79a] group-hover:bg-white/20 group-hover:text-white'
                              }`}>
                                <IconComponent size={20} />
                              </div>
                              <div className="text-left">
                                <div className={`font-bold text-sm tracking-wider transition-colors duration-300 ${
                                  isActive ? 'text-white' : 'text-white group-hover:text-white'
                                }`}>
                                  {item.label}
                                </div>
                                <div className={`text-xs transition-colors duration-300 ${
                                  isActive ? 'text-white/80' : 'text-white/60 group-hover:text-white/80'
                                }`}>
                                  {item.id === 'inicio' && 'Página principal'}
                                  {item.id === 'informacion' && 'Información del evento'}
                                  {item.id === 'registro' && 'Registro de participantes'}
                                </div>
                              </div>
                            </div>
                            
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 + 0.2 }}
                              className={`transition-all duration-300 ${
                                isActive ? 'text-white' : 'text-white/40 group-hover:text-white'
                              }`}
                            >
                              <ChevronRight size={16} />
                            </motion.div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  {/* Footer del menú */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 pt-6 border-t border-white/10"
                  >
                    <div className="text-center">
                      <p className="text-white/60 text-xs mb-2">¿Necesitas ayuda?</p>
                      <div className="flex justify-center space-x-4">
                        <div className="w-2 h-2 bg-[#6cb79a] rounded-full animate-pulse" />
                        <div className="w-2 h-2 bg-[#6cb79a] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-[#6cb79a] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SimpleMenu; 