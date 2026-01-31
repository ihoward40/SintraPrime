import { Worker } from 'worker_threads';
import { cpus } from 'os';
import path from 'path';

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ data: any; resolve: (value: any) => void; reject: (err: any) => void }> = [];
  
  constructor(private workerScript: string, poolSize = cpus().length) {
    for (let i = 0; i < poolSize; i++) {
      this.createWorker();
    }
  }
  
  private createWorker() {
    const worker = new Worker(this.workerScript);
    
    worker.on('message', (result) => {
      const task = this.queue.shift();
      if (task) {
        task.resolve(result);
        this.processQueue();
      }
    });
    
    worker.on('error', (err) => {
      const task = this.queue.shift();
      if (task) task.reject(err);
    });
    
    this.workers.push(worker);
  }
  
  async execute<T>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this.processQueue();
    });
  }
  
  private processQueue() {
    if (this.queue.length === 0) return;
    
    const availableWorker = this.workers.find(w => !w.threadId);
    if (availableWorker && this.queue.length > 0) {
      const task = this.queue[0];
      availableWorker.postMessage(task.data);
    }
  }
  
  async destroy() {
    await Promise.all(this.workers.map(w => w.terminate()));
  }
}
