import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { DoctorProfile } from '../../models/admin.model';
import { UserRowComponent, UserRowData } from '../shared/user-row/user-row.component';
import { ConfirmDeleteModalComponent } from '../shared/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, UserRowComponent, ConfirmDeleteModalComponent],
  templateUrl: './doctors.component.html',
})
export class DoctorsComponent implements OnInit {
  private adminService = inject(AdminService);

  doctors: DoctorProfile[] = [];
  filtered: DoctorProfile[] = [];
  searchQuery = '';
  loading = true;
  error = false;

  // delete modal
  showModal = false;
  pendingDelete: DoctorProfile | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getAllDoctors().subscribe({
      next: (data) => {
        this.doctors = data;
        this.filtered = data;
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      },
    });
  }

  onSearch(): void {
  const q = this.searchQuery.toLowerCase();
  this.filtered = this.doctors.filter(
    (d) =>
      d.fullName.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q)
  );
}

toRowData(d: DoctorProfile): UserRowData {
  return {
    id: d.id,
    fullName: d.fullName,
    email: d.email,
    phoneNumber: d.phoneNumber,
    badge: d.specialty,   // ← was d.specialty
    role: 'doctor',
  };
}

  requestDelete(user: UserRowData): void {
    this.pendingDelete = this.doctors.find((d) => d.id === user.id) ?? null;
    this.showModal = true;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    this.adminService.deleteDoctor(this.pendingDelete.id).subscribe({
      next: () => {
        this.doctors = this.doctors.filter((d) => d.id !== this.pendingDelete!.id);
        this.onSearch();
        this.closeModal();
      },
      error: () => {
        alert('Failed to delete doctor. Please try again.');
        this.closeModal();
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.pendingDelete = null;
  }
}
