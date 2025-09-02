#!/usr/bin/env node
/**
 * Test JavaScript para simular exactamente el comportamiento del navegador
 * con la función formatearFecha() de SelectorCharlas.js
 */

console.log("=" .repeat(80));
console.log("🔬 TEST JAVASCRIPT: Simulación exacta de formatearFecha()");
console.log("=" .repeat(80));
console.log("");

// Esta es la función EXACTA de SelectorCharlas.js línea 72-78
const formatearFecha = (fecha) => {
  return new Date(fecha).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Fechas de ejemplo que esperamos del backend
const fechasEjemplo = [
  '2025-09-02',
  '2025-09-03', 
  '2025-09-04'
];

console.log("📝 Función a probar (SelectorCharlas.js líneas 72-78):");
console.log("   const formatearFecha = (fecha) => {");
console.log("     return new Date(fecha).toLocaleDateString('es-ES', {");
console.log("       weekday: 'long',");
console.log("       year: 'numeric',");
console.log("       month: 'long',");  
console.log("       day: 'numeric'");
console.log("     });");
console.log("   };");
console.log("");

console.log("🔄 CONVERSIONES PASO A PASO:");
console.log("-" .repeat(60));

fechasEjemplo.forEach((fechaStr, index) => {
  console.log(`\n${index + 1}. Procesando: "${fechaStr}"`);
  
  // Paso 1: Crear objeto Date
  const dateObj = new Date(fechaStr);
  console.log(`   - new Date("${fechaStr}") → ${dateObj.toString()}`);
  console.log(`   - Timestamp: ${dateObj.getTime()}`);
  console.log(`   - UTC String: ${dateObj.toUTCString()}`);
  console.log(`   - ISO String: ${dateObj.toISOString()}`);
  
  // Paso 2: Obtener componentes
  console.log(`   - Año: ${dateObj.getFullYear()}`);
  console.log(`   - Mes: ${dateObj.getMonth() + 1} (JavaScript es 0-indexado)`);
  console.log(`   - Día: ${dateObj.getDate()}`);
  console.log(`   - Día de semana: ${dateObj.getDay()} (0=domingo)`);
  
  // Paso 3: Formatear con toLocaleDateString
  const fechaFormateada = formatearFecha(fechaStr);
  console.log(`   - Resultado final: "${fechaFormateada}"`);
  
  // Paso 4: Analizar zona horaria
  const offsetMinutes = dateObj.getTimezoneOffset();
  const offsetHours = offsetMinutes / 60;
  console.log(`   - Zona horaria offset: ${offsetHours} horas (${offsetMinutes} minutos)`);
  
  if (offsetHours > 0) {
    console.log(`   - ⚠️  POSIBLE PROBLEMA: Zona horaria GMT-${offsetHours} puede causar desfase`);
  }
});

console.log("");
console.log("=" .repeat(80));
console.log("🌍 INFORMACIÓN DE ZONA HORARIA DEL SISTEMA");
console.log("=" .repeat(80));

const now = new Date();
console.log(`Fecha/hora actual del sistema: ${now.toString()}`);
console.log(`Zona horaria detectada: GMT${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60)}`);
console.log(`Offset en minutos: ${now.getTimezoneOffset()}`);
console.log("");

// Test específico del problema reportado
console.log("=" .repeat(80));
console.log("🐛 ANÁLISIS DEL PROBLEMA REPORTADO");
console.log("=" .repeat(80));
console.log("");
console.log("PROBLEMA: BD tiene '2025-09-02' pero frontend muestra 'lunes, 1 de septiembre'");
console.log("");

const fechaProblema = '2025-09-02';
const dateProblema = new Date(fechaProblema);

console.log(`1. Backend envía: "${fechaProblema}"`);
console.log(`2. new Date("${fechaProblema}") crea: ${dateProblema.toString()}`);
console.log(`3. formatearFecha("${fechaProblema}") devuelve: "${formatearFecha(fechaProblema)}"`);
console.log("");

// Comparar con método corregido
console.log("🔧 MÉTODO CORREGIDO (evita zona horaria):");
const formatearFechaCorregida = (fecha) => {
  const [year, month, day] = fecha.split('-');
  const date = new Date(year, month - 1, day); // month - 1 porque JavaScript es 0-indexado
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric'
  });
};

console.log(`4. MÉTODO CORREGIDO: "${formatearFechaCorregida(fechaProblema)}"`);

console.log("");
console.log("=" .repeat(80));
console.log("🎯 DIAGNÓSTICO");
console.log("=" .repeat(80));
console.log("");

if (formatearFecha(fechaProblema) !== formatearFechaCorregida(fechaProblema)) {
  console.log("❌ PROBLEMA CONFIRMADO: Desfase por zona horaria");
  console.log("   - Método actual (problemático): " + formatearFecha(fechaProblema));
  console.log("   - Método corregido: " + formatearFechaCorregida(fechaProblema));
  console.log("");
  console.log("💡 SOLUCIÓN: Usar el método corregido en SelectorCharlas.js");
} else {
  console.log("✅ No se reproduce el problema en este sistema");
  console.log("   Puede ser específico de la zona horaria del navegador del usuario");
}