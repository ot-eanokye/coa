import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../../core/batch.service';

@Component({
  selector: 'app-production-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './production-dashboard.html',
  styleUrl: './production-dashboard.scss',
})
export class ProductionDashboard implements OnInit {
  private readonly batches = inject(BatchService);

  readonly incoming = signal<Batch[]>([]);
  readonly verified = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly awaitingCount = computed(() => this.pad(this.incoming().length));
  readonly verifiedCount = computed(() => this.pad(this.verified().length));
  readonly totalCount = computed(() => this.incoming().length + this.verified().length);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.incoming.set(await this.batches.listByStage('released'));
      this.verified.set(await this.batches.listByStage('production_released'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load batches.');
    } finally {
      this.loading.set(false);
    }
  }

  async signOff(batch: Batch): Promise<void> {
    if (this.busyId()) {
      return;
    }
    this.busyId.set(batch.id);
    this.error.set(null);
    try {
      await this.batches.productionSignOff(batch.id);
      await this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not sign off the batch.');
    } finally {
      this.busyId.set(null);
    }
  }

  dispatch(b: Batch): string {
    return (b.updated_at ?? '').slice(0, 16).replace('T', ' ');
  }

  private pad(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }
}
