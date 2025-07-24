import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DayNavigation = ({ 
  currentDateIndex, 
  onDateChange, 
  eventDates, 
  dateNames,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext 
}) => {
  return (
    <div className="flex flex-col items-center space-y-4 mb-8">
      {/* Navegación con flechas */}
      <div className="flex items-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={`p-2 rounded-full transition-all ${
            canGoPrevious 
              ? 'bg-[#6cb79a] text-white hover:bg-[#5ca085] shadow-lg' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {/* Botones de días */}
        <div className="flex space-x-2">
          {eventDates.map((date, index) => (
            <motion.button
              key={date}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateChange(index)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                currentDateIndex === index
                  ? 'bg-[#6cb79a] text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-[#6cb79a]'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Día {index + 1}</div>
                <div className="text-xs opacity-80">
                  {dateNames[index]?.split(' - ')[1] || ''}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={!canGoNext}
          className={`p-2 rounded-full transition-all ${
            canGoNext 
              ? 'bg-[#6cb79a] text-white hover:bg-[#5ca085] shadow-lg' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Indicador de progreso */}
      <div className="flex space-x-1">
        {eventDates.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentDateIndex
                ? 'w-8 bg-[#6cb79a]'
                : 'w-2 bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Título del día actual */}
      <motion.div
        key={currentDateIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <h2 className="text-xl font-bold text-gray-800">
          {dateNames[currentDateIndex] || `Día ${currentDateIndex + 1}`}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {eventDates[currentDateIndex]}
        </p>
      </motion.div>
    </div>
  );
};

export default DayNavigation; 