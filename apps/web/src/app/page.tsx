import { Dashboard } from '@/components/dashboard';
import { Providers } from '@/components/providers';

export default function Home() {
  return (
    <Providers initialLocale="ru">
      <Dashboard />
    </Providers>
  );
}
