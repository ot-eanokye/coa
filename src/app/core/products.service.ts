import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ProductStatus = 'active' | 'archived';

export interface Product {
  id: string;
  name: string;
  category: string;
  code: string | null;
  batch_no: string | null;
  mfg_date: string | null;
  exp_date: string | null;
  active_ingredients: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface SpecInput {
  parameter: string;
  spec_range: string;
}

export interface NewProduct {
  name: string;
  category: string;
  batch_no?: string;
  mfg_date?: string;
  exp_date?: string;
  active_ingredients?: string;
  specs: SpecInput[];
}

const CATEGORY_ABBR: Record<string, string> = {
  syrup: 'SYR',
  syrups: 'SYR',
  tablet: 'TAB',
  tablets: 'TAB',
  capsule: 'CAP',
  capsules: 'CAP',
  suspension: 'SUS',
  suspensions: 'SUS',
};

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly supabase = inject(SupabaseService);

  async list(): Promise<Product[]> {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as Product[];
  }

  async get(id: string): Promise<{ product: Product; specs: SpecInput[] }> {
    const { data: product, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('id', id)
      .single<Product>();
    if (error) {
      throw new Error(error.message);
    }
    const { data: specs } = await this.supabase.client
      .from('product_specifications')
      .select('parameter, spec_range')
      .eq('product_id', id)
      .order('sort_order', { ascending: true });
    return { product, specs: (specs ?? []) as SpecInput[] };
  }

  async create(input: NewProduct): Promise<Product> {
    const code = this.generateCode(input.category);
    const { data: product, error } = await this.supabase.client
      .from('products')
      .insert({
        name: input.name,
        category: input.category,
        code,
        batch_no: input.batch_no || null,
        mfg_date: input.mfg_date || null,
        exp_date: input.exp_date || null,
        active_ingredients: input.active_ingredients || null,
      })
      .select('*')
      .single<Product>();
    if (error) {
      throw new Error(error.message);
    }

    if (input.specs.length) {
      const rows = input.specs.map((s, i) => ({
        product_id: product.id,
        parameter: s.parameter,
        spec_range: s.spec_range,
        sort_order: i,
      }));
      const { error: specErr } = await this.supabase.client
        .from('product_specifications')
        .insert(rows);
      if (specErr) {
        throw new Error(specErr.message);
      }
    }
    return product;
  }

  async setStatus(id: string, status: ProductStatus): Promise<void> {
    const { error } = await this.supabase.client
      .from('products')
      .update({ status })
      .eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
  }

  private generateCode(category: string): string {
    const abbr = CATEGORY_ABBR[category.trim().toLowerCase()] ?? category.slice(0, 3).toUpperCase();
    const letters = Array.from({ length: 2 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)],
    ).join('');
    const digits = String(Math.floor(10 + Math.random() * 90));
    return `EC-${abbr}-${letters}${digits}`;
  }
}
