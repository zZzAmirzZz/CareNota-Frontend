// src/app/features/doctor/pages/recording/recording.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reached via /doctor/recording/:visitId
// The visitId in the URL is the REAL visitId from POST /Api/Visit
// (NOT the appointmentID — today-visit.ts creates the Visit first)
//
// Flow:
//   1. Page loads → auto-starts mic recording
//   2. Doctor clicks "End Recording" → stops MediaRecorder
//   3. Calls AudioService.uploadAudio(blob, visitId) → POST /api/audio/upload
//   4. On success → navigates to /doctor/visit-summary/:visitId
// ─────────────────────────────────────────────────────────────────────────────

import {
  Component, inject, signal, OnInit, OnDestroy, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DoctorNavbar } from '../../../../layout/doctor-layout/doctor-navbar/doctor-navbar';
import { AudioService } from '../../../../core/services/audio.service';

interface PatientInfo {
  name: string;
  id: number;
  age: number;
  gender: string;
  visitType: string;
}

type RecordingState = 'recording' | 'paused' | 'stopped';

@Component({
  selector: 'app-recording',
  standalone: true,
  imports: [CommonModule, RouterModule, DoctorNavbar],
  templateUrl: './recording.html',
  styleUrl: './recording.css',
})
export class Recording implements OnInit, OnDestroy {
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private audioService = inject(AudioService);
  private zone         = inject(NgZone);

  // ── State ──────────────────────────────────────────────────────────────────
  visitId        = signal<number>(0);
  recordingState = signal<RecordingState>('recording');
  elapsedSeconds = signal(0);
  isUploading    = signal(false);
  uploadError    = signal<string | null>(null);

  // Passed from today-visit via router state
  patient = signal<PatientInfo>({
    name: 'Patient', id: 0, age: 0, gender: '—', visitType: '—',
  });

  // 40 bars for waveform
  waveformBars: number[] = Array.from({ length: 40 }, (_, i) => i);
  barHeights = signal<number[]>(Array(40).fill(8));

  // ── Private ────────────────────────────────────────────────────────────────
  private timerInterval:    ReturnType<typeof setInterval> | null = null;
  private waveformInterval: ReturnType<typeof setInterval> | null = null;
  private mediaRecorder:    MediaRecorder | null = null;
  private audioChunks:      Blob[] = [];
  private stream:           MediaStream | null = null;
  private analyser:         AnalyserNode | null = null;
  private audioCtx:         AudioContext | null = null;
  private animFrame:        number | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('visitId'));
    this.visitId.set(id);

    // Recover patient info passed from today-visit.ts via router state
    const state = (this.router.getCurrentNavigation()?.extras?.state
      ?? history.state) as any;
    if (state?.patient) {
      this.patient.set(state.patient);
    }

    this.startMicRecording();
  }

  ngOnDestroy(): void {
    this.clearAll();
    this.stopStream();
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      this.zone.run(() => this.elapsedSeconds.update(s => s + 1));
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
  }

  get formattedTime(): string {
    const s = this.elapsedSeconds();
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  }

  // ── Microphone ─────────────────────────────────────────────────────────────
  private async startMicRecording(): Promise<void> {
    try {
      this.stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioCtx = new AudioContext();
      const source  = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      source.connect(this.analyser);

      this.mediaRecorder = new MediaRecorder(this.stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.start(100);

      this.recordingState.set('recording');
      this.startTimer();
      this.animateWaveform();

    } catch {
      // Mic denied — fallback to simulated waveform
      this.recordingState.set('recording');
      this.startTimer();
      this.startFakeWaveform();
    }
  }

  private animateWaveform(): void {
    if (!this.analyser) return;
    const buf = new Uint8Array(this.analyser.frequencyBinCount);

    const tick = () => {
      if (this.recordingState() === 'stopped') return;
      this.analyser!.getByteFrequencyData(buf);
      const bars = this.waveformBars.map(i => {
        const idx = Math.floor(i * (buf.length / this.waveformBars.length));
        if (this.recordingState() === 'paused') return 4;
        return Math.max(4, Math.min(56, (buf[idx] || 0) * 0.5));
      });
      this.zone.run(() => this.barHeights.set(bars));
      this.animFrame = requestAnimationFrame(tick);
    };

    this.animFrame = requestAnimationFrame(tick);
  }

  private startFakeWaveform(): void {
    this.waveformInterval = setInterval(() => {
      if (this.recordingState() === 'paused') {
        this.zone.run(() => this.barHeights.set(Array(40).fill(4)));
        return;
      }
      const bars = this.waveformBars.map(() => Math.floor(Math.random() * 48) + 6);
      this.zone.run(() => this.barHeights.set(bars));
    }, 80);
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  togglePause(): void {
    if (this.recordingState() === 'recording') {
      this.recordingState.set('paused');
      this.stopTimer();
      this.mediaRecorder?.pause();
    } else if (this.recordingState() === 'paused') {
      this.recordingState.set('recording');
      this.startTimer();
      this.mediaRecorder?.resume();
      if (this.analyser) this.animateWaveform();
    }
  }

  async endRecording(): Promise<void> {
    if (this.recordingState() === 'stopped') return;

    this.recordingState.set('stopped');
    this.stopTimer();
    this.clearAll();

    // Wait for MediaRecorder to flush final chunk
    await new Promise<void>(resolve => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => resolve();
        this.mediaRecorder.stop();
      } else {
        resolve();
      }
    });

    this.stopStream();
    this.uploadAudio();
  }

  // ── Upload via AudioService ────────────────────────────────────────────────
  private uploadAudio(): void {
    // No mic — navigate directly (dev mode without hardware)
    if (this.audioChunks.length === 0) {
      this.router.navigate([`/doctor/visit-summary/${this.visitId()}`]);
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);

    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });

    this.audioService.uploadAudio(blob, this.visitId()).subscribe({
      next: () => {
        this.isUploading.set(false);
        // Navigate to summary page — AI processing happens server-side
        this.router.navigate([`/doctor/visit-summary/${this.visitId()}`]);
      },
      error: (err) => {
        console.error('[Recording] Upload failed', err);
        this.isUploading.set(false);
        this.uploadError.set('Upload failed — navigating to summary anyway…');
        setTimeout(() => {
          this.router.navigate([`/doctor/visit-summary/${this.visitId()}`]);
        }, 2500);
      },
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  private clearAll(): void {
    if (this.timerInterval)    { clearInterval(this.timerInterval);    this.timerInterval = null; }
    if (this.waveformInterval) { clearInterval(this.waveformInterval); this.waveformInterval = null; }
    if (this.animFrame)        { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioCtx?.close().catch(() => {});
  }
}
