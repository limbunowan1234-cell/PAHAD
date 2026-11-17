"use server";

import { updateTag } from "next/cache";
import { db, newId } from "@/lib/db";
import { guarded, log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { CATEGORY, istInputToIso, parseOptions, phaseOf, voterKey } from "@/lib/polls";
import type { Poll, PollCategory, PollResultsVisibility } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORY) as PollCategory[];
const VISIBILITIES: PollResultsVisibility[] = ["admin", "after_close", "public"];

async function loadPoll(id: string) {
  const poll = await db.get("polls", id);
  if (!poll) throw new Error("This poll no longer exists.");
  return poll;
}
const receiptsOf = async (pollId: string) => db.findBy("poll_receipts", "poll_id", pollId);
const votersOf = async (pollId: string) => db.findBy("poll_voters", "poll_id", pollId);

/** Replace the eligibility register for a poll (only allowed before anyone has voted). */
async function setVoters(pollId: string, userIds: string[]) {
  const users = new Map((await db.all("users")).filter((u) => u.active).map((u) => [u.id, u]));
  const wanted = new Set(userIds.filter((id) => users.has(id)));
  const current = await votersOf(pollId);
  for (const v of current) if (!wanted.has(v.user_id)) await db.remove("poll_voters", v.id);
  const have = new Set(current.map((v) => v.user_id));
  for (const id of wanted) {
    if (!have.has(id)) await db.insert("poll_voters", { id: voterKey(pollId, id), poll_id: pollId, user_id: id, user_name: users.get(id)!.name, created_at: now() });
  }
  return wanted.size;
}

// ------------------------------------------------------------------ create and edit
export async function savePoll(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("polls.manage", async (user) => {
    const id = str(fd, "id", 60);
    const existing = id ? await loadPoll(id) : null;
    const opens_at = istInputToIso(str(fd, "opens_at", 20));
    const closes_at = istInputToIso(str(fd, "closes_at", 20));
    if (!opens_at || !closes_at) throw new Error("Set the opening and closing date and time.");
    if (closes_at <= opens_at) throw new Error("The closing time must be after the opening time.");

    if (existing && (await receiptsOf(existing.id)).length > 0) {
      // Votes exist: options, voters and category are locked. Only the closing time can move, and it is logged.
      if (phaseOf(existing) === "closed") throw new Error("This poll is closed and can no longer be changed.");
      if (closes_at <= new Date().toISOString()) throw new Error("The new closing time must be in the future.");
      await db.update("polls", existing.id, { closes_at, updated_at: now() });
      await log(user, "changed closing time", "poll", existing.id, existing.title, { before: { closes_at: existing.closes_at }, after: { closes_at } });
      updateTag("polls");
      return "Closing time changed. Options and voters are locked because voting has started.";
    }

    const category = str(fd, "category", 4) as PollCategory;
    if (!CATEGORIES.includes(category)) throw new Error("Choose GB, EB or General Assembly.");
    const title = str(fd, "title", 200);
    if (title.length < 3) throw new Error("Please add a title.");
    const labels = [...new Set(str(fd, "options", 5000).split("\n").map((l) => l.trim().slice(0, 120)).filter(Boolean))];
    if (labels.length < 2) throw new Error("Add at least two candidates or options, one per line.");
    if (labels.length > 50) throw new Error("A poll can have at most 50 options.");
    const results_visibility = str(fd, "results_visibility", 20) as PollResultsVisibility;
    if (!VISIBILITIES.includes(results_visibility)) throw new Error("Choose who can see the results.");
    const voterIds = fd.getAll("voters").map(String);

    const data = {
      category, title, description: str(fd, "description", 3000), results_visibility, opens_at, closes_at, updated_at: now(),
      options: JSON.stringify(labels.map((label, i) => ({ id: `o${i + 1}`, label }))),
    };
    if (existing) {
      if (phaseOf(existing) === "closed") throw new Error("This poll is closed and can no longer be changed.");
      await db.update("polls", existing.id, { ...data, public_authorized: results_visibility === "public" ? existing.public_authorized : false });
      const n = await setVoters(existing.id, voterIds);
      await log(user, "updated", "poll", existing.id, `${title} (${n} eligible)`, {
        before: { title: existing.title, options: parseOptions(existing).map((o) => o.label), opens_at: existing.opens_at, closes_at: existing.closes_at, results_visibility: existing.results_visibility },
        after: { title, options: labels, opens_at, closes_at, results_visibility },
      });
      updateTag("polls");
      return "Saved.";
    }
    const row: Poll = { id: newId(), ...data, status: "draft", public_authorized: false, archived: false, created_by: user.id, created_by_name: user.name, created_at: now() };
    await db.insert("polls", row);
    const n = await setVoters(row.id, voterIds);
    await log(user, "created", "poll", row.id, `${CATEGORY[category].short}: ${title} (${labels.length} options, ${n} eligible)`);
    updateTag("polls");
    return "Poll created as a draft. Open it when you are ready.";
  });
}

