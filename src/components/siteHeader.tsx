'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/guide', label: 'Beginner’s Guide' },
  { href: '/events', label: 'Events' },
  { href: '/pro-races', label: 'Pro Races' },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50">
      {/* main bar only (no extra strip underneath) */}
      <div className="h-[128px] w-full bg-[var(--gf-header)] shadow-sm">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          {/* Placeholder logo + title */}
          <div className="flex items-center gap-3">
            <div aria-hidden className="h-10 w-10 rounded bg-white/80 ring-1 ring-black/10" />
            <span className="sigmar-regular text-2xl tracking-wide text-[#1b2432]">
              GridFinder
            </span>
          </div>

          {/* Right nav: white → red on hover/active */}
          <nav className="flex items-center gap-6 text-lg">
            {NAV.map((item, i) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <div key={item.href} className="flex items-center">
                  <Link
                    href={item.href}
                    className={[
                      'transition-colors',
                      'text-white hover:text-[var(--gf-red)]',
                      active ? 'text-[var(--gf-red)]' : '',
                    ].join(' ')}
                  >
                    {item.label}
                  </Link>
                  {i < NAV.length - 1 && (
                    <span className="mx-4 hidden text-white/70 md:inline">|</span>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
