import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Award, AlertTriangle, MapPin, ChevronRight, Star, Radio, Target, Zap, Hand } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
          {/* Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/custom-army.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-army-green-950/95 via-army-green-900/85 to-army-green-950/95" />
          
          {/* Animated Grid */}
          <div className="absolute inset-0 opacity-10" 
            style={{ 
              backgroundImage: 'linear-gradient(rgba(197, 160, 40, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(197, 160, 40, 0.3) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} 
          />
          
          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-1 h-1 bg-army-gold rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                  opacity: 0.3 + Math.random() * 0.5
                }}
              />
            ))}
          </div>

          <div className="relative z-10 container mx-auto px-4 text-center">
            {/* Shield Icon with Glow */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 bg-army-gold/20 blur-3xl rounded-full"></div>
              <div className="relative flex items-center justify-center h-24 w-24 mx-auto rounded-full border-4 border-army-gold bg-army-green-900/80 backdrop-blur-sm">
                <Shield className="h-12 w-12 text-army-gold" strokeWidth={1.5} />
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-saffron font-headline font-semibold tracking-[0.4em] uppercase text-sm mb-4">
              भारतीय सीमा सुरक्षा
            </p>
            
            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-extrabold text-white mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-army-gold via-yellow-400 to-army-gold bg-clip-text text-transparent">
                BHARTIYA
              </span>
              <br />
              <span className="text-white">SEEMA</span>
            </h1>
            
            {/* Tagline */}
            <p className="text-xl md:text-2xl text-army-khaki-100 mb-10 max-w-3xl mx-auto leading-relaxed">
              Borders aren't just lines on a map — they are the frontlines of courage, held by our warriors.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-headline font-bold text-army-gold">15K+</div>
                <div className="text-army-khaki-200 text-sm uppercase tracking-wider">Border Guards</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-headline font-bold text-army-gold">5K+</div>
                <div className="text-army-khaki-200 text-sm uppercase tracking-wider">Incidents Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-headline font-bold text-army-gold">99.9%</div>
                <div className="text-army-khaki-200 text-sm uppercase tracking-wider">Uptime</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/login" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-saffron rounded-lg hover:bg-orange-600"
              >
                <span className="mr-2">Secure Login</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/signup" 
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-army-green-900 transition-all duration-300 bg-white/95 rounded-lg hover:bg-white"
              >
                <span className="mr-2">Register</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-6 h-10 border-2 border-army-gold/50 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-army-gold rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gradient-to-b from-army-green-950 to-army-green-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-headline font-bold text-white mb-4">
                Operational <span className="text-army-gold">Capabilities</span>
              </h2>
              <p className="text-army-khaki-200 max-w-2xl mx-auto">
                Advanced technology meets military precision for border security
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: AlertTriangle, title: 'Real-time Alerts', desc: 'Instant notification system for border incursions and security threats' },
                { icon: MapPin, title: 'Geo-location', desc: 'Precise tracking of incidents with GPS coordinates and mapping' },
                { icon: Target, title: 'Threat Assessment', desc: 'AI-powered analysis to evaluate and categorize security risks' },
                { icon: Radio, title: 'Rapid Response', desc: 'Coordinated deployment with real-time communication channels' },
                { icon: Shield, title: 'Secure Platform', desc: 'End-to-end encryption protecting sensitive military data' },
                { icon: Award, title: 'Proven Results', desc: 'Successfully monitored and secured thousands of border kilometers' },
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-army-gold/50 transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="w-14 h-14 rounded-xl bg-army-gold/20 flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-army-gold" />
                  </div>
                  <h3 className="text-xl font-headline font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-army-khaki-200 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote Section */}
        <section className="py-20 bg-army-khaki-50 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-army-gold/60 text-army-gold mb-8 bg-white shadow-lg">
                <Star className="w-10 h-10" />
              </div>
              <blockquote className="text-2xl md:text-3xl font-headline mb-8 text-army-green-900 leading-relaxed italic">
                "हमारे कदम थम नहीं सकते, क्योंकि जब तक एक भी जवान खड़ा है, तब तक भारत की धरती पर कोई खतरा नहीं आ सकता।"
              </blockquote>
              <p className="text-army-gold font-headline font-bold text-lg uppercase tracking-widest">— Service Before Self · जय हिंद</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-r from-army-green-800 to-army-green-900 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-4xl md:text-5xl font-headline font-bold text-white mb-6">
              Ready to Serve the Nation?
            </h2>
            <p className="text-xl text-army-khaki-100 max-w-2xl mx-auto mb-10">
              Join our network of dedicated personnel protecting India's borders. 
              Get access to cutting-edge technology and real-time alert systems.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              {['End-to-End Encrypted', 'Real-Time Monitoring', 'AI-Powered Detection', '24/7 Support'].map((item, i) => (
                <div key={i} className="flex items-center text-army-khaki-200">
                  <Zap className="w-4 h-4 text-army-gold mr-2" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <Link 
              to="/signup" 
              className="inline-flex items-center justify-center px-10 py-5 text-xl font-bold text-white transition-all duration-300 bg-saffron rounded-xl hover:bg-orange-600"
            >
              <Hand className="w-6 h-6 mr-3" />
              Join Bhartiya Seema
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;
