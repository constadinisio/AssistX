/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Justified' | 'NC' | 'Withdrawal';

export interface Student {
  id: string;
  name: string;
  dni: string;
  history: ('present' | 'absent' | 'late' | 'nc' | 'withdrawal')[];
  status: AttendanceStatus;
  riskAbsences?: number;
  avatar?: string;
  observations?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  room: string;
  status: 'In Session' | 'Starts 2PM' | 'Scheduled';
  activeStudents: number;
}

export type EventType = 'academic' | 'holiday' | 'administrative' | 'exam';

export interface CalendarEvent {
  id: string;
  date: string; // ISO format
  type: EventType;
  title: string;
  description?: string;
}

export interface Bimester {
  id: string;
  name: string;
  range: string;
  isCurrent: boolean;
}

export interface Activity {
  id: string;
  type: 'Attendance Logged' | 'Grade Modified' | 'Incident Reported';
  details: string;
  time: string;
  icon: string;
}
