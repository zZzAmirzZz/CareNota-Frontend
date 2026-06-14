// components/weekcalendar/weekcalendar.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../models/scheduling.models';

interface WeekDay {
  name: string;
  shortName: string;
  date: number;
  fullDate: Date;
  isToday: boolean;
}

// Color palette — cycles per appointment index within a day
// Each entry: Tailwind bg + left-border color (inline style) + text color class
const PALETTES = [
  { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }, // blue
  { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' }, // violet
  { bg: '#D1FAE5', border: '#10B981', text: '#065F46' }, // emerald
  { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }, // amber
  { bg: '#FFE4E6', border: '#F43F5E', text: '#9F1239' }, // rose
  { bg: '#CFFAFE', border: '#06B6D4', text: '#164E63' }, // cyan
  { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' }, // pink
];

@Component({
  selector: 'app-weekcalendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekcalendar.html',
})
export class Weekcalendar implements OnChanges {
  @Input() events: CalendarEvent[] = [];
  @Input() weekStart: Date = new Date();
  @Output() weekChanged = new EventEmitter<Date>();

  readonly rowHeight = 64;
  readonly dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  readonly timeSlots = [
    { label: '9 AM',  hour: 9  },
    { label: '10 AM', hour: 10 },
    { label: '11 AM', hour: 11 },
    { label: '12 PM', hour: 12 },
    { label: '1 PM',  hour: 13 },
    { label: '2 PM',  hour: 14 },
    { label: '3 PM',  hour: 15 },
  ];

  weekDays: WeekDay[] = [];
  weekLabel = '';

  // Tracks how many events have been rendered per day column so we can
  // assign a unique palette index to each appointment.
  private _dayCounters: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['weekStart'] || changes['events']) {
      this.buildWeek();
    }
  }

  private buildWeek(): void {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const todayIso = new Date().toISOString().slice(0, 10);

    this.weekDays = this.dayNames.map((name, i) => {
      const d = new Date(this.weekStart);
      d.setDate(d.getDate() + i);
      return {
        name,
        shortName: name.slice(0, 3).toUpperCase(),
        date: d.getDate(),
        fullDate: d,
        isToday: d.toISOString().slice(0, 10) === todayIso,
      };
    });

    const s = this.weekDays[0].fullDate;
    const e = this.weekDays[5].fullDate;
    this.weekLabel = `${s.getDate()} ${months[s.getMonth()]} → ${e.getDate()} ${months[e.getMonth()]}`;
  }

  prevWeek(): void {
    const prev = new Date(this.weekStart);
    prev.setDate(prev.getDate() - 6);
    this.weekChanged.emit(prev);
  }

  nextWeek(): void {
    const next = new Date(this.weekStart);
    next.setDate(next.getDate() + 6);
    this.weekChanged.emit(next);
  }

  /** All events for a given day column (by index), regardless of slot. */
  getEventsForDay(dayIdx: number): CalendarEvent[] {
    return this.events.filter(e => e.dayIndex === dayIdx);
  }

  /**
   * Returns events that START in this slot hour.
   * We use this to render them once at the right row.
   */
  getEvents(dayIdx: number, slotHour: number): CalendarEvent[] {
    return this.events.filter(
      e => e.dayIndex === dayIdx && Math.floor(e.startHour) === slotHour
    );
  }

  /** Pixel offset from the top of this slot row */
  getTopOffset(slotHour: number, startHour: number): number {
    return (startHour - slotHour) * this.rowHeight;
  }

  /** Pixel height — minimum 44 px so short appts remain readable */
  getEventHeight(start: number, end: number): number {
    return Math.max((end - start) * this.rowHeight - 4, 44);
  }

  formatEventTime(start: number, end: number): string {
    return `${this.hourToString(start)} – ${this.hourToString(end)}`;
  }

  /**
   * Returns the palette for a given event.
   * We use the event id modulo palette length so colors are stable across re-renders.
   */
  getPalette(evt: CalendarEvent): { bg: string; border: string; text: string } {
    return PALETTES[evt.id % PALETTES.length];
  }

  private hourToString(hour: number): string {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${display}:${m === 0 ? '00' : String(m).padStart(2, '0')} ${suffix}`;
  }
}
