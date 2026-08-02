import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Batch, BatchService } from '../../core/batch.service';

@Component({
  selector: 'app-archived-documents',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './archived-documents.html',
  styleUrl: './archived-documents.scss',
})
export class ArchivedDocuments implements OnInit {
  private readonly batches = inject(BatchService);

  readonly all = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');
  readonly category = signal('');
  readonly status = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly categories = computed(() => [...new Set(this.all().map((b) => b.category).filter(Boolean))]);
  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    const c = this.category();
    const s = this.status();
    const from = this.dateFrom();
    const to = this.dateTo();
    return this.all().filter((b) => {
      const qOk =
        !q || [b.batch_no, b.product_name, b.category].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
      const cOk = !c || b.category === c;
      const sOk = !s || (s === 'Rejected' ? this.isRejected(b) : !this.isRejected(b));
      const date = this.releaseDate(b);
      const fromOk = !from || (date && date >= from);
      const toOk = !to || (date && date <= to);
      return qOk && cOk && sOk && fromOk && toOk;
    });
  });

  clearFilters(): void {
    this.query.set('');
    this.category.set('');
    this.status.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.all.set(await this.batches.listArchive());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load documents.');
    } finally {
      this.loading.set(false);
    }
  }

  releaseDate(b: Batch): string {
    return (b.updated_at ?? '').slice(0, 10);
  }

  isRejected(b: Batch): boolean {
    return b.stage === 'rejected';
  }
}
