// lib/pdfToText.ts
// Only imported dynamically in the browser
function withTimeout(p, ms, label) {
    let t = null;
    const timeout = new Promise((_, rej) => {
        t = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    return Promise.race([p.finally(() => {
            if (t)
                clearTimeout(t);
        }), timeout]);
}
async function yieldToBrowser() {
    if (typeof window === 'undefined')
        return;
    await new Promise((resolve) => setTimeout(resolve, 0));
}
export async function pdfToText(file) {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
    if (isBrowser) {
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await withTimeout(pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: !isBrowser }).promise, 30000, 'PDF load');
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await withTimeout(pdf.getPage(i), 10000, `PDF page ${i}`);
        const content = await withTimeout(page.getTextContent(), 12000, `PDF text ${i}`);
        pages.push(content.items.map((item) => item.str).join(' '));
        await yieldToBrowser();
    }
    return pages.join('\n\n');
}
