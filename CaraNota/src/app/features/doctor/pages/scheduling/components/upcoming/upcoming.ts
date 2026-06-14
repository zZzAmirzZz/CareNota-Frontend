// components/upcoming/upcoming.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import{ Router} from '@angular/router';

// ✅ Import from the single shared model — never redefine locally
import { Appointment } from '../../../../../../core/models/appointment.model';

@Component({
  selector: 'app-upcoming',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming.html',

})
export class Upcoming {
  @Input() nextAppointment: Appointment | null = null;
  @Input() upcomingList: Appointment[] = [];

  // Emit to parent which calls schedulingService.cancelAppointment()
  @Output() cancelAppointment = new EventEmitter<number>();

  // Palette cycles through appointments for avatar colors
  private readonly COLORS = [
    '#E07E7E','#7EB5E0','#7EC49E','#B07EE0','#E0C07E','#7E9EE0'
  ];

private router = inject(Router);

  getAvatarColor(index: number): string {
    return this.COLORS[index % this.COLORS.length];
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  // Convert UTC ISO → local "10:30 AM"
  formatTime(utcString: string): string {
    return new Date(utcString).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  onCancel(appointmentId: number): void {
    this.cancelAppointment.emit(appointmentId);
  }

goHome(): void {
  this.router.navigate(['/doctor/dashboard']);
}}
