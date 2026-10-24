import React from 'react';
import { ServerProvider } from './context/ServerContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PeruDniSection } from './components/PeruDniSection';
import { BankYapoSection } from './components/BankYapoSection';
import { ServerLiveMonitor } from './components/ServerLiveMonitor';
import { AdmissionSection } from './components/AdmissionSection';
import { CitizenOpinionSection } from './components/CitizenOpinionSection';
import { WorkForumsSection } from './components/WorkForumsSection';
import { AlbumSection } from './components/AlbumSection';
import { Footer } from './components/Footer';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { DiscordAuthModal } from './components/DiscordAuthModal';
import { WhitelistInfoModal } from './components/WhitelistInfoModal';

function MainApp() {
  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-sans relative selection:bg-red-600 selection:text-white">
      {/* Navigation with Discord user state & Admin trigger */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Hero Section with grand PE:RP branding & direct Discord/Whitelist CTAs */}
        <Hero />

        {/* 2. DNI Peruano RENIEC (Generación de identidad con Roblox & Supabase) */}
        <PeruDniSection />

        {/* 3. Banco & Billetera Móvil Yapo PE:RP */}
        <BankYapoSection />

        {/* 4. Admission Section (Original Peruvian RP admission pathway) */}
        <AdmissionSection />

        {/* 5. Estadísticas del Servidor PE:RP (Aforo en vivo & Telemetría ER:LC) */}
        <ServerLiveMonitor />

        {/* 6. Foros de Trabajo (Bolsa de Empleo PE:RP - Próximamente) */}
        <WorkForumsSection />

        {/* 7. Álbum Fotográfico Oficial PE:RP */}
        <AlbumSection />

        {/* 6. Citizen Opinion Wall (Verified Discord community reports) */}
        <CitizenOpinionSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Admin Security Password, Admin Panel, Official Discord Auth & Whitelist Modals */}
      <AdminPasswordModal />
      <AdminPanelModal />
      <DiscordAuthModal />
      <WhitelistInfoModal />
    </div>
  );
}

export default function App() {
  return (
    <ServerProvider>
      <MainApp />
    </ServerProvider>
  );
}
