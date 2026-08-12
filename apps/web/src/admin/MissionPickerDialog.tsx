import { useEffect, useState } from "react";
import type { MissionAdmin } from "./adminTypes.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog.js";
import { Button } from "../components/ui/button.js";

export interface MissionPickerDialogProps {
  open: boolean;
  missions: MissionAdmin[];
  selectedIds: string[];
  onConfirm: (missionIds: string[]) => void | Promise<void>;
  onCancel: () => void;
}

export function MissionPickerDialog({
  open,
  missions,
  selectedIds,
  onConfirm,
  onCancel,
}: MissionPickerDialogProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);

  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds, open]);

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Elegir misiones</DialogTitle>
          <DialogDescription>
            Seleccioná las misiones activas relacionadas con esta publicación.
          </DialogDescription>
        </DialogHeader>
        {missions.length === 0 ? (
          <p data-testid="mission-picker-empty">No hay misiones activas.</p>
        ) : (
          <fieldset>
            <legend className="sr-only">Misiones activas</legend>
            {missions
              .filter((mission) => mission.status === "ACTIVE")
              .map((mission) => (
                <label key={mission.id} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(mission.id)}
                    onChange={() => toggle(mission.id)}
                  />
                  {mission.title}
                </label>
              ))}
          </fieldset>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={missions.length === 0 || selected.length === 0}
            onClick={() => void onConfirm(selected)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
