import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product, ProductsService } from '../../../core/products.service';
import { Batch, BatchService } from '../../../core/batch.service';

@Component({
  selector: 'app-qc-assign',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe],
  templateUrl: './qc-assign.html',
  styleUrl: './qc-assign.scss',
})
export class QcAssign implements OnInit {
  private readonly products = inject(ProductsService);
  private readonly batches = inject(BatchService);

  readonly productList = signal<Product[]>([]);
  readonly analysts = signal<{ id: string; full_name: string }[]>([]);
  readonly recent = signal<Batch[]>([]);
  readonly loading = signal(true);

  // form
  readonly category = signal('');
  readonly productId = signal('');
  readonly batchNo = signal('');
  readonly analystId = signal('');
  readonly assigning = signal(false);
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'ok' | 'err'>('ok');

  readonly categories = computed(() => [...new Set(this.productList().map((p) => p.category))]);
  readonly filteredProducts = computed(() => {
    const c = this.category();
    return c ? this.productList().filter((p) => p.category === c) : this.productList();
  });

  ngOnInit(): void {
    Promise.all([this.products.list(), this.batches.listAnalysts(), this.batches.listRecent(6)])
      .then(([products, analysts, recent]) => {
        this.productList.set(products.filter((p) => p.status === 'active'));
        this.analysts.set(analysts);
        this.recent.set(recent);
      })
      .catch(() => {})
      .finally(() => this.loading.set(false));
  }

  async assign(): Promise<void> {
    if (this.assigning()) return;
    this.message.set(null);
    if (!this.productId() || !this.batchNo().trim() || !this.analystId()) {
      this.message.set('Select a product, batch number and analyst.');
      this.messageType.set('err');
      return;
    }
    const analyst = this.analysts().find((a) => a.id === this.analystId());
    this.assigning.set(true);
    try {
      await this.batches.createBatch(this.productId(), this.batchNo().trim(), {
        id: this.analystId(),
        name: analyst?.full_name ?? '',
      });
      this.message.set(`Batch assigned to ${analyst?.full_name ?? 'analyst'}.`);
      this.messageType.set('ok');
      this.batchNo.set('');
      this.recent.set(await this.batches.listRecent(6));
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Could not assign the batch.');
      this.messageType.set('err');
    } finally {
      this.assigning.set(false);
    }
  }

  date(b: Batch): string {
    const d = new Date(b.created_at);
    return isNaN(d.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  }
}
