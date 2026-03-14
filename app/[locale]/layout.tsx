import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/theme-provider';
import { NavSidebar } from '@/components/nav-sidebar';
import { Header } from '@/components/header';
import { getDirectoryStructure } from '@/lib/markdown';
import { Metadata } from 'next';
import "../globals.css";

export const metadata: Metadata = {
  title: "BrainDump",
  description: "Personal Knowledge Management System",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { children } = props;
  const { locale } = await props.params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  
  // Pre-fetch directory structure on the server to avoid client-side flicker
  const structure = getDirectoryStructure();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased selection:bg-primary/20 selection:text-primary min-h-screen bg-background">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex h-screen overflow-hidden">
              <NavSidebar 
                className="hidden lg:flex w-80 flex-shrink-0" 
                initialStructure={structure}
              />
              <div className="flex flex-col flex-1 overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 md:px-12 lg:px-16 xl:px-24">
                  <div className="mx-auto max-w-4xl">
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
