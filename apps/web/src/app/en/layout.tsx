import { Providers } from '@/components/providers';

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return <Providers initialLocale="en">{children}</Providers>;
}
