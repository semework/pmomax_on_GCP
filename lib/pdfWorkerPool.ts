// lib/pdfWorkerPool.ts - Worker pool manager for parallel PDF processing

type PdfWorkerResultItem = {
  pageNum: number;
  text: string;
  success: boolean;
};

type PdfWorkerMessage =
  | { type: 'READY' }
  | { type: 'COMPLETE'; data: PdfWorkerResultItem[] }
  | { type: 'ERROR'; data: { error: string } };

export class PDFWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private workerCount: number = 4; // 4 threads for optimal performance

  constructor(workerCount: number = 4) {
    this.workerCount = workerCount;

    // Avoid crashing during SSR / Node build where Worker is not defined
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      // NOTE: Assumes /workers/pdf-worker.js is served from public/ or equivalent
      const worker = new Worker('/workers/pdf-worker.js');

      worker.onmessage = (e: MessageEvent<PdfWorkerMessage>) => {
        if (e.data && e.data.type === 'READY') {
          this.availableWorkers.push(worker);
        }
      };

      this.workers.push(worker);
    }
  }

  async processPages(pdfDataUrl: string, totalPages: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // If no workers are available (e.g., SSR or init failed), fail fast
      if (!this.workers.length || totalPages <= 0) {
        reject(
          new Error(
            'PDF worker pool is not initialized or there are no pages to process.'
          )
        );
        return;
      }

      // Distribute pages across workers
      const pagesPerWorker = Math.ceil(totalPages / this.workerCount);
      const pageAssignments: number[][] = [];

      for (let i = 0; i < this.workerCount; i++) {
        const start = i * pagesPerWorker + 1;
        const end = Math.min((i + 1) * pagesPerWorker, totalPages);
        if (start <= totalPages) {
          pageAssignments.push(
            Array.from({ length: end - start + 1 }, (_, idx) => start + idx)
          );
        }
      }

      const allResults: Array<{ pageNum: number; text: string }> = [];
      let completedWorkers = 0;
      let settled = false; // guard against multiple resolve/reject calls

      // Assign work to each worker
      pageAssignments.forEach((pages, idx) => {
        const worker = this.workers[idx];

        worker.onmessage = (e: MessageEvent<PdfWorkerMessage>) => {
          if (!e.data || settled) return;

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
          } else if (e.data.type === 'ERROR' && !settled) {
            settled = true;
            const message = e.data.data?.error || 'Unknown PDF worker error.';
            reject(new Error(message));
          }
        };

        worker.onerror = (error: ErrorEvent) => {
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
    (Array.isArray(this.workers) ? this.workers : []).forEach((w) =>
      w.terminate()
    );
    this.workers = [];
    this.availableWorkers = [];
  }
}

export const pdfWorkerPool = new PDFWorkerPool();
