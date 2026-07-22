import React, { useState, useEffect } from 'react';
import Login from './views/Login';
import EmployeeApp from './views/EmployeeApp';
import HrApp from './views/HrApp';

export default function App() {
  const [user, setUser] = useState(null);

  // Restore session from localStorage if exists
  useEffect(() => {
    const savedUser = localStorage.getItem('performify_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('performify_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('performify_user');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === 'hr') {
    return <HrApp user={user} onLogout={handleLogout} />;
  }

  return <EmployeeApp user={user} onLogout={handleLogout} />;
}
