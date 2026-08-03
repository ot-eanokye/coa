import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsersService } from '../../core/users.service';
import { ROLE_LABELS, ROLE_OPTIONS, UserRole } from '../../core/models';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './create-user.html',
  styleUrl: './create-user.scss',
})
export class CreateUser {
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);

  readonly roleOptions = ROLE_OPTIONS;

  readonly fullName = signal('');
  readonly email = signal('');
  readonly employeeId = signal('');
  readonly role = signal<UserRole | ''>('');
  readonly department = signal('');
  readonly title = signal('');
  readonly password = signal('');
  readonly showPassword = signal(false);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  onRoleChange(value: UserRole | ''): void {
    this.role.set(value);
    // Auto-fill the professional title from the role unless the user typed their own.
    if (value && (!this.title().trim() || ROLE_OPTIONS.some((o) => o.label === this.title()))) {
      this.title.set(ROLE_LABELS[value]);
    }
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const specials = '!@#$%^&*';
    let out = '';
    for (let i = 0; i < 11; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    out += specials[Math.floor(Math.random() * specials.length)];
    this.password.set(out);
    this.showPassword.set(true);
  }

  async onSubmit(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    if (!this.fullName() || !this.email() || !this.role() || !this.password()) {
      this.error.set('Full name, email, role and temporary password are required.');
      return;
    }
    if (this.password().length < 8) {
      this.error.set('Temporary password must be at least 8 characters.');
      return;
    }
    this.saving.set(true);
    try {
      await this.users.create({
        full_name: this.fullName().trim(),
        email: this.email().trim(),
        password: this.password(),
        role: this.role() as UserRole,
        employee_id: this.employeeId().trim(),
        department: this.department().trim(),
        title: this.title().trim(),
      });
      await this.router.navigate(['/users'], { queryParams: { created: '1' } });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not create the user.');
    } finally {
      this.saving.set(false);
    }
  }
}
