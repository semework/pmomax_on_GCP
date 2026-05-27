// pmomax-bootstrap.js
// Lightweight, fault-tolerant bootstrap loaded BEFORE React.
// This MUST NOT throw under any circumstances.

(function () {
  try {    // Soft-check for libraries referenced in index.html
    const globals = ['tailwind', 'pdfjsLib', 'mammoth', 'XLSX', 'jsPDF', 'JSZip'];
    globals.forEach((name) => {
      if (Object.prototype.hasOwnProperty.call(window, name)) {      }
    });  } catch (err) {
    // Never let bootstrap failures break React
    console.error('[BOOTSTRAP] Ignoring non-fatal bootstrap error:', err);
  }
})();
