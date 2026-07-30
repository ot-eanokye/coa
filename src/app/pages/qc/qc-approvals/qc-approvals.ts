import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../../core/batch.service';

@Component({
  selector: 'app-qc-approvals',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './qc-approvals.html',
  styleUrl: './qc-approvals.scss',
})
export class QcApprovals implements OnInit {
  private readonly batches = inject(BatchService);

  readonly queue = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.queue.set(await this.batches.listByStage('qc_approval'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load pending approvals.');
    } finally {
      this.loading.set(false);
    }
  }

  submitted(b: Batch): string {
    return (b.updated_at ?? '').slice(0, 10);
  }
}
