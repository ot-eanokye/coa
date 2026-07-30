import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-reset-credentials',
  standalone: true,
  templateUrl: './reset-credentials.html',
  styleUrl: './reset-credentials.scss',
})
export class ResetCredentials {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly requireChange = signal(true);
  readonly resetMfa = signal(false);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'error' | 'success'>('error');

  readonly temporaryPassword = signal('');
  readonly confirmPassword = signal('');
  readonly targetUserId = signal(''); // Would be set from user selection

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  async onResetCredentials(): Promise<void> {
    this.message.set(null);

    const tempPwd = this.temporaryPassword().trim();
    const confirm = this.confirmPassword().trim();
    const userId = this.targetUserId().trim();

    if (!userId) {
      this.message.set('Please select a user to reset credentials for.');
      this.messageType.set('error');
      return;
    }

    if (!tempPwd || !confirm) {
      this.message.set('Both password fields are required.');
      this.messageType.set('error');
      return;
    }

    if (tempPwd.length < 12) {
      this.message.set('Temporary password must be at least 12 characters long.');
      this.messageType.set('error');
      return;
    }

    if (tempPwd !== confirm) {
      this.message.set('Passwords do not match.');
      this.messageType.set('error');
      return;
    }

    if (!/[A-Z]/.test(tempPwd)) {
      this.message.set('Password must contain at least one uppercase letter.');
      this.messageType.set('error');
      return;
    }

    if (!/[!@#$%^&*]/.test(tempPwd)) {
      this.message.set('Password must contain at least one special character.');
      this.messageType.set('error');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.resetUserCredentials(userId, tempPwd, this.requireChange(), this.resetMfa());
      this.message.set('Credentials reset successfully. User will be notified.');
      this.messageType.set('success');
      this.temporaryPassword.set('');
      this.confirmPassword.set('');
      setTimeout(() => {
        this.router.navigateByUrl('/user-management');
      }, 2000);
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Could not reset credentials.');
      this.messageType.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  onCancel(): void {
    this.router.navigateByUrl('/user-management');
  }
}
