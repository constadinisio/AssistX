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
import { Dashboard } from './views/dashboard/Dashboard';
import { UserManagement } from './views/secretario/UserManagement';
import { StudentsDirectory } from './views/secretario/StudentsDirectory';
import { AcademicCalendar } from './views/calendar/AcademicCalendar';
import { AttendanceBoard } from './views/preceptor/AttendanceBoard';

export default function App() {
  const [activeTab, setActiveTab] = useState('login');
  const [userRole, setUserRole] = useState<string>('');

  const handleLogin = (role: string) => {
    setUserRole(role);
    setActiveTab('dashboard');
  };

  return (
    <div className="font-sans antialiased">
      {activeTab === 'login' ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
          <TopBar userRole={userRole} />
          <main className="min-h-screen">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <Dashboard key="dash" userRole={userRole} onNavigate={setActiveTab} />
              )}
              {activeTab === 'users' && userRole === 'Secretario' && (
                <UserManagement key="users" />
              )}
              {activeTab === 'calendar' && (
                <AcademicCalendar key="cal" userRole={userRole} />
              )}
              {activeTab === 'students' && userRole === 'Secretario' && (
                <StudentsDirectory key="stu" />
              )}
              {activeTab === 'preceptor' && (userRole === 'Preceptor' || userRole === 'Profesor EF') && (
                <AttendanceBoard key="pre" userRole={userRole} />
              )}
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}
