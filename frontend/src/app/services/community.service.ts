import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService, Community } from './api.service';

export const ALL_COMMUNITIES = 'ALL';
const STORAGE_KEY = 'thenga_community';

// The community a person is browsing, chosen once in the menu and applied app-wide.
@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly api = inject(ApiService);

  readonly communities = signal<Community[]>([]);
  readonly selectedId = signal<string>(this.readInitial());

  readonly selected = computed(() =>
    this.communities().find(c => c.id === this.selectedId()) ?? null
  );

  constructor() {
    this.api.listCommunities().subscribe({
      next: list => {
        this.communities.set(list);
        // A remembered community that no longer exists would silently empty the marketplace
        if (this.selectedId() !== ALL_COMMUNITIES && !list.some(c => c.id === this.selectedId())) {
          this.selectedId.set(ALL_COMMUNITIES);
        }
      },
      error: () => this.communities.set([])
    });

    effect(() => {
      const id = this.selectedId();
      try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage unavailable — choice still applies for this visit */ }
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  private readInitial(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) || ALL_COMMUNITIES;
    } catch {
      return ALL_COMMUNITIES;
    }
  }
}
