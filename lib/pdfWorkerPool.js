// lib/pdfWorkerPool.ts - Worker pool manager for parallel PDF processing
export class PDFWorkerPool {
    constructor(workerCount = 4) {
        this.workers = [];
        this.availableWorkers = [];
        this.workerCount = 4; // 4 threads for optimal performance
        this.workerCount = workerCount;
        // Avoid crashing during SSR / Node build where Worker is not defined
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
            return;
        }
        this.initializeWorkers();
    }
    initializeWorkers() {
        for (let i = 0; i < this.workerCount; i++) {
            // NOTE: Assumes /workers/pdf-worker.js is served from public/ or equivalent
            const worker = new Worker('/workers/pdf-worker.js');
            worker.onmessage = (e) => {
                if (e.data && e.data.type === 'READY') {
                    this.availableWorkers.push(worker);
                }
            };
            this.workers.push(worker);
        }
    }
    async processPages(pdfDataUrl, totalPages) {
        return new Promise((resolve, reject) => {
            // If no workers are available (e.g., SSR or init failed), fail fast
            if (!this.workers.length || totalPages <= 0) {
                reject(new Error('PDF worker pool is not initialized or there are no pages to process.'));
                return;
            }
            // Distribute pages across workers
            const pagesPerWorker = Math.ceil(totalPages / this.workerCount);
            const pageAssignments = [];
            for (let i = 0; i < this.workerCount; i++) {
                const start = i * pagesPerWorker + 1;
                const end = Math.min((i + 1) * pagesPerWorker, totalPages);
                if (start <= totalPages) {
                    pageAssignments.push(Array.from({ length: end - start + 1 }, (_, idx) => start + idx));
                }
            }
            const allResults = [];
            let completedWorkers = 0;
            let settled = false; // guard against multiple resolve/reject calls
            // Assign work to each worker
            pageAssignments.forEach((pages, idx) => {
                const worker = this.workers[idx];
                worker.onmessage = (e) => {
                    var _a;
                    if (!e.data || settled)
                        return;
                    if (e.data.type === 'COMPLETE') {
                        const items = e.data.data || [];
                        allResults.push(...items.filter((r) => r.success));
                        completedWorkers++;
                        // When all workers complete, combine results
                        if (completedWorkers === pageAssignments.length && !settled) {
                            settled = true;
                            allResults.sort((a, b) => a.pageNum - b.pageNum);
                            const fullText = allResults.map((r) => r.text).join('\n');
                            resolve(fullText);
                        }
                    }
                    else if (e.data.type === 'ERROR' && !settled) {
                        settled = true;
                        const message = ((_a = e.data.data) === null || _a === void 0 ? void 0 : _a.error) || 'Unknown PDF worker error.';
                        reject(new Error(message));
                    }
                };
                worker.onerror = (error) => {
                    if (!settled) {
                        settled = true;
                        reject(new Error(error.message || 'PDF worker runtime error.'));
                    }
                };
                worker.postMessage({
                    type: 'PROCESS_PAGES',
                    data: {
                        pdfDataUrl,
                        pageNumbers: pages,
                    },
                });
            });
        });
    }
    terminate() {
        (Array.isArray(this.workers) ? this.workers : []).forEach((w) => w.terminate());
        this.workers = [];
        this.availableWorkers = [];
    }
}
export const pdfWorkerPool = new PDFWorkerPool();
