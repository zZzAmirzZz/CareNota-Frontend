// src/app/features/doctor/pages/visit-summary/visit-summary.ts
// ─────────────────────────────────────────────────────────────────────────────
// Flow A (AI path):
//   recording.ts  →  POST /api/audio/upload  →  navigate here (skipPolling: true)
//   This page calls GET /api/visits/:visitId/summary directly — no polling.
//   The backend returns the AI summary synchronously after upload.
//
// Flow B (Manual path):
//   today-visit.ts sets { state: { skipPolling: true } }
//   This page calls GET /api/visits/:visitId/summary directly.
//   The summary may return 404 (no AI rows yet) — that is expected.
//   The doctor can still edit via PUT and approve via POST /approve.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component, inject, signal, OnInit, OnDestroy, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';


import { DoctorNavbar }    from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { SummaryService }  from '../../../../core/services/summary.service';

import {
  VisitSummaryResponseDto,
  UpdateSummaryDto,
  ApproveSummaryDto,
} from '../../../../core/models/appointment.model';

type PageState =
  | 'loading'    // fetching summary from backend
  | 'ready'      // summary loaded, doctor reviewing
  | 'editing'    // inline edit modal open
  | 'saving'     // PUT /summary in flight
  | 'approving'  // POST /summary/approve in flight
  | 'approved'   // done — sent to patient
  | 'error';

@Component({
  selector: 'app-visit-summary',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DoctorNavbar],
  templateUrl: './visit-summary.html',
  styleUrl:    './visit-summary.css',
})
export class VisitSummary implements OnInit, OnDestroy {
  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private summaryService = inject(SummaryService);

  // ── Core state ─────────────────────────────────────────────────────────────
  visitId     = signal<number>(0);
  pageState   = signal<PageState>('loading');
  errorMsg    = signal<string | null>(null);

  // True when navigated from today-visit with manual mode (no audio uploaded)
  isManualMode = signal(false);

  // Summary data
  summary     = signal<VisitSummaryResponseDto | null>(null);

  // Approval
  docApproved  = signal(false);
  patApproved  = signal(false);
  followUpDate = signal<string>('');
  bothApproved = computed(() => this.docApproved() && this.patApproved());

  // Inline edit
  editingField = signal<string | null>(null);
  editDraft    = signal<string>('');

  // PDF export
  isExporting  = signal(false);

