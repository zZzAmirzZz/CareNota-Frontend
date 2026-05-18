import { Component, OnInit, inject, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { AdminProfile } from '../../models/admin-profile.model';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
})
export class AdminShellComponent implements OnInit {
  private adminService = inject(AdminService);
  private router       = inject(Router);

  profile: AdminProfile | null = null;
  dropdownOpen = false;

  ngOnInit(): void {
    this.adminService.getAdminProfile().subscribe({
      next: (data) => { this.profile = data as AdminProfile; },
      error: () => {},
    });
  }

  get initials(): string {
    return (this.profile?.fullName ?? 'AD')
      .split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goToProfile(): void {
    this.dropdownOpen = false;
    this.router.navigate(['/admin/profile']);
  }

  logout(): void {
    this.dropdownOpen = false;
    // Clear tokens then redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.router.navigate(['/auth/login']);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#profile-menu-trigger')) {
      this.dropdownOpen = false;
    }
  }
}
