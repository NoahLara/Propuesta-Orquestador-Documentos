import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { BarChart3, Inbox, Users } from 'lucide-react';
import type { LifecycleStep, UploadIntent, View } from './types';

export interface NavItem {
  id: View;
  label: string;
  caption: string;
  icon: typeof Users;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'cartera',
    label: 'Cartera de clientes',
    caption: 'Expedientes y etapas',
    icon: Users,
  },
  {
    id: 'revision',
    label: 'Bandeja de revisión',
    caption: 'Human-in-the-loop',
    icon: Inbox,
  },
  {
    id: 'dashboard',
    label: 'Panel de operación',
    caption: 'Métricas del motor',
    icon: BarChart3,
  },
];

interface NavigateOptions {
  uploadIntent?: UploadIntent;
  focusDocCode?: string;
  step?: LifecycleStep;
}

interface NavigationValue {
  view: View;
  step: LifecycleStep;
  navigate: (view: View, options?: NavigateOptions) => void;
  goToStep: (step: LifecycleStep, options?: Omit<NavigateOptions, 'step'>) => void;
  uploadIntent: UploadIntent | null;
  clearUploadIntent: () => void;
  focusDocCode: string | null;
  clearFocusDoc: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('cartera');
  const [step, setStep] = useState<LifecycleStep>(1);
  const [uploadIntent, setUploadIntent] = useState<UploadIntent | null>(null);
  const [focusDocCode, setFocusDocCode] = useState<string | null>(null);

  const navigate = useCallback<NavigationValue['navigate']>((nextView, options) => {
    setView(nextView);
    if (options?.step) setStep(options.step);
    if (options?.uploadIntent) setUploadIntent(options.uploadIntent);
    if (options?.focusDocCode) setFocusDocCode(options.focusDocCode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToStep = useCallback<NavigationValue['goToStep']>((nextStep, options) => {
    setView('cliente');
    setStep(nextStep);
    if (options?.uploadIntent) setUploadIntent(options.uploadIntent);
    if (options?.focusDocCode) setFocusDocCode(options.focusDocCode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearUploadIntent = useCallback(() => setUploadIntent(null), []);
  const clearFocusDoc = useCallback(() => setFocusDocCode(null), []);

  const value = useMemo(
    () => ({
      view,
      step,
      navigate,
      goToStep,
      uploadIntent,
      clearUploadIntent,
      focusDocCode,
      clearFocusDoc,
    }),
    [view, step, navigate, goToStep, uploadIntent, clearUploadIntent, focusDocCode, clearFocusDoc],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation debe usarse dentro de NavigationProvider');
  return context;
}

export function navItemFor(view: View): NavItem {
  return NAV_ITEMS.find((item) => item.id === view) ?? NAV_ITEMS[0];
}
