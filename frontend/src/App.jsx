import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import Leads from './pages/Leads'
import Forms from './pages/Forms'
import Analytics from './pages/Analytics'
import EmailSequences from './pages/EmailSequences'
import WhatsAppLeads from './pages/WhatsAppLeads'
import InstagramLeads from './pages/InstagramLeads'
import Settings from './pages/Settings'
import FormPublic from './pages/FormPublic'
import InstagramAutomation from './pages/InstagramAutomation'
import Content from './pages/Content'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/f/:id" element={<FormPublic />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/email-sequences" element={<EmailSequences />} />
          <Route path="/whatsapp" element={<WhatsAppLeads />} />
          <Route path="/instagram" element={<InstagramLeads />} />
          <Route path="/instagram-auto" element={<InstagramAutomation />} />
          <Route path="/content" element={<Content />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
