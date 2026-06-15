// src/app/features/patient/components/navbar/navbar.component.ts
import { Component, inject } from '@angular/core';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-patient-navbar',
  standalone: true,
  imports: [ RouterModule, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  private authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
