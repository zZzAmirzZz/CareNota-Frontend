// login.ts — remove AuthService completely for now

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { UserRole } from '../../../models/user';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {

  selectedRole: UserRole = 'doctor';
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  loginForm: FormGroup;

  roles: { key: UserRole; label: string; icon: string }[] = [
    { key: 'doctor',       label: 'Doctor',       icon: 'stethoscope' },
    { key: 'patient',      label: 'Patient',      icon: 'person'      },
    { key: 'receptionist', label: 'Receptionist', icon: 'calendar'    }
  ];

  roleColorMap: Record<UserRole, string> = {
    doctor:       '#2B6CB0',
    patient:      '#6B46C1',
    receptionist: '#C05621'
  };

  constructor(private fb: FormBuilder, private router: Router) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  selectRole(role: UserRole): void {
    this.selectedRole = role;
    this.errorMessage = '';
  }

  get roleSubtitle(): string {
    const map: Record<UserRole, string> = {
      doctor:       'Sign in to access your patients and clinical tools',
      patient:      'Sign in to view your visit summaries and reminders',
      receptionist: 'Sign in to manage appointments and registrations'
    };
    return map[this.selectedRole];
  }

  get roleColor(): string {
    return this.roleColorMap[this.selectedRole];
  }

  getRoleCardClass(role: UserRole): string {
    const isActive = this.selectedRole === role;
    const base = 'border-2 rounded-xl p-3 text-center cursor-pointer transition-all duration-150 flex flex-col items-center gap-1.5 ';
    if (!isActive) return base + 'border-slate-200 text-slate-400 hover:border-blue-400';
    const activeMap: Record<UserRole, string> = {
      doctor:       'border-blue-500 bg-blue-50 text-blue-600',
      patient:      'border-violet-500 bg-violet-50 text-violet-600',
      receptionist: 'border-amber-500 bg-amber-50 text-amber-600',
    };
    return base + activeMap[role];
  }

  getSubmitBtnClass(): string {
    const map: Record<UserRole, string> = {
      doctor:       'bg-blue-700 hover:bg-blue-800',
      patient:      'bg-violet-600 hover:bg-violet-700',
      receptionist: 'bg-amber-600 hover:bg-amber-700',
    };
    return map[this.selectedRole];
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;

    // ← mock redirect until backend is ready
    setTimeout(() => {
      this.isLoading = false;
      const routes: Record<UserRole, string> = {
        doctor:       '/doctor/dashboard',
        patient:      '/patient/dashboard',
        receptionist: '/receptionist/dashboard'
      };
      this.router.navigate([routes[this.selectedRole]]);
    }, 800);
  }

  get email()    { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }
}
