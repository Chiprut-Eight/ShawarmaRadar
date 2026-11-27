import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import RegionalDashboard from './pages/RegionalDashboard';
import NearMe from './pages/NearMe';
import AdminDashboard from './pages/AdminDashboard';
import ShawarmaGame from './pages/ShawarmaGame';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { initAnalyticsLifecycle, trackPageView } from './services/analytics';

function RouteAnalyticsObserver() {
  const location = useLocation();

  useEffect(() => {
    initAnalyticsLifecycle();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    void trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
}

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  return (
    <Router>
      <RouteAnalyticsObserver />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/near-me" element={<NearMe />} />
          <Route path="/region/:id" element={<RegionalDashboard />} />
          <Route path="/play" element={<ShawarmaGame />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
