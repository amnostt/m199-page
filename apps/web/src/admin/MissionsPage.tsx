import { useEffect, useState } from "react";
import type { MissionAdmin } from "./adminTypes.js";
import { listActiveMissions, listArchivedMissions } from "./missionsApi.js";
import { mapAdminError } from "./adminErrors.js";

function MissionList({
  heading,
  empty,
  missions,
  testId,
}: {
  heading: string;
  empty: string;
  missions: MissionAdmin[];
  testId: string;
}) {
  return (
    <section aria-labelledby={`${testId}-heading`} data-testid={testId}>
      <h2 id={`${testId}-heading`}>{heading}</h2>
      {missions.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul>
          {missions.map((mission) => (
            <li key={mission.id} data-testid={`mission-${mission.id}`}>
              <h3>{mission.title}</h3>
              <p>{mission.heroPhrase}</p>
              <p>{mission.slug}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MissionsPage() {
  const [active, setActive] = useState<MissionAdmin[] | null>(null);
  const [archived, setArchived] = useState<MissionAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    setError(null);
    setActive(null);
    setArchived(null);
    void Promise.all([listActiveMissions(), listArchivedMissions()])
      .then(([nextActive, nextArchived]) => {
        setActive(nextActive);
        setArchived(nextArchived);
      })
      .catch((reason: unknown) => setError(mapAdminError(reason).root));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      data-testid="missions-page"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Misiones</h1>
        <p className="text-sm text-muted-foreground">
          Administra las misiones activas y anteriores.
        </p>
      </header>
      {active === null || archived === null
        ? !error && <p>Cargando misiones…</p>
        : null}
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={load}>
            Reintentar
          </button>
        </div>
      ) : active !== null && archived !== null ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <MissionList
            heading="Misiones activas"
            empty="Todavía no hay misiones activas."
            missions={active}
            testId="active-missions"
          />
          <MissionList
            heading="Misiones anteriores"
            empty="Todavía no hay misiones anteriores."
            missions={archived}
            testId="archived-missions"
          />
        </div>
      ) : null}
    </section>
  );
}
