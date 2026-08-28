import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Discover from './pages/Discover';
import Buyers from './pages/Buyers';
import Campaigns from './pages/Campaigns';
import Emails from './pages/Emails';
import Reports from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/buyers" element={<Buyers />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/emails" element={<Emails />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
