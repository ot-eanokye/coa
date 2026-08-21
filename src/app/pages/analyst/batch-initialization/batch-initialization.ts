import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Product, ProductsService, SpecInput } from '../../../core/products.service';
import { BatchService } from '../../../core/batch.service';

@Component({
  selector: 'app-batch-initialization',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './batch-initialization.html',
  styleUrl: './batch-initialization.scss',
})
export class BatchInitialization implements OnInit {
  private readonly products = inject(ProductsService);
  private readonly batches = inject(BatchService);
  private readonly router = inject(Router);

  readonly productList = signal<Product[]>([]);
  readonly selectedId = signal('');
  readonly specs = signal<SpecInput[]>([]);

  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);

  readonly selected = computed(() => this.productList().find((p) => p.id === this.selectedId()) ?? null);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      // Only offer products the analyst has actually been assigned to work on.
      const [all, mine] = await Promise.all([this.products.list(), this.batches.listMine()]);
      const assignedProductIds = new Set(mine.map((b) => b.product_id).filter(Boolean));
      this.productList.set(all.filter((p) => p.status === 'active' && assignedProductIds.has(p.id)));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load products.');
    } finally {
      this.loading.set(false);
    }
  }

  async onSelect(id: string): Promise<void> {
    this.selectedId.set(id);
    this.specs.set([]);
    if (!id) {
      return;
    }
    try {
      const { specs } = await this.products.get(id);
      this.specs.set(specs);
    } catch {
      this.specs.set([]);
    }
  }

  async startAnalysis(): Promise<void> {
    if (this.creating()) {
      return;
    }
    this.error.set(null);
    if (!this.selectedId()) {
      this.error.set('Select a product to analyse.');
      return;
    }
    this.creating.set(true);
    try {
      // Batch number is taken from the selected product's record.
      const batch = await this.batches.createBatch(this.selectedId(), this.selected()?.batch_no ?? '');
      await this.router.navigate(['/analyst/batch', batch.id, 'results']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not start the analysis.');
    } finally {
      this.creating.set(false);
    }
  }
}
