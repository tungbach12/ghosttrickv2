import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useGlobalContext();

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />; // Or to an unauthorized page
  }

  return <Outlet />;
};

export default ProtectedRoute;
