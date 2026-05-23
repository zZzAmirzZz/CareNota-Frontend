import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminManagedRole } from '../../../models/admin.model'; // ← Add this import
export interface UserRowData {
  id: number;            // ← back to number
  fullName: string;
  email: string;
  phoneNumber?: string;  // ← keep optional, Doctor doesn't guarantee it
  badge?: string;
  role: AdminManagedRole;
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
