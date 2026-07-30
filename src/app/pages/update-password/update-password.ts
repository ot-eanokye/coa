import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-update-password',
  standalone: true,
  templateUrl: './update-password.html',
  styleUrl: './update-password.scss',
})
export class UpdatePassword {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly messageType = signal<'error' | 'success'>('error');

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');

  readonly requirements = [
    'At least 8 characters long',
    'At least one number (0-9)',
    'At least one special character (!@#$%^&*)',
    'Contains uppercase & lowercase',
  ];

  async onUpdatePassword(): Promise<void> {
    this.message.set(null);

    const current = this.currentPassword().trim();
    const newPwd = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    if (!current || !newPwd || !confirm) {
      this.message.set('All fields are required.');
      this.messageType.set('error');
      return;
    }

    if (newPwd.length < 8) {
      this.message.set('New password must be at least 8 characters long.');
      this.messageType.set('error');
      return;
    }

    if (newPwd !== confirm) {
      this.message.set('New passwords do not match.');
      this.messageType.set('error');
      return;
    }

    if (!/[A-Z]/.test(newPwd) || !/[a-z]/.test(newPwd)) {
      this.message.set('Password must contain both uppercase and lowercase letters.');
      this.messageType.set('error');
      return;
    }

    if (!/\d/.test(newPwd)) {
      this.message.set('Password must contain at least one number.');
      this.messageType.set('error');
      return;
    }

    if (!/[!@#$%^&*]/.test(newPwd)) {
      this.message.set('Password must contain at least one special character (!@#$%^&*).');
      this.messageType.set('error');
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.updatePassword(current, newPwd);
      this.message.set('Password updated successfully. Redirecting...');
      this.messageType.set('success');
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      setTimeout(() => {
        this.router.navigateByUrl('/user-settings');
      }, 1500);
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Could not update password.');
      this.messageType.set('error');
    } finally {
      this.loading.set(false);
    }
  }

  onCancel(): void {
    this.router.navigateByUrl('/user-settings');
  }
}

