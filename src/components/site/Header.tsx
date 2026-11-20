"use client";

import Image from "next/image";
import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, Menu, Search, X } from "lucide-react";
import { nav, site, type NavGroup } from "@/lib/site";
import { InstallAppButton } from "./InstallApp";
import { LanguageSwitch } from "./LanguageSwitch";
import { cn } from "@/lib/utils";

/** Reads the URL for active-link styling; wrapped in Suspense by the layout. */
export function Header({ menu, languages }: { menu?: NavGroup[]; languages?: boolean }) {
  return <HeaderView pathname={usePathname()} menu={menu} languages={languages} />;
}

/** `menu`: the website menu as arranged in Admin → Menu & Pages, read on the server. */
export function HeaderView({ pathname, menu = nav, languages = false }: { pathname: string; menu?: NavGroup[]; languages?: boolean }) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Close the menu and search panel after any navigation (including a search being submitted).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setSearchOpen(false);
  }

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
      <div className="container-page flex h-[72px] items-center justify-between gap-3 xl:gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="PAHAD home" onClick={() => setOpen(false)}>
          <Image src="/images/emblem.png" alt="" width={48} height={48} className="h-12 w-12" loading="eager" />
          <span className="leading-tight">
            <span className="block font-display text-xl font-semibold tracking-wide text-teal">PAHAD</span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted sm:block lg:hidden xl:block">People · Knowledge · Action</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex xl:gap-1">
          {menu.map((group) =>
            group.items ? (
              <div key={group.label} className="group relative">
                <Link
                  href={group.href}
                  className={cn(
                    "flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-2 text-sm xl:px-3.5 xl:text-[15px] font-medium transition-colors hover:bg-sand hover:text-teal",
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
                  "whitespace-nowrap rounded-full px-2 py-2 text-sm xl:px-3.5 xl:text-[15px] font-medium transition-colors hover:bg-sand hover:text-teal",
                  isActive(group.href) ? "text-teal" : "text-ink",
                )}
              >
                {group.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {languages && <LanguageSwitch className="hidden !px-2.5 xl:inline-flex" />}
          <LiveEventsButton onClick={() => setOpen(false)} active={pathname.startsWith("/events")} />
          <Link href="/membership" className="btn btn-primary hidden whitespace-nowrap !py-2.5 sm:inline-flex lg:!px-4 lg:text-sm xl:!px-[1.4rem] xl:text-[0.95rem]">
            Become a member
          </Link>
          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center rounded-full text-teal hover:bg-sand sm:inline-flex"
            aria-expanded={searchOpen}
            aria-controls="site-search"
            aria-label={searchOpen ? "Close search" : "Search the website"}
            onClick={() => {
              setSearchOpen((v) => !v);
              setOpen(false);
            }}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-teal hover:bg-sand lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => {
              setOpen((v) => !v);
              setSearchOpen(false);
            }}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} />}

      {open && (
        // The header's backdrop-blur makes it the containing block for positioned
        // children, so `fixed … bottom-0` would collapse to the header's height.
        // Size the panel from the viewport explicitly instead.
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain border-t border-line bg-white lg:hidden"
        >
          <nav aria-label="Mobile" className="container-page py-4">
            <SearchForm id="mobile-search" className="mb-2" />
            {languages && <LanguageSwitch className="mb-2 w-full justify-center py-2.5" />}
            {menu.map((group) => (
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
            <Link
              href="/admin/login"
              onClick={() => setOpen(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-teal py-3 font-semibold text-teal hover:bg-sand"
            >
              <LogIn className="h-5 w-5" aria-hidden /> Dashboard Login
            </Link>
            <Link href="/membership" onClick={() => setOpen(false)} className="btn btn-primary mt-3 w-full">
              Become a member
            </Link>
            <InstallAppButton apk="/downloads/PAHAD.apk" apkClassName="text-center text-teal" className="btn btn-outline mt-3 w-full text-teal" />
            <a href={site.whatsappChannel} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="mt-4 block text-center text-sm font-semibold text-teal">
              Follow PAHAD on WhatsApp
            </a>
            <a href={`mailto:${site.email}`} className="mt-2 block text-center text-sm text-muted">
              {site.email}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

/** GET form to /search: a client-side navigation once loaded, and a normal form before JavaScript loads. */
function SearchForm({ id, className, autoFocus }: { id: string; className?: string; autoFocus?: boolean }) {
  return (
    <Form action="/search" role="search" className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">Search the website</label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        id={id}
        name="q"
        type="search"
        required
        autoFocus={autoFocus}
        placeholder="Search the website…"
        className="w-full rounded-full border border-line bg-sand py-3 pl-12 pr-24 text-ink placeholder:text-muted focus:border-teal focus:bg-white focus:outline-none"
      />
      <button className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900">
        Search
      </button>
    </Form>
  );
}

/** Desktop search box that drops down under the header. Escape or a click outside closes it. */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('[aria-controls="site-search"]')) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);
  return (
    <div id="site-search" ref={ref} className="absolute inset-x-0 top-full border-y border-line bg-white shadow-xl">
      <div className="container-page max-w-3xl py-5">
        <SearchForm id="desktop-search" autoFocus />
      </div>
    </div>
  );
}

function LiveEventsButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <Link
      href="/events"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "btn whitespace-nowrap !gap-2 !px-3.5 !py-2 text-sm sm:!px-4 sm:!py-2.5 sm:text-[15px] lg:!px-3 lg:text-sm xl:!px-4 xl:text-[15px]",
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
