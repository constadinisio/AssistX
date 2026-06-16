/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';

// Layout Components
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';

// Views
import { LoginScreen } from './views/auth/LoginScreen';
import { RegisterScreen } from './views/auth/RegisterScreen';
import { Dashboard } from './views/dashboard/Dashboard';
import { UserManagement } from './views/secretario/UserManagement';
import { StudentsDirectory } from './views/secretario/StudentsDirectory';
import { CourseManagement } from './views/secretario/CourseManagement';
import { AcademicCalendar } from './views/calendar/AcademicCalendar';
import { AttendanceBoard } from './views/preceptor/AttendanceBoard';
import { StudentHistory } from './views/preceptor/StudentHistory';
import { JustificativosPanel } from './views/justificativos/JustificativosPanel';
import { PeriodManagement } from './views/secretario/PeriodManagement';

export default function App() {
  // En lugar de empezar en null o "", debe intentar leer el localStorage de entrada
  const [userRole, setUserRole] = useState<string | null>(() => {
    return localStorage.getItem('userRole');
  });

  // Y para que las pestañas tampoco se pierdan (opcional pero recomendado):
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [cursoFilterId, setCursoFilterId] = useState<number | null>(null);

  const [authView, setAuthView] = useState<'login' | 'register'>('login');


  const handleLogin = (role: string) => {
    setUserRole(role);
    setActiveTab('dashboard');
    localStorage.setItem('activeTab', 'dashboard');
  };

  return (
    <div className="font-sans antialiased">
      {!userRole ? (
        authView === 'login' ? (
          <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterScreen onBackToLogin={() => setAuthView('login')} />
        )
      ) : (
        <>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole as string} />
          <TopBar userRole={userRole as string} />
          <main className="min-h-screen">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <Dashboard key="dash" userRole={userRole as string} onNavigate={setActiveTab} />
              )}
              {activeTab === 'users' && userRole === 'Secretario/a' && (
                <UserManagement key="users" />
              )}
              {activeTab === 'calendar' && (
                <AcademicCalendar key="cal" userRole={userRole as string} />
              )}
              {activeTab === 'students' && userRole === 'Secretario/a' && (
                <StudentsDirectory 
                  key="stu" 
                  cursoIdInicial={cursoFilterId} 
                  onClearFilter={() => setCursoFilterId(null)} 
                />
              )}
              {activeTab === 'courses' && userRole === 'Secretario/a' && (
                <CourseManagement key="courses" onViewStudents={(id) => {
                  setCursoFilterId(id);
                  setActiveTab('students');
                }} />
              )}
              {activeTab === 'preceptor' && (userRole === 'Preceptor/a' || userRole === 'Profesor/a EF') && (
                <AttendanceBoard key="pre" userRole={userRole as string} />
              )}
              {activeTab === 'history' && (userRole === 'Preceptor/a' || userRole === 'Secretario/a') && (
                <StudentHistory key="hist" />
              )}
              {activeTab === 'justificativos' && (userRole === 'Preceptor/a' || userRole === 'Secretario/a') && (
                <JustificativosPanel key="just" />
              )}
              {activeTab === 'periodos' && userRole === 'Secretario/a' && (
                <PeriodManagement key="per" />
              )}
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}
