import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Home as HomeIcon, LayoutDashboard, FileWarning, MapPin, Eye, User as UserIcon, Menu, X, ShieldCheck, ChevronDown, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAlerts } from '../../contexts/AlertContext';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useAlerts();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleProfile = () => setProfileOpen(!profileOpen);

  const closeMenus = () => {
    setIsOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
  };

  const isActive = (path: string) => location.pathname === path;

  // Navigation items with icons
  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresAuth: true },
    { path: '/incidents', label: 'Incidents', icon: FileWarning, requiresAuth: true },
    { path: '/map', label: 'Map', icon: MapPin, requiresAuth: true },
    { path: '/surveillance', label: 'Surveillance', icon: Eye, requiresAuth: true },
  ];

  return (
    <header className="bg-army-green-800 text-white shadow-army sticky top-0 z-50 border-b-2 border-army-green-700">
      {/* Indian Tricolour stripe */}
      <div className="stripe-tricolour" aria-hidden="true" />
      <div className="container mx-auto px-4 py-3">
        {/* Top Row: Logo + User Actions */}
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group" onClick={closeMenus}>
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-army-green-900 border-2 border-army-gold/60 shadow-inner-badge group-hover:scale-110 transition-transform duration-300">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/1200px-Emblem_of_India.svg.png"
                alt="Emblem of India"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div>
              <span className="font-headline font-bold text-xl md:text-2xl tracking-tight text-white block group-hover:text-army-gold transition-colors duration-300">BHARTIYA SEEMA</span>
            </div>
          </Link>

          {/* User Actions (Right Side) */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/alerts" className="relative p-1 group" onClick={closeMenus}>
                  <Bell className="h-6 w-6 text-army-khaki-100 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-army-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <button onClick={toggleProfile} className="flex items-center space-x-1 focus:outline-none group">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name.replace(' ', '+')}&background=random`}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover border-2 border-army-khaki-300 group-hover:border-army-gold group-hover:scale-110 transition-all duration-300"
                    />
                    <ChevronDown className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 animate-scale-in origin-top-right">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.rank}, {user.unit}</p>
                      </div>
                      <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-army-green-50 flex items-center space-x-2" onClick={closeMenus}>
                        <UserIcon className="h-4 w-4" />
                        <span>My Profile</span>
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-army-red-600 hover:bg-army-red-50 flex items-center space-x-2">
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              !(['/login', '/signup'].includes(location.pathname) || location.pathname.startsWith('/admin')) && (
                <div className="hidden md:flex items-center space-x-2">
                  <Link to="/login" className="btn btn-secondary text-sm hover:scale-105 transition-transform duration-200" onClick={closeMenus}>Login</Link>
                  <Link to="/signup" className="btn btn-primary text-sm hover:scale-105 transition-transform duration-200" onClick={closeMenus}>Sign Up</Link>
                </div>
              )
            )}
            <button className="md:hidden focus:outline-none group" onClick={toggleMenu}>
              {isOpen ? <X className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" /> : <Menu className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />}
            </button>
          </div>
        </div>

        {/* Bottom Row: Navigation - Below Logo, Left Aligned */}
        <nav className="hidden md:flex items-center space-x-1 mt-3 pt-3 border-t border-army-green-700/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isItemActive = isActive(item.path);
            let showItem = !item.requiresAuth || !!user;
            if ((user || location.pathname.startsWith('/admin')) && item.label === 'Home') {
              showItem = false;
            }

            if (!showItem) return null;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                  transition-all duration-300 ease-out
                  ${isItemActive 
                    ? 'text-white bg-army-green-700' 
                    : 'text-army-khaki-100 hover:text-white hover:bg-army-green-700/50'
                  }
                `}
                onClick={closeMenus}
              >
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-army-gold group-hover:w-full transition-all duration-300"></span>
                <Icon className={`h-4 w-4 ${isItemActive ? 'text-army-gold' : 'text-army-khaki-200 group-hover:text-army-gold'} transition-colors duration-300 group-hover:scale-110`} />
                <span className="relative z-10">{item.label}</span>
                {isItemActive && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-army-gold rounded-full animate-pulse"></span>}
              </Link>
            );
          })}
          {!user && !location.pathname.startsWith('/admin') && (
            <Link
              to="/admin/login"
              className={`
                group relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ml-2
                transition-all duration-300 ease-out
                ${isActive('/admin/login') || isActive('/admin/dashboard')
                  ? 'text-army-gold bg-army-green-900' 
                  : 'text-army-gold/80 hover:text-army-gold hover:bg-army-green-700/50'
                }
              `}
              onClick={closeMenus}
            >
              <ShieldCheck className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
              <span className="relative z-10">Command Center</span>
            </Link>
          )}
        </nav>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pt-4 pb-3 border-t border-army-green-700 mt-3 animate-fade-in">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isItemActive = isActive(item.path);
                let showItem = !item.requiresAuth || !!user;
                if ((user || location.pathname.startsWith('/admin')) && item.label === 'Home') {
                  showItem = false;
                }
                if (!showItem) return null;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-300 ${isItemActive ? 'bg-army-green-700 text-white border-l-4 border-army-gold' : 'hover:bg-army-green-700 text-army-khaki-100'}`}
                    onClick={closeMenus}
                  >
                    <Icon className={`h-5 w-5 ${isItemActive ? 'text-army-gold' : ''}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {!user && !location.pathname.startsWith('/admin') && (
                <Link to="/admin/login" className={`px-4 py-3 rounded-lg flex items-center space-x-3 transition-all duration-300 ${isActive('/admin/login') ? 'bg-army-green-900 text-army-gold border-l-4 border-army-gold' : 'hover:bg-army-green-700 text-army-gold'}`} onClick={closeMenus}>
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-medium">Command Center</span>
                </Link>
              )}
              {user ? (
                <>
                  <Link to="/profile" className="px-4 py-3 rounded-lg flex items-center space-x-3 hover:bg-army-green-700 text-army-khaki-100" onClick={closeMenus}>
                    <UserIcon className="h-5 w-5" />
                    <span>Profile</span>
                  </Link>
                  <button onClick={handleLogout} className="px-4 py-3 rounded-lg flex items-center space-x-3 text-left text-army-red-300 hover:bg-army-green-700 w-full">
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                !(['/login', '/signup'].includes(location.pathname) || location.pathname.startsWith('/admin')) && (
                  <>
                    <Link to="/login" className="px-4 py-3 rounded-lg hover:bg-army-green-700 text-army-khaki-100" onClick={closeMenus}>Login</Link>
                    <Link to="/signup" className="px-4 py-3 rounded-lg hover:bg-army-green-700 text-army-khaki-100" onClick={closeMenus}>Sign Up</Link>
                  </>
                )
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

