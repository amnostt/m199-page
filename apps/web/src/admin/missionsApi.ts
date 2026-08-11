import { adminFetch } from "./session.js";
import type {
  CreateMissionInput,
  MissionAdmin,
  MissionStatus,
  UpdateMissionInput,
} from "./adminTypes.js";

export function listActiveMissions(): Promise<MissionAdmin[]> {
  return adminFetch<MissionAdmin[]>("/missions/admin/active");
}

export function listArchivedMissions(): Promise<MissionAdmin[]> {
  return adminFetch<MissionAdmin[]>("/missions/admin/archived");
}

export function createMission(
  input: CreateMissionInput,
): Promise<MissionAdmin> {
  return adminFetch<MissionAdmin>("/missions/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateMission(
  id: string,
  input: UpdateMissionInput,
): Promise<MissionAdmin> {
  return adminFetch<MissionAdmin>(`/missions/admin/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateMissionStatus(
  id: string,
  status: MissionStatus,
): Promise<MissionAdmin> {
  return adminFetch<MissionAdmin>(
    `/missions/admin/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
}
