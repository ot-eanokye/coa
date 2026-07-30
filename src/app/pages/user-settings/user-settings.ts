import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { SignaturePad } from '../../shared/signature-pad/signature-pad';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [SignaturePad],
  templateUrl: './user-settings.html',
  styleUrl: './user-settings.scss',
})
export class UserSettings {
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);

  readonly profile = this.auth.profile;
  readonly currentSignature = computed(() => this.auth.profile()?.signature_url ?? null);

  readonly sigValue = signal<string | null>(null);
  readonly savingSig = signal(false);
  readonly sigMessage = signal<string | null>(null);

  onSigChanged(v: string | null): void {
    this.sigValue.set(v);
    this.sigMessage.set(null);
  }

  async saveSignature(): Promise<void> {
    if (this.savingSig()) return;
    this.sigMessage.set(null);
    if (!this.sigValue()) {
      this.sigMessage.set('Draw or upload a signature first.');
      return;
    }
    this.savingSig.set(true);
    try {
      await this.auth.saveSignature(this.sigValue());
      this.sigMessage.set('Signature saved. It will be applied automatically at your next sign-off.');
    } catch (e) {
      this.sigMessage.set(e instanceof Error ? e.message : 'Could not save the signature.');
    } finally {
      this.savingSig.set(false);
    }
  }

  async removeSignature(): Promise<void> {
    if (this.savingSig()) return;
    this.savingSig.set(true);
    this.sigMessage.set(null);
    try {
      await this.auth.saveSignature(null);
      this.sigValue.set(null);
      this.sigMessage.set('Saved signature removed. You will be asked to sign at each sign-off.');
    } catch (e) {
      this.sigMessage.set(e instanceof Error ? e.message : 'Could not remove the signature.');
    } finally {
      this.savingSig.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
