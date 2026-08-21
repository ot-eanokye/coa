import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AddTestParameter, ParameterRow } from '../../shared/add-test-parameter/add-test-parameter';
import { ProductsService, SpecInput } from '../../core/products.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [FormsModule, RouterLink, AddTestParameter],
  templateUrl: './add-product.html',
  styleUrl: './add-product.scss',
})
export class AddProduct implements OnInit {
  private readonly products = inject(ProductsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly editId = signal<string | null>(null);
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

  readonly editIndex = signal<number | null>(null);
  readonly editParameter = signal('');
  readonly editRange = signal('');

  startEdit(index: number): void {
    const row = this.specs()[index];
    this.editParameter.set(row.parameter);
    this.editRange.set(row.spec_range);
    this.editIndex.set(index);
  }

  saveEdit(): void {
    const i = this.editIndex();
    if (i === null) return;
    const parameter = this.editParameter().trim();
    const spec_range = this.editRange().trim();
    if (parameter) {
      this.specs.update((list) => list.map((r, idx) => (idx === i ? { ...r, parameter, spec_range } : r)));
    }
    this.editIndex.set(null);
  }

  cancelEdit(): void {
    this.editIndex.set(null);
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.editId.set(id);
    try {
      const { product, specs } = await this.products.get(id);
      this.name.set(product.name);
      this.category.set(product.category);
      this.batchNo.set(product.batch_no ?? '');
      this.mfgDate.set(product.mfg_date ?? '');
      this.expDate.set(product.exp_date ?? '');
      this.activeIngredients.set(product.active_ingredients ?? '');
      this.specs.set(specs);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not load the product.');
    }
  }

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
    const payload = {
      name: this.name().trim(),
      category: this.category().trim(),
      batch_no: this.batchNo().trim(),
      mfg_date: this.mfgDate().trim(),
      exp_date: this.expDate().trim(),
      active_ingredients: this.activeIngredients().trim(),
      specs: this.specs(),
    };
    try {
      const id = this.editId();
      if (id) {
        await this.products.update(id, payload);
      } else {
        await this.products.create(payload);
      }
      await this.router.navigate(['/products'], { queryParams: { created: '1' } });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the product.');
    } finally {
      this.saving.set(false);
    }
  }
}
