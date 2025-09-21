'use client';

import Image from 'next/image';
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
      <div className="h-[128px] w-full bg-[var(--gf-header)] shadow-sm">
        {/* full-bleed row: no max-w, no centering, no padding */}
        {/* <div className="flex h-full w-full items-center justify-between"> */}
        <div className="flex h-full w-full items-center justify-between px-4 sm:px-6">
          {/* LEFT: logo + title flush left */}
          <div className="flex items-center gap-3 pl-0">
            <Image
              src="/car.png"
              alt="GridFinder logo"
              width={100}
              height={100}
              priority
              className="rounded"
            />
            <span className="sigmar-regular text-3xl tracking-wide text-[#ffffff]">
              GridFinder
            </span>
          </div>

          {/* RIGHT: nav flush right */}
          <nav className="flex items-center gap-6 text-lg pr-0">
            {NAV.map((item, i) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <div key={item.href} className="flex items-center">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded',
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