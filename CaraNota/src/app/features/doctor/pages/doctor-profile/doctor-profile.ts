// src/app/features/doctor/pages/doctor-profile/doctor-profile.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { DoctorService } from '../../../../core/services/doctor.service';
import { Doctor } from '../../../../core/models/appointment.model';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorNavbar],
  templateUrl: './doctor-profile.html',
  styleUrl: './doctor-profile.css',
})
export class DoctorProfile implements OnInit {
  private doctorService = inject(DoctorService);

  doctor   = signal<Doctor | null>(null);
  isLoading = signal(true);
  error    = signal<string | null>(null);
  initials = signal('DR');

  // Static display stats — replace with real API calls if backend adds them
  stats = [
    { label: 'Total Patients', value: '248', icon: 'patients' },
    { label: 'This Month',     value: '34',  icon: 'month'    },
    { label: 'Avg. Rating',    value: '4.9', icon: 'star'     },
    { label: 'Years Active',   value: '7',   icon: 'years'    },
  ];

  ngOnInit(): void {
    this.doctorService.resolveDoctorId().subscribe({
      next: (doc) => {
        this.doctor.set(doc);
        this.initials.set(
          doc.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
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
