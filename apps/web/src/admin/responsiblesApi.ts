import { adminFetch } from "./session.js";
import type {
  CreateResponsibleInput,
  Responsible,
  ResponsibleStatus,
} from "./adminTypes.js";

export function listResponsibles(): Promise<Responsible[]> {
  return adminFetch<Responsible[]>("/responsibles");
}

export function createResponsible(
  input: CreateResponsibleInput,
): Promise<Responsible> {
  return adminFetch<Responsible>("/responsibles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      displayName: input.displayName,
      password: input.password,
    }),
  });
}

export function updateResponsibleStatus(
  id: string,
  status: ResponsibleStatus,
): Promise<Responsible> {
  return adminFetch<Responsible>(`/responsibles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
