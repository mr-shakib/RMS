'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUIStore } from '@/store/uiStore';
import { Role } from '@rms/shared';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, setCurrentUser } = useUIStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login');
        return;
      }

      // If we don't have user info, fetch it
      if (!currentUser) {
        try {
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            // Token is invalid or expired
            console.warn('Token validation failed, redirecting to login');
            localStorage.removeItem('token');
            setCurrentUser(null);
            router.push('/login');
            return;
          }

          const result = await response.json();
          setCurrentUser(result.data.user);
          setIsChecking(false);
        } catch (error) {
          console.error('Authentication error:', error);
          localStorage.removeItem('token');
          setCurrentUser(null);
          router.push('/login');
          return;
        }
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [currentUser, router, setCurrentUser]);

  // Check role-based access
  useEffect(() => {
    if (!isChecking && currentUser && allowedRoles && !allowedRoles.includes(currentUser.role)) {
      // Redirect to dashboard if user doesn't have access
      router.push('/dashboard');
    }
  }, [isChecking, currentUser, allowedRoles, router]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return null;
  }

  return <>{children}</>;
}
