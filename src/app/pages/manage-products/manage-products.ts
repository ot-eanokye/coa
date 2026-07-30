import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Product, ProductsService } from '../../core/products.service';

const TAB_CATEGORY: Record<string, string> = {
  Syrups: 'syrup',
  Tablets: 'tablet',
  Capsules: 'capsule',
  Suspensions: 'suspension',
};

@Component({
  selector: 'app-manage-products',
  standalone: true,
  imports: [FormsModule, RouterLink, UpperCasePipe],
  templateUrl: './manage-products.html',
  styleUrl: './manage-products.scss',
})
export class ManageProducts implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly route = inject(ActivatedRoute);

  readonly tabs = ['All Products', 'Syrups', 'Tablets', 'Capsules', 'Suspensions'];
  readonly activeTab = signal('All Products');
  readonly query = signal('');

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly justCreated = signal(false);

  readonly filtered = computed(() => {
    const tab = this.activeTab();
    const q = this.query().trim().toLowerCase();
    return this.products().filter((p) => {
      const tabOk = tab === 'All Products' || p.category.toLowerCase() === TAB_CATEGORY[tab];
      const qOk =
        !q ||
        [p.name, p.category, p.code, p.batch_no]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q));
      return tabOk && qOk;
    });
  });

  ngOnInit(): void {
    this.justCreated.set(this.route.snapshot.queryParamMap.get('created') === '1');
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.products.set(await this.productsService.list());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load products.');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleStatus(product: Product): Promise<void> {
    if (this.busyId()) {
      return;
    }
    const next = product.status === 'active' ? 'archived' : 'active';
    this.busyId.set(product.id);
    try {
      await this.productsService.setStatus(product.id, next);
      this.products.update((list) =>
        list.map((p) => (p.id === product.id ? { ...p, status: next } : p)),
      );
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not update the product.');
    } finally {
      this.busyId.set(null);
    }
  }

  icon(category: string): 'bottle' | 'tablet' | 'capsule' {
    const c = category.toLowerCase();
    if (c.includes('tablet')) return 'tablet';
    if (c.includes('capsule')) return 'capsule';
    return 'bottle';
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }
}
