import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Batch, BatchService } from '../../core/batch.service';

@Component({
  selector: 'app-archived-documents',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './archived-documents.html',
  styleUrl: './archived-documents.scss',
})
export class ArchivedDocuments implements OnInit {
  private readonly batches = inject(BatchService);

  readonly all = signal<Batch[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly query = signal('');

  readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) {
      return this.all();
    }
    return this.all().filter((b) =>
      [b.batch_no, b.product_name, b.category].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  });

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
