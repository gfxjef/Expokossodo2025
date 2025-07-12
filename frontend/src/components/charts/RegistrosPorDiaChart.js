import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  Filler
);

const RegistrosPorDiaChart = ({ data, tipo = 'bar' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2" />
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(item => item.fechaFormatted),
    datasets: [{
      label: 'Registros por Día',
      data: data.map(item => item.cantidad),
      backgroundColor: tipo === 'bar' ? 
        'rgba(108, 183, 154, 0.8)' : 
        'rgba(108, 183, 154, 0.2)',
      borderColor: '#6cb79a',
      borderWidth: 2,
      fill: tipo === 'line',
      tension: 0.4,
      pointBackgroundColor: '#6cb79a',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: 'Registros por Día',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#6cb79a',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} registros`;
          },
          afterLabel: function(context) {
            const originalDate = data[context.dataIndex].fecha;
            return `Fecha: ${new Date(originalDate).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 12
          }
        },
        grid: {
          display: false
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  // Calcular estadísticas
  const totalRegistros = data.reduce((acc, item) => acc + item.cantidad, 0);
  const promedioRegistros = (totalRegistros / data.length).toFixed(1);
  const diaConMasRegistros = data.reduce((max, item) => item.cantidad > max.cantidad ? item : max);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-[#6cb79a]" />
          <h3 className="text-lg font-semibold text-gray-900">Evolución de Registros</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
          <div className="text-xl font-bold text-blue-600">{totalRegistros}</div>
          <div className="text-sm text-blue-600">Total Registros</div>
        </div>
        <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
          <div className="text-xl font-bold text-green-600">{promedioRegistros}</div>
          <div className="text-sm text-green-600">Promedio/Día</div>
        </div>
        <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
          <div className="text-xl font-bold text-purple-600">{diaConMasRegistros.cantidad}</div>
          <div className="text-sm text-purple-600">Día Pico</div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-80">
        {tipo === 'bar' ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Día con más registros: <span className="font-semibold text-gray-900">{diaConMasRegistros.fechaFormatted}</span>
          </span>
          <span className="text-gray-600">
            Período: {data.length} días
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default RegistrosPorDiaChart; 