import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AddTestParameter, ParameterRow } from '../../shared/add-test-parameter/add-test-parameter';
import { ProductsService, SpecInput } from '../../core/products.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [FormsModule, RouterLink, AddTestParameter],
  templateUrl: './add-product.html',
  styleUrl: './add-product.scss',
})
export class AddProduct {
  private readonly products = inject(ProductsService);
  private readonly router = inject(Router);

  readonly modalOpen = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly name = signal('');
  readonly category = signal('');
  readonly batchNo = signal('');
  readonly mfgDate = signal('');
  readonly expDate = signal('');
  readonly activeIngredients = signal('');

  readonly specs = signal<SpecInput[]>([]);

  onParametersSaved(rows: ParameterRow[]): void {
    if (rows.length) {
      this.specs.update((list) => [...list, ...rows]);
    }
  }

  removeSpec(index: number): void {
    this.specs.update((list) => list.filter((_, i) => i !== index));
  }

  async onSubmit(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    if (!this.name().trim() || !this.category().trim()) {
      this.error.set('Product name and category are required.');
      return;
    }
    this.saving.set(true);
    try {
      await this.products.create({
        name: this.name().trim(),
        category: this.category().trim(),
        batch_no: this.batchNo().trim(),
        mfg_date: this.mfgDate().trim(),
        exp_date: this.expDate().trim(),
        active_ingredients: this.activeIngredients().trim(),
        specs: this.specs(),
      });
      await this.router.navigate(['/products'], { queryParams: { created: '1' } });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the product.');
    } finally {
      this.saving.set(false);
    }
  }
}
