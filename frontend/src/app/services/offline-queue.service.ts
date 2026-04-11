import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface QueueEntry {
  id: string;
  type: 'income' | 'driver_status';
  payload: any;
  timestamp: number;
}

const QUEUE_KEY = 'hustle_offline_queue';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {

  enqueue(type: 'income' | 'driver_status', payload: any): void {
    const queue = this.getQueue();
    const entry: QueueEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      timestamp: Date.now()
    };
    queue.push(entry);
    this.save(queue);
  }

  getQueue(): QueueEntry[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  dequeue(id: string): void {
    const queue = this.getQueue().filter(e => e.id !== id);
    this.save(queue);
  }

  processQueue(apiService: ApiService, hustlerToken?: string, driverToken?: string): void {
    const queue = this.getQueue();
    for (const entry of queue) {
      if (entry.type === 'income' && hustlerToken) {
        apiService.logIncome(entry.payload, hustlerToken).subscribe({
          next: () => this.dequeue(entry.id),
          error: () => { /* leave in queue */ }
        });
      } else if (entry.type === 'driver_status' && driverToken) {
        apiService.updateDeliveryStatus(entry.payload.jobId, entry.payload.update, driverToken).subscribe({
          next: () => this.dequeue(entry.id),
          error: () => { /* leave in queue */ }
        });
      }
    }
  }

  private save(queue: QueueEntry[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}
