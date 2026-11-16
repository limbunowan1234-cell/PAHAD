"use server";

import { db, newId } from "@/lib/db";
import type { SubmissionKind } from "@/lib/types";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

const KINDS: SubmissionKind[] = ["contact", "idea", "volunteer", "collaborate", "knowledge"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(fd: FormData, name: string, max = 200) {
  return String(fd.get(name) ?? "").trim().slice(0, max);
}

export async function submitInquiry(_prev: FormState, fd: FormData): Promise<FormState> {
  if (field(fd, "website")) return { ok: true, message: "Thank you." }; // honeypot
  const kind = field(fd, "kind") as SubmissionKind;
  const name = field(fd, "name", 120);
  const email = field(fd, "email", 160);
  const message = field(fd, "message", 4000);
  const errors: Record<string, string> = {};
  if (!KINDS.includes(kind)) errors.kind = "Choose what this is about.";
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!EMAIL.test(email)) errors.email = "Please enter a valid email address.";
  if (message.length < 10) errors.message = "Please write a little more (at least 10 characters).";
  if (Object.keys(errors).length) return { ok: false, message: "Please check the highlighted fields.", errors };

  await db.insert("submissions", {
    id: newId(),
    kind,
    name,
    email,
    phone: field(fd, "phone", 30),
    organisation: field(fd, "organisation", 160),
    message,
    status: "new",
    created_at: new Date().toISOString(),
  });
  return { ok: true, message: "Thank you. Your message has reached the PAHAD team and we will get back to you." };
}

export async function applyForMembership(_prev: FormState, fd: FormData): Promise<FormState> {
  if (field(fd, "website")) return { ok: true, message: "Thank you." };
  const name = field(fd, "name", 120);
  const email = field(fd, "email", 160);
  const phone = field(fd, "phone", 30);
  const area = field(fd, "area", 120);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter your full name.";
  if (!EMAIL.test(email)) errors.email = "Please enter a valid email address.";
  if (phone.replace(/\D/g, "").length < 8) errors.phone = "Please enter a phone number we can reach you on.";
  if (area.length < 2) errors.area = "Please tell us where you are based.";
  if (fd.get("consent") !== "on") errors.consent = "Please confirm you agree to the terms and privacy notice.";
  if (Object.keys(errors).length) return { ok: false, message: "Please check the highlighted fields.", errors };

  const existing = await db.findBy("members", "email", email.toLowerCase());
  if (existing.some((m) => m.status === "applicant" || m.status === "active")) {
    return { ok: true, message: "We already have an application or membership with this email. The team will be in touch." };
  }

  await db.insert("members", {
    id: newId(),
    member_no: "",
    name,
    email: email.toLowerCase(),
    phone,
    area,
    address: field(fd, "address", 300),
    occupation: field(fd, "occupation", 160),
    category: field(fd, "category", 60) || "General",
    interests: fd.getAll("interests").map(String).join(", ").slice(0, 400),
    status: "applicant",
    source: "website",
    notes: field(fd, "motivation", 2000),
    added_by: "Website application",
    directorate: "",
    created_at: new Date().toISOString(),
  });
  return {
    ok: true,
    message: "Thank you for applying. Your application has been received and the membership team will contact you after verification.",
  };
}
