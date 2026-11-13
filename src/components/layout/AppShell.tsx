import { useEffect, useState, type ReactNode } from 'react';
import { useNavigation } from '../../nav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { view } = useNavigation();

  useEffect(() => {
    setMobileOpen(false);
  }, [view]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <TopBar onMenu={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-h-screen flex-col pt-14 lg:pl-[228px]">
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 lg:px-7">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
