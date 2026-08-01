import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { ProductsService } from './products.service';

export type BatchStage =
  | 'results_entry'
  | 'senior_review'
  | 'qc_approval'
  | 'released'
  | 'production_released'
  | 'rejected';

export interface Batch {
  id: string;
  batch_no: string;
  product_id: string | null;
  product_name: string;
  category: string | null;
  mfg_date: string | null;
  exp_date: string | null;
  analysis_started: string | null;
  analysis_completed: string | null;
  stage: BatchStage;
  conclusion: string | null;
  assigned_to: string | null;
  analyst_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchResult {
  id: string;
  batch_id: string;
  parameter: string;
  specification: string | null;
  result_value: string | null;
  status: 'pending' | 'pass' | 'fail';
  sort_order: number;
}

export interface BatchEvent {
  id: string;
  batch_id: string;
  action: string;
  actor_name: string | null;
  note: string | null;
  signature: string | null;
  created_at: string;
}

export const STAGE_LABEL: Record<BatchStage, string> = {
  results_entry: 'Data Entry',
  senior_review: 'Senior Review',
  qc_approval: 'QC Approval',
  released: 'Released',
  production_released: 'Production Released',
  rejected: 'Correction Required',
};

@Injectable({ providedIn: 'root' })
export class BatchService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly products = inject(ProductsService);

  private get client() {
    return this.supabase.client;
  }

  // ---- Reads --------------------------------------------------------------

  /** Batches the signed-in analyst is actively working (data entry / rejected). */
  async listMine(): Promise<Batch[]> {
    const me = this.auth.profile()?.id;
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .eq('assigned_to', me)
      .in('stage', ['results_entry', 'rejected'])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  /** Every batch assigned to the signed-in analyst (for dashboard stats). */
  async listAllMine(): Promise<Batch[]> {
    const me = this.auth.profile()?.id;
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .eq('assigned_to', me)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  async listByStage(stage: BatchStage): Promise<Batch[]> {
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .eq('stage', stage)
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  /** In-flight batches (not yet released) — for workload / queues. */
  async listActive(): Promise<Batch[]> {
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .in('stage', ['results_entry', 'senior_review', 'qc_approval', 'rejected'])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  async listReleased(): Promise<Batch[]> {
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .in('stage', ['released', 'production_released'])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  /** Completed batches for the archive / documents view. */
  async listArchive(): Promise<Batch[]> {
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .in('stage', ['released', 'production_released', 'rejected'])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  /** Most-recently-updated batches across all stages (dashboards / activity). */
  async listRecent(limit = 8): Promise<Batch[]> {
    const { data, error } = await this.client
      .from('batches')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as Batch[];
  }

  /** Active analysts for assignment dropdowns. */
  async listAnalysts(): Promise<{ id: string; full_name: string }[]> {
    const { data, error } = await this.client.rpc('list_analysts');
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; full_name: string }[];
  }

  async countByStage(stage: BatchStage): Promise<number> {
    const { count, error } = await this.client
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('stage', stage);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async getFull(id: string): Promise<{ batch: Batch; results: BatchResult[]; events: BatchEvent[] }> {
    const { data: batch, error } = await this.client
      .from('batches')
      .select('*')
      .eq('id', id)
      .single<Batch>();
    if (error) throw new Error(error.message);
    const { data: results } = await this.client
      .from('batch_results')
      .select('*')
      .eq('batch_id', id)
      .order('sort_order', { ascending: true });
    const { data: events } = await this.client
      .from('batch_events')
      .select('*')
      .eq('batch_id', id)
      .order('created_at', { ascending: false });
    return {
      batch,
      results: (results ?? []) as BatchResult[],
      events: (events ?? []) as BatchEvent[],
    };
  }

  // ---- Writes -------------------------------------------------------------

  /**
   * Initialize a batch for a product; seeds result rows from its specs.
   * Defaults to the signed-in analyst; pass `assignee` when a QC manager
   * assigns the batch to a specific analyst.
   */
  async createBatch(
    productId: string,
    batchNo: string,
    assignee?: { id: string; name: string },
  ): Promise<Batch> {
    const profile = this.auth.profile();
    if (!profile) throw new Error('You must be signed in.');
    const { product, specs } = await this.products.get(productId);

    const { data: batch, error } = await this.client
      .from('batches')
      .insert({
        batch_no: batchNo || product.batch_no || '',
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        mfg_date: product.mfg_date,
        exp_date: product.exp_date,
        analysis_started: this.today(),
        stage: 'results_entry',
        assigned_to: assignee?.id ?? profile.id,
        analyst_name: assignee?.name ?? profile.full_name,
        created_by: profile.id,
      })
      .select('*')
      .single<Batch>();
    if (error) throw new Error(error.message);

    if (specs.length) {
      const rows = specs.map((s, i) => ({
        batch_id: batch.id,
        parameter: s.parameter,
        specification: s.spec_range,
        sort_order: i,
      }));
      const { error: rErr } = await this.client.from('batch_results').insert(rows);
      if (rErr) throw new Error(rErr.message);
    }
    await this.addEvent(batch.id, 'Batch Initialized');
    return batch;
  }

  /** Persist entered result values / statuses (and optionally the completion date). */
  async saveResults(
    batchId: string,
    rows: { id: string; result_value: string; status: BatchResult['status'] }[],
    completedDate?: string,
  ): Promise<void> {
    for (const r of rows) {
      const { error } = await this.client
        .from('batch_results')
        .update({ result_value: r.result_value, status: r.status })
        .eq('id', r.id);
      if (error) throw new Error(error.message);
    }
    if (completedDate) {
      await this.client.from('batches').update({ analysis_completed: completedDate }).eq('id', batchId);
    }
  }

  forwardToSenior(id: string, signature?: string | null, note?: string) {
    return this.transition(id, 'senior_review', 'Ready for Senior Analyst Check', note, {}, signature);
  }
  seniorVerify(id: string, signature?: string | null, note?: string) {
    return this.transition(id, 'qc_approval', 'Senior Analyst Checked', note, {}, signature);
  }
  qcApprove(id: string, signature?: string | null, note?: string) {
    return this.transition(id, 'released', 'Approved & Released', note, { conclusion: note ?? null }, signature);
  }
  reject(id: string, note?: string) {
    return this.transition(id, 'rejected', 'Rejected / Flagged for Re-test', note);
  }
  productionSignOff(id: string, note?: string) {
    return this.transition(id, 'production_released', 'Released to Production', note);
  }

  private async transition(
    id: string,
    stage: BatchStage,
    action: string,
    note?: string,
    extra: Record<string, unknown> = {},
    signature?: string | null,
  ): Promise<void> {
    const { data, error } = await this.client
      .from('batches')
      .update({ stage, ...extra })
      .eq('id', id)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      // RLS allowed the statement but matched no row — wrong stage or role.
      throw new Error(
        'This batch could not be advanced — it may have already moved on, or your role cannot act on it at its current stage.',
      );
    }
    await this.addEvent(id, action, note, signature);
  }

  private async addEvent(
    batchId: string,
    action: string,
    note?: string,
    signature?: string | null,
  ): Promise<void> {
    const p = this.auth.profile();
    await this.client.from('batch_events').insert({
      batch_id: batchId,
      action,
      actor_id: p?.id ?? null,
      actor_name: p?.full_name ?? null,
      note: note ?? null,
      signature: signature ?? null,
    });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }
}
