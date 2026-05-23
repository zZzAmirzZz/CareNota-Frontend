import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AdminManagedRole } from '../../models/admin.model';

@Component({
  selector: 'app-create-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-user.component.html',
})
export class CreateUserComponent {
  private fb      = inject(FormBuilder);
  private admin   = inject(AdminService);
  private router  = inject(Router);

  selectedRole: AdminManagedRole = 'doctor';
  submitting = false;
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(3)]],
    email:       ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    gender:      [''],
    password:    ['', [Validators.required, Validators.minLength(8)]],
    specialty:   [''],
  });

  setRole(role: AdminManagedRole): void {
    this.selectedRole = role;
    // specialty required only for doctors
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

    this.admin
      .createStaff({
        fullName:    v.fullName!,
        email:       v.email!,
        phoneNumber: v.phoneNumber!,
        gender:      v.gender || undefined,
        password:    v.password!,
        role:        this.selectedRole,
        specialty:   v.specialty || undefined,
      })
      .subscribe({
        next: () => {
          this.successMessage = `${this.selectedRole === 'doctor' ? 'Doctor' : 'Receptionist'} account created successfully.`;
          this.form.reset();
          this.submitting = false;
          // navigate to the relevant list after 1.5s
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
