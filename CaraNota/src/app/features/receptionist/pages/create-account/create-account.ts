// src/app/features/receptionist/pages/create-account/create-account.ts

import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountForm } from '../../../../shared/components/account-form/account-form';
import { RegisterRequest } from '../../../../core/models/user';
import { ReceptionistNavbar } from '../../receptionist-layout/receptionist-navbar/receptionist-navbar';

@Component({
  selector: 'app-create-account',
  standalone: true,
  imports: [CommonModule, ReceptionistNavbar, AccountForm],
  templateUrl: './create-account.html',
})
export class CreateAccount {
  private authService = inject(AuthService);
  private router      = inject(Router);

  @ViewChild(AccountForm) accountForm?: AccountForm;

  isLoading      = signal(false);
  errorMessage   = signal('');
  successMessage = signal('');

  onFormSubmit(payload: RegisterRequest): void {
    const dto: RegisterRequest = { ...payload, role: 'patient' };

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.register(dto).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set(`Account created for ${dto.fullName}!`);
        this.accountForm?.reset();
        setTimeout(() => this.router.navigate(['/receptionist/dashboard']), 1500);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg =
          err?.error?.message ??
          (typeof err?.error === 'string' ? err.error : null) ??
          'Failed to create account. Please check the details.';
        this.errorMessage.set(msg);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/receptionist/dashboard']);
  }
}
