// src/app/features/doctor/pages/doctor-profile/doctor-profile.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { DoctorService, Doctor } from '../../../../core/services/doctor.service';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [RouterModule, DoctorNavbar],
  templateUrl: './doctor-profile.html',
  styleUrl: './doctor-profile.css',
})
export class DoctorProfile implements OnInit {
  private doctorService = inject(DoctorService);

  doctor    = signal<Doctor | null>(null);
  isLoading = signal(true);
  error     = signal<string | null>(null);
  initials  = signal('DR');

  ngOnInit(): void {
    this.doctorService.resolveDoctorProfile().subscribe({
      next: (doc: Doctor) => {
        this.doctor.set(doc);
        this.initials.set(
          doc.fullName
            .split(' ')
            .slice(0, 2)
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile. Please try again.');
        this.isLoading.set(false);
      },
    });
  }
}
