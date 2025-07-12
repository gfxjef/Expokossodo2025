import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { Users, Award, Eye, EyeOff } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const RegistrosPorCharlaChart = ({ data, tipo = 'bar', onCharlaClick }) => {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-2" />
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  // Mostrar solo top 10 por defecto, todos si se solicita
  const dataToShow = mostrarTodos ? data : data.slice(0, 10);

  // Generar colores dinámicamente
  const generateColors = (count) => {
    const baseColors = [
      '#6cb79a', '#4f46e5', '#ef4444', '#f59e0b', '#10b981',
      '#8b5cf6', '#f97316', '#06b6d4', '#84cc16', '#ec4899'
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  };

  const colors = generateColors(dataToShow.length);

  const chartData = {
    labels: dataToShow.map(item => {
      // Truncar títulos largos
      const titulo = item.titulo.length > 40 ? 
        item.titulo.substring(0, 40) + '...' : 
        item.titulo;
      return titulo;
    }),
    datasets: [{
      label: 'Registrados',
      data: dataToShow.map(item => item.registrados),
      backgroundColor: tipo === 'doughnut' ? colors : colors.map(color => color + '80'),
      borderColor: colors,
      borderWidth: 2,
      hoverBackgroundColor: colors,
      hoverBorderWidth: 3,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Barras horizontales
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Charlas Más Populares',
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
        displayColors: true,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          title: function(context) {
            // Mostrar título completo en tooltip
            const originalData = dataToShow[context[0].dataIndex];
            return originalData.titulo;
          },
          label: function(context) {
            const originalData = dataToShow[context.dataIndex];
            return [
              `Registrados: ${context.parsed.x}`,
              `Fecha: ${originalData.fecha}`,
              `Hora: ${originalData.hora}`,
              `Sala: ${originalData.sala}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
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
      y: {
        ticks: {
          font: {
            size: 11
          }
        },
        grid: {
          display: false
        }
      }
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutQuart'
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onCharlaClick) {
        const elementIndex = elements[0].index;
        const charlaClickeada = dataToShow[elementIndex];
        onCharlaClick(charlaClickeada);
      }
    },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          generateLabels: function(chart) {
            const data = chart.data;
            return data.labels.map((label, index) => ({
              text: label,
              fillStyle: data.datasets[0].backgroundColor[index],
              strokeStyle: data.datasets[0].borderColor[index],
              lineWidth: 2,
              hidden: false,
              index: index
            }));
          }
        }
      },
      title: {
        display: true,
        text: 'Distribución de Registros por Charla',
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
        callbacks: {
          title: function(context) {
            const originalData = dataToShow[context[0].dataIndex];
            return originalData.titulo;
          },
          label: function(context) {
            const originalData = dataToShow[context.dataIndex];
            const total = dataToShow.reduce((acc, item) => acc + item.registrados, 0);
            const percentage = ((originalData.registrados / total) * 100).toFixed(1);
            return [
              `Registrados: ${originalData.registrados}`,
              `Porcentaje: ${percentage}%`,
              `Fecha: ${originalData.fecha}`,
              `Hora: ${originalData.hora}`
            ];
          }
        }
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onCharlaClick) {
        const elementIndex = elements[0].index;
        const charlaClickeada = dataToShow[elementIndex];
        onCharlaClick(charlaClickeada);
      }
    },
    onHover: (event, elements) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    }
  };

  // Calcular estadísticas
  const totalRegistros = data.reduce((acc, item) => acc + item.registrados, 0);
  const promedioRegistros = (totalRegistros / data.length).toFixed(1);
  const charlaMasPopular = data[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
    >
              <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-[#6cb79a]" />
            <h3 className="text-lg font-semibold text-gray-900">Popularidad de Charlas</h3>
            {onCharlaClick && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                👆 Clickeable
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMostrarTodos(!mostrarTodos)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              {mostrarTodos ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span>{mostrarTodos ? 'Mostrar Top 10' : 'Mostrar Todos'}</span>
            </button>
          </div>
        </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
          <div className="text-xl font-bold text-blue-600">{data.length}</div>
          <div className="text-sm text-blue-600">Total Charlas</div>
        </div>
        <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
          <div className="text-xl font-bold text-green-600">{promedioRegistros}</div>
          <div className="text-sm text-green-600">Promedio/Charla</div>
        </div>
        <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
          <div className="text-xl font-bold text-purple-600">{charlaMasPopular.registrados}</div>
          <div className="text-sm text-purple-600">Más Popular</div>
        </div>
      </div>

      {/* Gráfico */}
      <div className={tipo === 'doughnut' ? 'h-96' : 'h-80'}>
        {tipo === 'doughnut' ? (
          <Doughnut data={chartData} options={doughnutOptions} />
        ) : (
          <Bar data={chartData} options={barOptions} />
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Charla más popular: <span className="font-semibold text-gray-900">
              {charlaMasPopular.titulo.length > 50 ? 
                charlaMasPopular.titulo.substring(0, 50) + '...' : 
                charlaMasPopular.titulo}
            </span>
          </span>
          <span className="text-gray-600">
            Mostrando: {dataToShow.length} de {data.length} charlas
          </span>
        </div>
      </div>

      {/* Lista de top charlas */}
      {tipo === 'bar' && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-yellow-500" />
              <span>Top 5 Charlas Más Populares</span>
            </div>
            {onCharlaClick && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                💡 Click para ver detalles
              </span>
            )}
          </h4>
          <div className="space-y-2">
            {data.slice(0, 5).map((charla, index) => (
              <div 
                key={index} 
                onClick={() => onCharlaClick && onCharlaClick(charla)}
                className={`flex items-center justify-between p-2 bg-white rounded border transition-all ${
                  onCharlaClick ? 'cursor-pointer hover:bg-gray-50 hover:shadow-md' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                      {charla.titulo}
                    </div>
                    <div className="text-xs text-gray-500">
                      {charla.fecha} - {charla.hora} - {charla.sala}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#6cb79a]">
                  {charla.registrados}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RegistrosPorCharlaChart; 