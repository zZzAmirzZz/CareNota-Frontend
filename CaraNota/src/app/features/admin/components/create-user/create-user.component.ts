import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AdminManagedRole } from '../../models/admin.model';
import { strongPassword, egyptianPhone, noWhitespace, maxLength } from '../../../../core/validators/app.validators';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create-user.component.html',
})
export class CreateUserComponent {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private router = inject(Router);


  selectedRole: AdminManagedRole = 'doctor';
  submitting = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;                    // ← Fixed

form = this.fb.group({
  fullName:    ['', [Validators.required, noWhitespace, maxLength(100)]],
  email:       ['', [Validators.required, Validators.email]],
  phoneNumber: ['', [Validators.required, egyptianPhone]],
  gender:      [''],
  password:    ['', [Validators.required, strongPassword]],
  specialty:   [''],
});

  get pwChecks() {
    const v: string = this.form.get('password')?.value ?? '';
    return {
      length:    v.length >= 8,
      uppercase: /[A-Z]/.test(v),
      special:   /[^A-Za-z0-9]/.test(v),
    };
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  setRole(role: AdminManagedRole): void {
    this.selectedRole = role;
    const ctl = this.form.get('specialty')!;
    if (role === 'doctor') {
      ctl.setValidators(Validators.required);
    } else {
      ctl.clearValidators();
      ctl.setValue('');
    }
    ctl.updateValueAndValidity();
  }

  get f(): { [key: string]: AbstractControl } {
    return this.form.controls;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const v = this.form.value;

    this.admin.createStaff({
      fullName:    v.fullName!,
      email:       v.email!,
      phoneNumber: v.phoneNumber!,
      gender:      v.gender || undefined,
      password:    v.password!,
      role:        this.selectedRole,
      specialty:   v.specialty || undefined,
    }).subscribe({
      next: () => {
        this.successMessage = `${this.selectedRole === 'doctor' ? 'Doctor' : 'Receptionist'} account created successfully.`;
        this.form.reset();
        this.submitting = false;
        setTimeout(() => {
          this.router.navigate([`/admin/${this.selectedRole === 'doctor' ? 'doctors' : 'receptionists'}`]);
        }, 1500);
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message ?? 'Something went wrong. Please try again.';
        this.submitting = false;
      },
    });
  }
}
