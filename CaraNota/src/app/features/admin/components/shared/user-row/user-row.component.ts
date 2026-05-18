import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface UserRowData {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  badge?: string;   // e.g. specialty for doctors
  role: 'doctor' | 'receptionist';
}

@Component({
  selector: 'app-user-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-row.component.html',
})
export class UserRowComponent {
  @Input({ required: true }) user!: UserRowData;
  @Output() deleteRequested = new EventEmitter<UserRowData>();

  get initials(): string {
    return this.user.fullName
      .split(' ')
      .map((w) => w[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  get avatarColor(): string {
    return this.user.role === 'doctor'
      ? 'bg-teal-100 text-teal-700'
      : 'bg-orange-100 text-orange-700';
  }

  onDelete(): void {
    this.deleteRequested.emit(this.user);
  }
}
