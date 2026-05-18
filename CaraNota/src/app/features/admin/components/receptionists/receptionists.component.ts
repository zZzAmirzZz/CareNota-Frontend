import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ReceptionistProfile } from '../../models/admin.model';
import { UserRowComponent, UserRowData } from '../shared/user-row/user-row.component';
import { ConfirmDeleteModalComponent } from '../shared/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-receptionists',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, UserRowComponent, ConfirmDeleteModalComponent],
  templateUrl: './receptionists.component.html',
})
export class ReceptionistsComponent implements OnInit {
  private adminService = inject(AdminService);

  receptionists: ReceptionistProfile[] = [];
  filtered: ReceptionistProfile[] = [];
  searchQuery = '';
  loading = true;
  error = false;

  showModal = false;
  pendingDelete: ReceptionistProfile | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.adminService.getAllReceptionists().subscribe({
      next: (data) => {
        this.receptionists = data;
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
    this.filtered = this.receptionists.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
  }

  toRowData(r: ReceptionistProfile): UserRowData {
    return {
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      phoneNumber: r.phoneNumber,
      role: 'receptionist',
    };
  }

  requestDelete(user: UserRowData): void {
    this.pendingDelete = this.receptionists.find((r) => r.id === user.id) ?? null;
    this.showModal = true;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    this.adminService.deleteReceptionist(this.pendingDelete.id).subscribe({
      next: () => {
        this.receptionists = this.receptionists.filter((r) => r.id !== this.pendingDelete!.id);
        this.onSearch();
        this.closeModal();
      },
      error: () => {
        alert('Failed to delete receptionist. Please try again.');
        this.closeModal();
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.pendingDelete = null;
  }
}
