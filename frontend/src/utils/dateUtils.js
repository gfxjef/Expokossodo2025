/**
 * Utilidades para formateo de fechas
 * Soluciona problemas de zona horaria al crear fechas desde strings
 */

// Función para crear fecha en zona horaria local
export const createLocalDate = (fechaString) => {
  if (!fechaString) return null;
  
  // Si ya es un objeto Date, retornarlo
  if (fechaString instanceof Date) return fechaString;
  
  let fechaObj;
  
  // Si es un string que parece ser una fecha ya formateada (como "Tue, 02 Sep 2025 00:00:00 GMT")
  if (typeof fechaString === 'string' && fechaString.includes(',')) {
    fechaObj = new Date(fechaString);
  } 
  // Si es un string en formato YYYY-MM-DD
  else if (typeof fechaString === 'string' && fechaString.includes('-')) {
    const [year, month, day] = fechaString.split('-').map(Number);
    fechaObj = new Date(year, month - 1, day); // month - 1 porque los meses van de 0-11
  }
  // Intentar crear Date directamente
  else {
    fechaObj = new Date(fechaString);
  }
  
  // Verificar si la fecha es válida
  if (isNaN(fechaObj.getTime())) {
    console.error('❌ Fecha inválida:', fechaString);
    return null;
  }
  
  return fechaObj;
};

// Formatear fecha corta (ej: "mar, 2 sep")
export const formatFechaCorta = (fecha) => {
  const fechaObj = createLocalDate(fecha);
  if (!fechaObj) return 'Fecha inválida';
  
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  
  const dia = fechaObj.getDate();
  const diaSemana = dias[fechaObj.getDay()];
  const mes = meses[fechaObj.getMonth()];
  
  return `${diaSemana}, ${dia} ${mes}`;
};

// Formatear fecha larga (ej: "martes 2 de septiembre de 2025")
export const formatFechaLarga = (fecha) => {
  const fechaObj = createLocalDate(fecha);
  if (!fechaObj) return 'Fecha inválida';
  
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const dia = fechaObj.getDate();
  const diaSemana = dias[fechaObj.getDay()];
  const mes = meses[fechaObj.getMonth()];
  const año = fechaObj.getFullYear();
  
  return `${diaSemana} ${dia} de ${mes} de ${año}`;
};

// Formatear fecha para mostrar en tablas (ej: "02/09/2025")
export const formatFechaTabla = (fecha) => {
  const fechaObj = createLocalDate(fecha);
  if (!fechaObj) return 'Fecha inválida';
  
  const dia = fechaObj.getDate().toString().padStart(2, '0');
  const mes = (fechaObj.getMonth() + 1).toString().padStart(2, '0');
  const año = fechaObj.getFullYear();
  
  return `${dia}/${mes}/${año}`;
};

// Obtener solo el día de la semana (ej: "martes")
export const getDiaSemana = (fecha) => {
  const fechaObj = createLocalDate(fecha);
  if (!fechaObj) return 'Fecha inválida';
  
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return dias[fechaObj.getDay()];
};

// Obtener solo el día de la semana corto (ej: "mar")
export const getDiaSemanaCorto = (fecha) => {
  const fechaObj = createLocalDate(fecha);
  if (!fechaObj) return 'Fecha inválida';
  
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return dias[fechaObj.getDay()];
};

// Verificar si una fecha es válida
export const esFechaValida = (fecha) => {
  const fechaObj = createLocalDate(fecha);
  return fechaObj !== null;
};

// Comparar fechas (retorna -1, 0, 1)
export const compararFechas = (fecha1, fecha2) => {
  const obj1 = createLocalDate(fecha1);
  const obj2 = createLocalDate(fecha2);
  
  if (!obj1 || !obj2) return 0;
  
  if (obj1 < obj2) return -1;
  if (obj1 > obj2) return 1;
  return 0;
}; 