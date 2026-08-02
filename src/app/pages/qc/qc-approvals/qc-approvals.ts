import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../../core/batch.service';

@Component({
  selector: 'app-qc-approvals',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './qc-approvals.html',
  styleUrl: './qc-approvals.scss',
})
export class QcApprovals implements OnInit {
  private readonly batches = inject(BatchService);

  readonly all = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly category = signal('');

  readonly categories = computed(() => [...new Set(this.all().map((b) => b.category).filter(Boolean))]);
  readonly queue = computed(() => {
    const q = this.query().trim().toLowerCase();
    const c = this.category();
    return this.all().filter(
      (b) =>
        (!c || b.category === c) &&
        (!q || [b.batch_no, b.product_name, b.analyst_name].some((v) => v?.toLowerCase().includes(q))),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.all.set(await this.batches.listByStage('qc_approval'));
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
