import React from 'react';
import { Navigate } from 'react-router-dom';
import SignupForm from '../components/auth/SignupForm';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';

const SignupPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main 
        className="flex-grow bg-cover bg-center relative"
        style={{ backgroundImage: "url('/custom-army.jpg')" }}
      >
        <div className="absolute inset-0 bg-army-green-900 bg-opacity-70"></div>
        <div className="relative container mx-auto px-4 py-16 flex justify-center">
          <SignupForm />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SignupPage;