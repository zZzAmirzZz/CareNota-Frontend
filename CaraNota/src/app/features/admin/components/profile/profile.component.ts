import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AdminProfile } from '../../models/admin-profile.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private admin  = inject(AdminService);

  profile: AdminProfile | null = null;
  loading = true;

  // ui state
  activeTab: 'info' | 'password' = 'info';
  savingInfo     = false;
  savingPassword = false;
  infoSuccess    = '';
  infoError      = '';
  pwSuccess      = '';
  pwError        = '';
  showCurrent    = false;
  showNew        = false;
  showConfirm    = false;

  infoForm = this.fb.group({
    fullName:    ['', [Validators.required, Validators.minLength(3)]],
    phoneNumber: ['', Validators.required],
    gender:      [''],
  });

  passwordForm = this.fb.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator }
  );

  ngOnInit(): void {
    this.admin.getAdminProfile().subscribe({
      next: (data) => {
        this.profile = data as AdminProfile;
        this.infoForm.patchValue({
          fullName:    this.profile.fullName,
          phoneNumber: this.profile.phoneNumber,
          gender:      this.profile.gender ?? '',
        });
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  get f(): { [k: string]: AbstractControl } { return this.infoForm.controls; }
  get p(): { [k: string]: AbstractControl } { return this.passwordForm.controls; }

  get initials(): string {
    return (this.profile?.fullName ?? 'AD')
      .split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  private passwordMatchValidator(group: AbstractControl) {
    const nw  = group.get('newPassword')?.value;
    const cf  = group.get('confirmPassword')?.value;
    return nw === cf ? null : { mismatch: true };
  }

  saveInfo(): void {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.savingInfo = true;
    this.infoSuccess = '';
    this.infoError   = '';
    const v = this.infoForm.value;
    this.admin.updateAdminProfile({
      fullName:    v.fullName!,
      phoneNumber: v.phoneNumber!,
      gender:      v.gender || undefined,
    }).subscribe({
      next: () => {
        if (this.profile) {
          this.profile.fullName    = v.fullName!;
          this.profile.phoneNumber = v.phoneNumber!;
          this.profile.gender      = v.gender || undefined;
        }
        this.infoSuccess = 'Profile updated successfully.';
        this.savingInfo  = false;
      },
      error: (err) => {
        this.infoError  = err?.error?.message ?? 'Failed to update profile.';
        this.savingInfo = false;
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.savingPassword = true;
    this.pwSuccess = '';
    this.pwError   = '';
    const v = this.passwordForm.value;
    this.admin.changeAdminPassword({
      currentPassword: v.currentPassword!,
      newPassword:     v.newPassword!,
    }).subscribe({
      next: () => {
        this.pwSuccess      = 'Password changed successfully.';
        this.savingPassword = false;
        this.passwordForm.reset();
      },
      error: (err) => {
        this.pwError        = err?.error?.message ?? 'Failed to change password.';
        this.savingPassword = false;
      },
    });
  }
}
