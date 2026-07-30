import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-reset-credentials',
  standalone: true,
  templateUrl: './reset-credentials.html',
  styleUrl: './reset-credentials.scss',
})
export class ResetCredentials {
  readonly showPassword = signal(false);
  readonly requireChange = signal(true);
  readonly resetMfa = signal(false);

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
}