// ------------------------------------------------------------------ open, pause, close
export async function setPollStatus(id: string, status: "active" | "paused" | "closed"): Promise<ActionState> {
  return guarded("polls.manage", async (user) => {
    const poll = await loadPoll(id);
    if (poll.archived) throw new Error("Archived polls can't change.");
    if (poll.status === "closed") throw new Error("This poll is closed. Closed polls can't be reopened.");
    if (status === "active") {
      if (parseOptions(poll).length < 2) throw new Error("Add at least two options first.");
      const voters = await votersOf(id);
      if (voters.length === 0) throw new Error("Choose the eligible voters first.");
      if (Date.parse(poll.closes_at) <= Date.now()) throw new Error("The closing time has passed. Set a later closing time first.");
      if (poll.status === "draft") {
        for (const v of voters) await notify(v.user_id, `Voting: “${poll.title}” (${CATEGORY[poll.category].label}) opens ${new Date(poll.opens_at) <= new Date() ? "now" : "soon"}.`, "/admin/voting");
      }
    }
    await db.update("polls", id, { status, updated_at: now(), ...(status === "closed" ? { closes_at: poll.closes_at < now() ? poll.closes_at : now() } : {}) });
    const verb = status === "active" ? (poll.status === "paused" ? "resumed" : "opened") : status === "paused" ? "paused" : "closed";
    await log(user, verb, "poll", id, poll.title, { before: { status: poll.status }, after: { status } });
    updateTag("polls");
    return status === "active" ? "Voting is open (from the opening time)." : status === "paused" ? "Voting is paused." : "Voting is closed. Final results are ready.";
  });
}

export async function archivePoll(id: string, archived: boolean): Promise<ActionState> {
  return guarded("polls.manage", async (user) => {
    const poll = await loadPoll(id);
    if (archived && phaseOf(poll) !== "closed") throw new Error("Close the poll before archiving it.");
    await db.update("polls", id, { archived, updated_at: now() });
    await log(user, archived ? "archived" : "unarchived", "poll", id, poll.title);
    updateTag("polls");
    return archived ? "Archived. Its records are kept." : "Moved back to the poll list.";
  });
}

/** Public results appear on the website only after the President authorises them. */
export async function authorisePublicResults(id: string, on: boolean): Promise<ActionState> {
  return guarded("polls.publish_results", async (user) => {
    const poll = await loadPoll(id);
    if (poll.results_visibility !== "public") throw new Error("This poll's results are not set to Public.");
    if (on && phaseOf(poll) !== "closed") throw new Error("Results can be published only after voting closes.");
    await db.update("polls", id, { public_authorized: on, updated_at: now() });
    await log(user, on ? "published results" : "withdrew public results", "poll", id, poll.title);
    updateTag("polls");
    return on ? "Results are now public on the website." : "Results removed from the website.";
  });
}

/** Only an unused draft can be deleted. Polls with votes are kept for the record (archive them instead). */
export async function deletePoll(id: string): Promise<ActionState> {
  return guarded("polls.manage", async (user) => {
    const poll = await loadPoll(id);
    if (poll.status !== "draft" || (await receiptsOf(id)).length > 0) throw new Error("Only unused drafts can be deleted. Archive finished polls instead.");
    for (const v of await votersOf(id)) await db.remove("poll_voters", v.id);
    await db.remove("polls", id);
    await log(user, "deleted draft", "poll", id, poll.title);
    updateTag("polls");
    return "Draft deleted.";
  });
}

// ------------------------------------------------------------------ voting
/**
 * Casts a vote. One vote per eligible member per poll is enforced by the database: the
 * receipt's id is `${poll}:${user}`, so a second insert fails on any device or session.
 * The ballot records only the choice; nothing links it to the voter.
 */
export async function castVote(pollId: string, optionId: string): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    const poll = await loadPoll(pollId);
    if (poll.archived || phaseOf(poll) !== "active") throw new Error("This poll is not open for voting.");
    if (!(await db.get("poll_voters", voterKey(pollId, user.id)))) throw new Error("You are not eligible to vote in this poll.");
    if (!parseOptions(poll).some((o) => o.id === optionId)) throw new Error("Choose one of the options.");

    const receiptId = voterKey(pollId, user.id);
    if (await db.get("poll_receipts", receiptId)) throw new Error("You have already voted in this poll.");
    try {
      // created_at is the poll's opening time, not the time of voting, so receipts and ballots can't be matched up by time.
      await db.insert("poll_receipts", { id: receiptId, poll_id: pollId, user_id: user.id, created_at: poll.opens_at });
    } catch {
      throw new Error("You have already voted in this poll.");
    }
    try {
      await db.insert("ballots", { id: newId(), poll_id: pollId, option_id: optionId, created_at: poll.opens_at });
    } catch (e) {
      await db.remove("poll_receipts", receiptId); // nothing was counted: let them try again
      throw e;
    }
    updateTag("polls");
    return "Vote Submitted. Thank you for voting.";
  });
}
