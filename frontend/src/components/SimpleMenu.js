import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

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
    { id: 'inicio', label: 'INICIO' },
    { id: 'informacion', label: 'INFORMACIÓN' },
    { id: 'registro', label: 'REGISTRO' }
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
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 rounded-lg ${textColor} ${hoverColor} transition-colors duration-300 cursor-pointer relative`}
          style={{ zIndex: 9997 }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú móvil */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-0 left-0 right-0 z-[9999] ${mobileMenuBg} backdrop-blur-md shadow-lg md:hidden`}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            {logoUrl && (
              <img 
                src={logoUrl}
                alt="Logo"
                className="h-8 object-contain"
                onError={(e) => {
                  console.log('Error loading menu logo');
                  e.target.style.display = 'none';
                }}
              />
            )}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <div className="py-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`block w-full text-left px-6 py-4 text-base font-medium tracking-wider transition-colors duration-300 text-gray-800 hover:text-[#6cb79a] hover:bg-gray-50 ${
                  activeSection === item.id ? 'text-[#6cb79a] bg-gray-50' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  );
};

export default SimpleMenu; 