// public/workers/pdf-worker.js
// Minimal PDF.js worker for parallel PDF text extraction

self.importScripts('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');

self.onmessage = async function (e) {
  const { type, data } = e.data || {};
  if (type !== 'PROCESS_PAGES' || !data) return;
  const { pdfDataUrl, pageNumbers } = data;
  try {
    const loadingTask = pdfjsLib.getDocument(pdfDataUrl);
    const pdf = await loadingTask.promise;
    const results = [];
    for (const pageNum of pageNumbers) {
      try {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');
        results.push({ pageNum, text, success: true });
      } catch (err) {
        results.push({ pageNum, text: '', success: false });
      }
    }
    self.postMessage({ type: 'COMPLETE', data: results });
  } catch (err) {
    self.postMessage({ type: 'ERROR', data: { error: err && err.message ? err.message : 'Unknown error' } });
  }
};

// Signal ready
self.postMessage({ type: 'READY' });
