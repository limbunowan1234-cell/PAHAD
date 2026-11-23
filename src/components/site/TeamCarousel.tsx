"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { TeamMember } from "@/lib/types";
import styles from "./TeamCarousel.module.css";

const QUOTES = [
  "Together in the hills, our shared purpose turns every ridge into a bridge.",
  "Real strength lives in the warmth, trust, and quiet dedication we bring to one another.",
  "When local voices lead, every song, seed, and story carries the spirit of home.",
  "Side by side across peaks and valleys, we grow what endures for generations to come.",
  "A team rooted in care and courage can move mountains without losing its heart.",
  "Every step we take together makes the climb lighter and the horizon brighter.",
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function subtitle(person: TeamMember) {
  return person.subtitle || [person.department, person.section].filter(Boolean).join(" · ");
}

function detail(person: TeamMember) {
  return person.detail || [person.designation, person.additional_charge].filter(Boolean).join(" · ");
}

function profileHref(person: TeamMember) {
  const url = person.profile_url;
  return /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//")) ? url : "";
}

function slideOffset(index: number, current: number, length: number) {
  let offset = index - current;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

export function TeamCarousel({ people }: { people: TeamMember[] }) {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (people.length < 2) return;
    const timer = window.setInterval(() => setQuoteIndex((index) => (index + 1) % QUOTES.length), 5000);
    return () => window.clearInterval(timer);
  }, [people.length]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft") setActive((index) => (index - 1 + people.length) % people.length);
      if (event.key === "ArrowRight") setActive((index) => (index + 1) % people.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, people.length]);

  if (people.length === 0) {
    return (
      <section className={styles.section} aria-label="Our Team">
        <div className={styles.topo} aria-hidden />
        <div className={styles.heading}>
          <h1 className={styles.title}>Our <em>Team</em></h1>
          <p className={styles.quote}>Profiles will appear here as the team is added in the admin panel.</p>
        </div>
      </section>
    );
  }

  const person = people[active] ?? people[0];
  const move = (delta: number) => setActive((index) => (index + delta + people.length) % people.length);

  return (
    <section
      className={styles.section}
      aria-label="Our Team"
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        startX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (startX.current === null) return;
        const distance = event.clientX - startX.current;
        startX.current = null;
        if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
      }}
      onPointerCancel={() => { startX.current = null; }}
    >
      <div className={styles.topo} aria-hidden />
      <div className={styles.aura} aria-hidden />

      <header className={styles.heading}>
        <h1 className={styles.title}>Our <em>Team</em></h1>
        <p className={styles.quote} key={quoteIndex}>{`“${QUOTES[quoteIndex]}”`}</p>
      </header>

      <div className={styles.viewport} aria-label="Team member carousel">
        <div className={styles.track}>
          {people.map((member, index) => {
            const offset = slideOffset(index, active, people.length);
            const distance = Math.abs(offset);
            const angle = offset * 25 * Math.PI / 180;
            const radius = 500;
            const transform = `translate3d(${Math.sin(angle) * radius}px, 0, ${(Math.cos(angle) - 1) * radius * 0.86}px) rotateY(${-offset * 23}deg) scale(${Math.max(0.72, 1 - distance * 0.075)})`;
            const isActive = index === active;
            return (
              <button
                type="button"
                key={member.id}
                className={`${styles.card} ${isActive ? styles.activeCard : ""}`}
                style={{
                  transform,
                  opacity: distance > 3.4 ? 0 : Math.max(0, 1 - Math.pow(distance / 3.4, 1.8)),
                  filter: `blur(${Math.min(3.5, distance * 1.05)}px) brightness(${Math.max(0.55, 1 - distance * 0.12)})`,
                  zIndex: Math.round(100 - distance * 15),
                  pointerEvents: distance < 2.6 ? "auto" : "none",
                }}
                aria-label={`${member.name}, ${subtitle(member) || member.section}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => isActive ? setExpanded(true) : setActive(index)}
              >
                {member.photo_url ? (
                  <Image src={member.photo_url} alt="" fill sizes="(max-width: 640px) 60vw, 316px" unoptimized className={styles.photo} />
                ) : (
                  <span className={styles.initials} aria-hidden>{initials(member.name)}</span>
                )}
                <span className={styles.cardShade} aria-hidden />
                <span className={styles.cardTop}>
                  <span className={styles.tag}>{member.tag || member.section}</span>
                  <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                </span>
                <span className={styles.cardCaption}>
                  <span className={styles.subtitle}>{subtitle(member)}</span>
                  <span className={styles.name}>{member.name}</span>
                  {detail(member) && <span className={styles.description}>{detail(member)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <footer className={styles.controls}>
        <div className={styles.controlRow}>
          <button type="button" className={styles.arrow} aria-label="Previous team member" onClick={() => move(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className={styles.memberInfo} aria-live="polite">
            <div className={styles.counter}>
              <span className={styles.number}>{String(active + 1).padStart(2, "0")}</span>
              <span className={styles.counterDivider}>/</span>
              <span className={styles.counterName}>{person.name}</span>
            </div>
            <p className={styles.counterRole}>{subtitle(person) || person.section}</p>
            <button type="button" className={styles.expandButton} onClick={() => setExpanded(true)}>Expand Card</button>
          </div>
          <button type="button" className={styles.arrow} aria-label="Next team member" onClick={() => move(1)}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
        {people.length > 1 && (
          <div className={styles.dots} role="group" aria-label="Choose team member">
            {people.map((member, index) => (
              <button
                type="button"
                key={member.id}
                className={`${styles.dot} ${active === index ? styles.activeDot : ""}`}
                aria-label={`Show ${member.name}`}
                aria-current={active === index ? "true" : undefined}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        )}
      </footer>

      {expanded && (
        <div className={styles.overlay} role="presentation" onClick={(event) => {
          if (event.target === event.currentTarget) setExpanded(false);
        }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="team-dialog-title">
            {person.photo_url ? (
              <Image src={person.photo_url} alt="" fill sizes="100vw" unoptimized className={styles.dialogPhoto} />
            ) : (
              <div className={styles.dialogInitials} aria-hidden>{initials(person.name)}</div>
            )}
            <div className={styles.dialogShade} aria-hidden />
            <div className={styles.dialogTop}>
              <span className={styles.tag}>{person.tag || person.section}</span>
              <button type="button" className={styles.close} onClick={() => setExpanded(false)}>Close <span aria-hidden>×</span></button>
            </div>
            <div className={styles.dialogContent}>
              <p className={styles.subtitle}>{subtitle(person) || person.section}</p>
              <h2 id="team-dialog-title" className={styles.dialogTitle}>{person.name}</h2>
              {detail(person) && <p className={styles.dialogDescription}>{detail(person)}</p>}
              {profileHref(person) && (
                <a
                  className={styles.profileLink}
                  href={profileHref(person)}
                  target={/^https?:\/\//i.test(person.profile_url) ? "_blank" : undefined}
                  rel={/^https?:\/\//i.test(person.profile_url) ? "noreferrer" : undefined}
                >
                  {person.profile_label || "View profile"}
                </a>
              )}
              <p className={styles.dialogCount}>{String(active + 1).padStart(2, "0")} / {String(people.length).padStart(2, "0")}</p>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