  // Patient info from router state
  patientName  = signal<string>('');

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('visitId'));
    this.visitId.set(id);

    const state = history.state as any;
    if (state?.patient?.name) this.patientName.set(state.patient.name);

    if (state?.skipPolling === true) {
      // Manual path — no audio was uploaded
      this.isManualMode.set(true);
      this.pageState.set('ready');
      // summary will be null — that's fine, doctor fills in fields manually
      // If summary already exists (re-visit), try to load it
      this.tryLoadExistingSummary();
    } else {
      // AI path — audio was just uploaded; call summary directly (no polling)
      this.loadSummary();
    }
  }

  ngOnDestroy(): void {}

  // ── Try to load an existing summary (manual path) ─────────────────────────
  // It is OK if this returns 404 — it means no AI summary exists yet.
  private tryLoadExistingSummary(): void {
    this.summaryService.getSummary(this.visitId()).subscribe({
      next: (data) => {
        this.summary.set(data);
        if (data.isApproved) {
          this.docApproved.set(true);
          this.patApproved.set(true);
          this.pageState.set('approved');
        } else {
          this.pageState.set('ready');
        }
      },
      error: () => {
        // 404 or no summary yet — stay in 'ready' with null summary
        this.pageState.set('ready');
      },
    });
  }

  // ── Load summary ──────────────────────────────────────────────────────────
  private loadSummary(): void {
    this.pageState.set('loading');
    this.summaryService.getSummary(this.visitId()).subscribe({
      next: (data) => {
        this.summary.set(data);
        if (data.isApproved) {
          this.docApproved.set(true);
          this.patApproved.set(true);
          this.pageState.set('approved');
        } else {
          this.pageState.set('ready');
        }
      },
      error: (err) => {
        this.pageState.set('error');
        this.errorMsg.set(err?.error?.message ?? 'Failed to load visit summary.');
      },
    });
  }

  // ── Inline edit ────────────────────────────────────────────────────────────
  startEdit(field: string, currentValue: string): void {
    if (this.pageState() !== 'ready') return;
    this.editingField.set(field);
    this.editDraft.set(currentValue ?? '');
    this.pageState.set('editing');
  }

  cancelEdit(): void {
    this.editingField.set(null);
    this.editDraft.set('');
    this.pageState.set('ready');
  }

  saveEdit(): void {
    const field = this.editingField();
    const draft = this.editDraft().trim();
    if (!field) return;

    this.pageState.set('saving');

    const dto: UpdateSummaryDto = { [field]: draft };

    this.summaryService.editSummary(this.visitId(), dto).subscribe({
      next: () => {
        this.summary.update(s => {
          if (!s) {
            // Manual mode — no summary existed yet, create a minimal shell
            return {
              visitId: this.visitId(),
              isApproved: false,
              doctorSummary: {
                aiSummaryId: 0,
                subjective: field === 'subjective' ? draft : '',
                objective:  field === 'objective'  ? draft : '',
                assessment: field === 'assessment' ? draft : '',
                plan:       field === 'plan'       ? draft : '',
              },
              patientSummary: {
                aiSummaryId:    0,
                diagnosis:      '',
                symptoms:       '',
                treatmentPlan:  '',
                whenToSeekHelp: field === 'whenToSeekHelp' ? draft : '',
                followUp:       '',
              },
            } as VisitSummaryResponseDto;
          }
          if (['subjective', 'objective', 'assessment', 'plan'].includes(field)) {
            return { ...s, doctorSummary: { ...s.doctorSummary, [field]: draft } };
          }
          if (field === 'whenToSeekHelp') {
            return { ...s, patientSummary: { ...s.patientSummary, whenToSeekHelp: draft } };
          }
          return s;
        });
        this.editingField.set(null);
        this.editDraft.set('');
        this.pageState.set('ready');
      },
      error: (err) => {
        this.pageState.set('editing');
        this.errorMsg.set(err?.error?.message ?? 'Save failed. Please try again.');
        setTimeout(() => this.errorMsg.set(null), 4000);
      },
    });
  }

  // ── Approval ───────────────────────────────────────────────────────────────
  toggleDocApproval(): void {
    if (this.pageState() === 'approved') return;
    this.docApproved.update(v => !v);
  }

  togglePatApproval(): void {
    if (this.pageState() === 'approved') return;
    this.patApproved.update(v => !v);
  }

  sendToPatient(): void {
    if (!this.bothApproved()) return;
    this.pageState.set('approving');

    const dto: ApproveSummaryDto = {};   // no body — swagger confirms no request body

    this.summaryService.approveSummary(this.visitId(), dto).subscribe({
      next: () => {
        this.pageState.set('approved');
        this.summary.update(s => s ? { ...s, isApproved: true } : s);
      },
      error: (err) => {
        this.pageState.set('ready');
        this.errorMsg.set(err?.error?.message ?? 'Approval failed. Please try again.');
        setTimeout(() => this.errorMsg.set(null), 5000);
      },
    });
  }

  // ── PDF export ─────────────────────────────────────────────────────────────
  exportPDF(): void {
    this.isExporting.set(true);
    const area = document.getElementById('pdf-export-area')!;

    (window as any).html2canvas(area, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      .then((canvas: any) => {
        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const imgW = 297;
        const imgH = canvas.height * imgW / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH);
        const safeName = this.patientName().replace(/\s+/g, '-') || 'Patient';
        pdf.save(`CareNota-Visit-${this.visitId()}-${safeName}.pdf`);
        this.isExporting.set(false);
      })
      .catch(() => this.isExporting.set(false));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  formatFollowUpDisplay(): string {
    const v = this.followUpDate();
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/doctor/today-visits']);
  }
}
