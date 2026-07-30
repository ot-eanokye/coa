import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../../core/batch.service';

interface Load {
  label: string;
  count: number;
  percent: number;
}

@Component({
  selector: 'app-senior-overview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './senior-overview.html',
  styleUrl: './senior-overview.scss',
})
export class SeniorOverview implements OnInit {
  private readonly batches = inject(BatchService);

  readonly queue = signal<Batch[]>([]);
  readonly active = signal<Batch[]>([]);
  readonly released = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly pendingCount = computed(() => this.pad(this.queue().length));
  readonly verifiedCount = computed(() =>
    this.pad(this.active().filter((b) => b.stage === 'qc_approval').length + this.released().length),
  );
  readonly rejectedCount = computed(() =>
    this.pad(this.active().filter((b) => b.stage === 'rejected').length),
  );

  readonly loads = computed<Load[]>(() => {
    const map = new Map<string, number>();
    for (const b of this.active()) {
      const cat = b.category || 'Other';
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, percent: Math.round((count / total) * 100) }));
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.queue.set(await this.batches.listByStage('senior_review'));
      this.active.set(await this.batches.listActive());
      this.released.set(await this.batches.listReleased());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the queue.');
    } finally {
      this.loading.set(false);
    }
  }

  submitted(b: Batch): string {
    return (b.updated_at ?? '').slice(0, 10);
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }
}
