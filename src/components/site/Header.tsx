"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { nav, site } from "@/lib/site";
import { InstallAppButton } from "./InstallApp";
import { cn } from "@/lib/utils";

/** Reads the URL for active-link styling; wrapped in Suspense by the layout. */
export function Header() {
  return <HeaderView pathname={usePathname()} />;
}

export function HeaderView({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const isActive = (href: string, items?: { href: string }[]) =>
    pathname === href || (href !== "/" && pathname.startsWith(href)) || items?.some((i) => pathname.startsWith(i.href));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-shadow",
        scrolled ? "border-line shadow-[0_6px_24px_-12px_rgb(15_58_67/0.25)]" : "border-transparent",
      )}
    >
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="PAHAD home" onClick={() => setOpen(false)}>
          <Image src="/images/emblem.png" alt="" width={48} height={48} className="h-12 w-12" priority />
          <span className="leading-tight">
            <span className="block font-display text-xl font-semibold tracking-wide text-teal">PAHAD</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted sm:block">People · Knowledge · Action</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((group) =>
            group.items ? (
              <div key={group.label} className="group relative">
                <Link
                  href={group.href}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors hover:bg-sand hover:text-teal",
                    isActive(group.href, group.items) ? "text-teal" : "text-ink",
                  )}
                >
                  {group.label}
                  <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden />
                </Link>
                <div className="invisible absolute left-1/2 top-full w-80 -translate-x-1/2 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-2xl border border-line bg-white p-2 shadow-xl">
                    {group.items.map((item) => (
                      <Link key={item.href} href={item.href} className="block rounded-xl px-4 py-3 hover:bg-sand">
                        <span className="block text-sm font-semibold text-teal">{item.label}</span>
                        {item.description && <span className="mt-0.5 block text-sm text-muted">{item.description}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={group.label}
                href={group.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[15px] font-medium transition-colors hover:bg-sand hover:text-teal",
                  isActive(group.href) ? "text-teal" : "text-ink",
                )}
              >
                {group.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <LiveEventsButton onClick={() => setOpen(false)} active={pathname.startsWith("/events")} />
          <Link href="/membership" className="btn btn-primary hidden !py-2.5 sm:inline-flex">
            Become a member
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-teal hover:bg-sand lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-[72px] bottom-0 overflow-y-auto border-t border-line bg-white lg:hidden">
          <nav aria-label="Mobile" className="container-page py-4">
            {nav.map((group) => (
              <div key={group.label} className="border-b border-line">
                {group.items ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-4 text-left text-lg font-semibold text-teal"
                      aria-expanded={openGroup === group.label}
                      onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                    >
                      {group.label}
                      <ChevronDown className={cn("h-5 w-5 transition-transform", openGroup === group.label && "rotate-180")} />
                    </button>
                    {openGroup === group.label && (
                      <div className="pb-3">
                        {group.items.map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-ink hover:bg-sand">
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link href={group.href} onClick={() => setOpen(false)} className="block py-4 text-lg font-semibold text-teal">
                    {group.label}
                  </Link>
                )}
              </div>
            ))}
            <Link href="/membership" onClick={() => setOpen(false)} className="btn btn-primary mt-6 w-full">
              Become a member
            </Link>
            <InstallAppButton className="btn btn-outline mt-3 w-full text-teal" />
            <a href={`mailto:${site.email}`} className="mt-4 block text-center text-sm text-muted">
              {site.email}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function LiveEventsButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <Link
      href="/events"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "btn !gap-2 !px-3.5 !py-2 text-sm sm:!px-4 sm:!py-2.5 sm:text-[15px]",
        active ? "bg-coral text-ink" : "border-[1.5px] border-coral text-coral-700 hover:bg-coral hover:text-ink",
      )}
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral-700" />
      </span>
      Live Events
    </Link>
  );
}
