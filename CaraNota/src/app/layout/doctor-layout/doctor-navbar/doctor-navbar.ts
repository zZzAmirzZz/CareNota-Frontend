// src/app/layout/doctor-layout/doctor-navbar/doctor-navbar.ts
// ─────────────────────────────────────────────────────────────────────────────
// Matches the import path already used across the project:
//   import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar'
// ─────────────────────────────────────────────────────────────────────────────
import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-doctor-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './doctor-navbar.html',
  styleUrl: './doctor-navbar.css',
})
export class DoctorNavbar implements OnInit {
  private doctorService = inject(DoctorService);
  private auth          = inject(AuthService);
  private router        = inject(Router);

  servicesOpen   = false;
  profileOpen    = signal(false);
  doctorName     = signal('Doctor');
  doctorInitials = signal('DR');
  doctorId       = signal(0);

  services = [
    { label: 'Today\'s Visits', route: '/doctor/today-visits' },
    { label: 'Scheduling',      route: '/doctor/scheduling'   },
    { label: 'Patients',        route: '/doctor/patients'     },
  ];

  ngOnInit(): void {
    // Load doctor info for initials — uses cached doctorId if already resolved
    try {
      this.doctorService.resolveDoctorId().subscribe({
        next: (doc) => {
          this.doctorName.set(doc.fullName);
          this.doctorId.set(doc.id);
          this.doctorInitials.set(
            doc.fullName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
          );
        },
        error: () => { /* keep defaults */ },
      });
    } catch {
      // Not logged in — keep defaults
    }
  }

  toggleServices(): void {
    this.servicesOpen = !this.servicesOpen;
    if (this.servicesOpen) this.profileOpen.set(false);
  }

  toggleProfile(): void {
    this.profileOpen.update(v => !v);
    if (this.profileOpen()) this.servicesOpen = false;
  }

  goToProfile(): void {
    this.profileOpen.set(false);
    this.router.navigate(['/doctor/profile']);
  }

  logout(): void {
    this.profileOpen.set(false);
    // Call auth.logout() if it exists in your AuthService
    // this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Close both dropdowns when clicking anywhere outside them
  @HostListener('document:click', ['$event'])
  onOutsideClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    if (!t.closest('.navbar-services-menu') && !t.closest('.navbar-profile-menu')) {
      this.servicesOpen = false;
      this.profileOpen.set(false);
    }
  }
}
