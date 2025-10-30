// Shared Worker Manager - Singleton pattern to ensure only one worker instance
import type { WorkerMessage, WorkerResponse } from './dataWorker';

class WorkerManager {
  private static instance: WorkerManager | null = null;
  private worker: Worker | null = null;
  private messageIdCounter = 0;
  private pendingMessages = new Map<string, (response: WorkerResponse) => void>();

  private constructor() {
    this.initializeWorker();
  }

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  private initializeWorker(): void {
    try {
      this.worker = new Worker(
        new URL('./dataWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const response = event.data;
        const resolver = this.pendingMessages.get(response.id);
        if (resolver) {
          resolver(response);
          this.pendingMessages.delete(response.id);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Shared Worker error:', error);
      };

      console.log('✅ Shared Worker initialized');
    } catch (err) {
      console.error('Failed to create shared worker:', err);
      throw new Error('Failed to initialize Web Worker. Your browser might not support this feature.');
    }
  }

  public async sendMessage(type: WorkerMessage['type'], data: Record<string, unknown>): Promise<WorkerResponse> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = `msg_${++this.messageIdCounter}_${Date.now()}`;
      
      // Set up timeout to prevent hanging promises
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error('Worker message timeout'));
      }, 30000); // 30 second timeout

      this.pendingMessages.set(id, (response: WorkerResponse) => {
        clearTimeout(timeout);
        resolve(response);
      });

      const message: WorkerMessage = { id, type, data };
      this.worker!.postMessage(message);
    });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingMessages.clear();
      console.log('🛑 Shared Worker terminated');
    }
    WorkerManager.instance = null;
  }

  public isWorkerReady(): boolean {
    return this.worker !== null;
  }
}

// Export singleton instance
export const workerManager = WorkerManager.getInstance();

// Export helper function for easy message sending
export async function sendWorkerMessage(
  type: WorkerMessage['type'], 
  data: Record<string, unknown> = {}
): Promise<WorkerResponse> {
  return workerManager.sendMessage(type, data);
}

// Clean up worker on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workerManager.terminate();
  });
}