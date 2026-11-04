import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import ModalManager from './components/ModalManager';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import MarketplaceAndBuilderPage from './pages/MarketplaceAndBuilderPage';
import CheckoutEscrowPage from './pages/CheckoutEscrowPage';
import LiveMessengerPage from './pages/LiveMessengerPage';
import ProfilePage from './pages/ProfilePage';

function RouteSynchronizer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsRigOpen, openModal, user } = useApp();

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/builder')) {
      setIsRigOpen(true);
    } else if (path.startsWith('/accounts/login')) {
      openModal('auth', { initialTab: 'login' });
    } else if (path.startsWith('/accounts/register')) {
      openModal('auth', { initialTab: 'register' });
    } else if (path.startsWith('/accounts/session')) {
      if (user) {
        navigate('/profile');
      } else {
        openModal('auth', { initialTab: 'login' });
      }
    }
  }, [location.pathname, setIsRigOpen, openModal, user, navigate]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <div className="min-h-screen flex flex-col bg-background text-on-surface font-body-md antialiased selection:bg-secondary-fixed selection:text-on-secondary-fixed">
          <RouteSynchronizer />
          <Navbar />
          <div className="flex-1 flex flex-col">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<MarketplaceAndBuilderPage />} />
                <Route path="/builder/*" element={<MarketplaceAndBuilderPage />} />
                <Route path="/builds/*" element={<MarketplaceAndBuilderPage />} />
                <Route path="/components/*" element={<MarketplaceAndBuilderPage />} />
                <Route path="/parts/*" element={<MarketplaceAndBuilderPage />} />
                <Route path="/accounts/*" element={<MarketplaceAndBuilderPage />} />
                <Route path="/checkout/*" element={<CheckoutEscrowPage />} />
                <Route path="/profile/*" element={<ProfilePage />} />
                <Route
                  path="/messages/*"
                  element={
                    <ErrorBoundary>
                      <LiveMessengerPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/chat/*"
                  element={
                    <ErrorBoundary>
                      <LiveMessengerPage />
                    </ErrorBoundary>
                  }
                />
                <Route path="*" element={<MarketplaceAndBuilderPage />} />
              </Routes>
            </ErrorBoundary>
          </div>
          <Footer />
          <MobileBottomNav />
          <ModalManager />
          <ToastContainer />
        </div>
      </AppProvider>
    </ThemeProvider>
  );
}
