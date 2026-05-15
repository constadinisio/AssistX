/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Course, Activity, CalendarEvent, Bimester } from './types';

export const mockStudents: Student[] = [
  {
    id: '01',
    name: 'Aristhone, Julian',
    dni: '38.291.004',
    history: ['present', 'present', 'absent', 'absent', 'absent'],
    status: 'NC',
    riskAbsences: 4,
  },
  {
    id: '02',
    name: 'Bauer, Elena',
    dni: '40.112.983',
    history: ['present', 'present', 'present', 'present', 'present'],
    status: 'Present',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100',
  },
  {
    id: '03',
    name: 'Castillo, Marcos',
    dni: '39.882.112',
    history: ['present', 'late', 'present', 'present', 'late'],
    status: 'Late',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
  },
  {
    id: '04',
    name: "D'Angelo, Jane",
    dni: '41.002.339',
    history: ['present', 'present', 'present', 'present', 'present'],
    status: 'Absent',
  },
  {
    id: '05',
    name: 'Evans, Thomas',
    dni: '38.771.554',
    history: ['nc', 'nc', 'nc', 'nc', 'nc'],
    status: 'NC',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=100',
  }
];

export const mockCourses: Course[] = [
  {
    id: '1',
    name: "6° Año - TIC",
    code: '6-TIC',
    room: 'Lab Informática 1',
    status: 'In Session',
    activeStudents: 28,
  },
  {
    id: '2',
    name: "5° Año - Social",
    code: '5-SOC',
    room: 'Aula 104',
    status: 'Scheduled',
    activeStudents: 32,
  },
  {
    id: '3',
    name: "4° Año - Arte",
    code: '4-ART',
    room: 'Aula 201',
    status: 'Scheduled',
    activeStudents: 25,
  }
];

export const mockActivities: Activity[] = [
  {
    id: 'a1',
    type: 'Attendance Logged',
    details: 'Cardiology Seminar (Section A)',
    time: '10 MINUTES AGO',
    icon: 'check_circle',
  },
  {
    id: 'a2',
    type: 'Grade Modified',
    details: 'Student: Marcus Vane (MED-402)',
    time: '2 HOURS AGO',
    icon: 'edit_note',
  },
  {
    id: 'a3',
    type: 'Incident Reported',
    details: 'Absence Threshold Met (ID: #44921)',
    time: 'YESTERDAY',
    icon: 'flag',
  }
];

export const mockEvents: CalendarEvent[] = [
  { id: 'e1', date: '2024-09-02', type: 'administrative', title: 'Teacher Planning' },
  { id: 'e2', date: '2024-09-09', type: 'academic', title: 'Bimester 1 Start' },
  { id: 'e3', date: '2024-09-16', type: 'holiday', title: 'Independence Day' },
  { id: 'e4', date: '2024-09-21', type: 'academic', title: 'Student Day' },
  { id: 'e5', date: '2024-09-25', type: 'exam', title: 'Partial Exams' },
];

export const mockBimesters: Bimester[] = [
  { id: 'b1', name: 'First Bimester', range: 'Sept 9 - Nov 15', isCurrent: true },
  { id: 'b2', name: 'Second Bimester', range: 'Nov 18 - Jan 31', isCurrent: false },
  { id: 'b3', name: 'Third Bimester', range: 'Feb 3 - Apr 12', isCurrent: false },
  { id: 'b4', name: 'Fourth Bimester', range: 'Apr 15 - Jun 28', isCurrent: false },
];
