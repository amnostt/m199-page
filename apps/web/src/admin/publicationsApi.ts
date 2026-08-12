import { adminFetch } from "./session.js";
import type {
  CreatePublicationInput,
  PublicationAdmin,
  PublicationScope,
  PublicationStatus,
  UpdatePublicationInput,
} from "./adminTypes.js";
const json = { "Content-Type": "application/json" };
const path = (id: string) => `/publications/admin/${encodeURIComponent(id)}`;
export function listPublications(status?: PublicationStatus) {
  return adminFetch<PublicationAdmin[]>(
    `/publications/admin${status ? `?status=${status}` : ""}`,
  );
}
export function getPublication(id: string) {
  return adminFetch<PublicationAdmin>(path(id));
}
export function createPublication(input: CreatePublicationInput) {
  return adminFetch<PublicationAdmin>("/publications/admin", {
    method: "POST",
    headers: json,
    body: JSON.stringify(input),
  });
}
export function updatePublication(id: string, input: UpdatePublicationInput) {
  return adminFetch<PublicationAdmin>(path(id), {
    method: "PATCH",
    headers: json,
    body: JSON.stringify(input),
  });
}
export function updatePublicationStatus(id: string, status: PublicationStatus) {
  return adminFetch<PublicationAdmin>(`${path(id)}/status`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ status }),
  });
}
export function updatePublicationScope(
  id: string,
  scope: PublicationScope,
  missionIds: string[],
) {
  return adminFetch<PublicationAdmin>(`${path(id)}/scope`, {
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ scope, missionIds }),
  });
}
export function deletePublication(id: string) {
  return adminFetch<void>(path(id), { method: "DELETE" });
}
