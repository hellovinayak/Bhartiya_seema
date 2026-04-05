import React from 'react';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-army-green-900 text-white border-t-2 border-army-green-700">
      <div className="stripe-tricolour" aria-hidden="true" />
      <div className="container mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-army-green-800 border border-army-gold/50">
              <Shield className="h-5 w-5 text-army-gold" />
            </div>
            <span className="font-headline font-bold text-xl">भारतीय सीमा · BHARTIYA SEEMA</span>
          </Link>
        </div>
        <p className="text-army-khaki-200 text-sm text-center max-w-2xl mx-auto mb-4">
          Secure India's borders with cutting-edge monitoring and rapid response technology. Protecting our nation, empowering our forces.
        </p>
        <p className="text-army-gold/90 font-headline font-semibold text-center text-sm tracking-wider">जय हिंद</p>
      </div>
    </footer>
  );
};

export default Footer;