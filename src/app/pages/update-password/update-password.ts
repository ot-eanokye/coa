import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-update-password',
  standalone: true,
  templateUrl: './update-password.html',
  styleUrl: './update-password.scss',
})
export class UpdatePassword {
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);

  readonly requirements = [
    'At least 8 characters long',
    'At least one number (0-9)',
    'At least one special character (!@#$%^&*)',
    'Contains uppercase & lowercase',
  ];
}
