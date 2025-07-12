import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage,
  X,
  Users,
  BarChart3,
  Building,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { visualizacionUtils } from '../services/visualizacionService';

const ExportManager = ({ 
  isOpen, 
  onClose, 
  registros, 
  registrosPorDia, 
  registrosPorCharla, 
  empresasTop,
  resumenStats 
}) => {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('registros');

  const handleExport = async (format) => {
    setExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular procesamiento
      
      switch (format) {
        case 'csv':
          exportToCSV();
          break;
        case 'json':
          exportToJSON();
          break;
        case 'txt':
          exportToTXT();
          break;
        default:
          toast.error('Formato no soportado');
      }
    } catch (error) {
      toast.error('Error al exportar datos');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    switch (exportType) {
      case 'registros':
        // Header
        csvContent = 'Nombre,Correo,Empresa,Cargo,Numero,Fecha Registro,Charlas Seleccionadas\n';
        
        // Data
        registros.forEach(registro => {
          const eventos = visualizacionUtils.formatearEventos(registro.eventos);
          const charlasTexto = eventos.map(e => e.titulo).join('; ');
          
          csvContent += `"${registro.nombres}","${registro.correo}","${registro.empresa}","${registro.cargo}","${registro.numero}","${visualizacionUtils.formatearFecha(registro.fecha_registro)}","${charlasTexto}"\n`;
        });
        
        filename = `registros_expokossodo_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'empresas':
        csvContent = 'Empresa,Cantidad Registros,Porcentaje\n';
        
        empresasTop.forEach(empresa => {
          const porcentaje = ((empresa.cantidad / resumenStats.totalRegistros) * 100).toFixed(1);
          csvContent += `"${empresa.empresa}","${empresa.cantidad}","${porcentaje}%"\n`;
        });
        
        filename = `empresas_expokossodo_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'charlas':
        csvContent = 'Charla,Registrados,Fecha,Hora,Sala\n';
        
        registrosPorCharla.forEach(charla => {
          csvContent += `"${charla.titulo}","${charla.registrados}","${charla.fecha}","${charla.hora}","${charla.sala}"\n`;
        });
        
        filename = `charlas_expokossodo_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'temporal':
        csvContent = 'Fecha,Registros,Fecha Formateada\n';
        
        registrosPorDia.forEach(dia => {
          csvContent += `"${dia.fecha}","${dia.cantidad}","${dia.fechaFormatted}"\n`;
        });
        
        filename = `temporal_expokossodo_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    downloadFile(csvContent, filename, 'text/csv');
    toast.success(`Archivo CSV exportado: ${filename}`);
  };

  const exportToJSON = () => {
    let jsonData = {};
    let filename = '';

    switch (exportType) {
      case 'registros':
        jsonData = {
          metadata: {
            exported_at: new Date().toISOString(),
            total_records: registros.length,
            event: 'ExpoKossodo 2025'
          },
          registros: registros.map(registro => ({
            ...registro,
            eventos_formateados: visualizacionUtils.formatearEventos(registro.eventos)
          }))
        };
        filename = `registros_expokossodo_${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'resumen':
        jsonData = {
          metadata: {
            exported_at: new Date().toISOString(),
            event: 'ExpoKossodo 2025'
          },
          resumen_estadisticas: resumenStats,
          top_empresas: empresasTop,
          registros_por_dia: registrosPorDia,
          charlas_populares: registrosPorCharla.slice(0, 10)
        };
        filename = `resumen_expokossodo_${new Date().toISOString().split('T')[0]}.json`;
        break;

      default:
        jsonData = { error: 'Tipo de exportación no válido' };
    }

    const jsonString = JSON.stringify(jsonData, null, 2);
    downloadFile(jsonString, filename, 'application/json');
    toast.success(`Archivo JSON exportado: ${filename}`);
  };

  const exportToTXT = () => {
    let txtContent = '';
    let filename = '';

    switch (exportType) {
      case 'resumen':
        txtContent = `REPORTE EJECUTIVO - EXPOKOSSODO 2025
=============================================

Fecha de Generación: ${new Date().toLocaleString('es-ES')}

ESTADÍSTICAS GENERALES
----------------------
• Total Registros: ${resumenStats.totalRegistros}
• Total Eventos: ${resumenStats.totalEventos}
• Promedio Charlas/Usuario: ${resumenStats.promedioCharlasPorUsuario}
• Registros Últimas 24h: ${resumenStats.registrosUltimas24h}

TOP 5 EMPRESAS MÁS REPRESENTADAS
-------------------------------
${empresasTop.slice(0, 5).map((empresa, index) => 
  `${index + 1}. ${empresa.empresa} - ${empresa.cantidad} registros (${((empresa.cantidad / resumenStats.totalRegistros) * 100).toFixed(1)}%)`
).join('\n')}

TOP 5 CHARLAS MÁS POPULARES
---------------------------
${registrosPorCharla.slice(0, 5).map((charla, index) => 
  `${index + 1}. ${charla.titulo} - ${charla.registrados} registrados`
).join('\n')}

EVOLUCIÓN DE REGISTROS POR DÍA
-----------------------------
${registrosPorDia.map(dia => 
  `${dia.fechaFormatted}: ${dia.cantidad} registros`
).join('\n')}

---
Reporte generado automáticamente por Dashboard ExpoKossodo 2025`;
        
        filename = `reporte_ejecutivo_expokossodo_${new Date().toISOString().split('T')[0]}.txt`;
        break;

      default:
        txtContent = 'Tipo de reporte no disponible en formato TXT';
        filename = `error_${new Date().toISOString().split('T')[0]}.txt`;
    }

    downloadFile(txtContent, filename, 'text/plain');
    toast.success(`Reporte TXT exportado: ${filename}`);
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const exportOptions = [
    {
      id: 'registros',
      name: 'Lista de Registrados',
      description: 'Todos los usuarios con sus datos completos',
      icon: Users,
      formats: ['csv', 'json']
    },
    {
      id: 'empresas',
      name: 'Estadísticas de Empresas',
      description: 'Ranking de empresas participantes',
      icon: Building,
      formats: ['csv']
    },
    {
      id: 'charlas',
      name: 'Popularidad de Charlas',
      description: 'Charlas ordenadas por registros',
      icon: BarChart3,
      formats: ['csv']
    },
    {
      id: 'temporal',
      name: 'Evolución Temporal',
      description: 'Registros día por día',
      icon: BarChart3,
      formats: ['csv']
    },
    {
      id: 'resumen',
      name: 'Reporte Ejecutivo',
      description: 'Resumen completo para gerencia',
      icon: FileText,
      formats: ['json', 'txt']
    }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#6cb79a] rounded-lg">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Exportar Datos</h3>
                <p className="text-sm text-gray-600">Descarga información en diferentes formatos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Selecciona qué exportar:</h4>
                <div className="grid grid-cols-1 gap-3">
                  {exportOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setExportType(option.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        exportType === option.id
                          ? 'border-[#6cb79a] bg-[#6cb79a]/5 ring-2 ring-[#6cb79a]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <option.icon className={`h-5 w-5 ${
                          exportType === option.id ? 'text-[#6cb79a]' : 'text-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{option.name}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                        {exportType === option.id && (
                          <CheckCircle className="h-5 w-5 text-[#6cb79a]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Formatos disponibles:</h4>
                <div className="flex flex-wrap gap-3">
                  {exportOptions.find(opt => opt.id === exportType)?.formats.map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format)}
                      disabled={exporting}
                      className="flex items-center space-x-2 px-4 py-3 bg-[#6cb79a] text-white rounded-lg hover:bg-[#5aa485] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {format === 'csv' && <FileSpreadsheet className="h-4 w-4" />}
                      {format === 'json' && <FileText className="h-4 w-4" />}
                      {format === 'txt' && <FileText className="h-4 w-4" />}
                      <span className="uppercase font-medium">
                        {exporting ? 'Exportando...' : format}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <FileImage className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <strong>Información:</strong> Los archivos se descargarán automáticamente en tu computadora. 
                    Los datos incluyen toda la información disponible al momento de la exportación.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExportManager; 