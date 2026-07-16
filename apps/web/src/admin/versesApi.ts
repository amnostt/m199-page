import { adminFetch } from "./session.js";
import type { CreateVerseInput, VerseAdmin } from "./adminTypes.js";

export function listVerses(): Promise<VerseAdmin[]> {
  return adminFetch<VerseAdmin[]>("/verses/admin");
}

export function createVerse(input: CreateVerseInput): Promise<VerseAdmin> {
  return adminFetch<VerseAdmin>("/verses/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.text, reference: input.reference }),
  });
}

export function deleteVerse(id: string): Promise<void> {
  return adminFetch<void>(`/verses/admin/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
