"use client";

import { useAuth } from '@/lib/auth/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated and has completed onboarding, redirect to chat
    if (user && user.onboardingCompleted) {
      router.push('/chat');
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm onLogin={login} />;
  }

  // Show onboarding if not completed
  if (!user.onboardingCompleted) {
    return <OnboardingWizard />;
  }

  // User is authenticated and onboarded, but we haven't redirected yet
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting to chat...</p>
      </div>
    </div>
  );
}