import type { PublicationAdmin } from "./adminTypes.js";
import { Button } from "../components/ui/button.js";

export interface PublicationListProps {
  publications: PublicationAdmin[];
  onEdit: (publication: PublicationAdmin) => void;
  onDelete: (publication: PublicationAdmin) => void;
  onStatus: (publication: PublicationAdmin) => void;
}

export function PublicationList({
  publications,
  onEdit,
  onDelete,
  onStatus,
}: PublicationListProps) {
  return (
    <section aria-labelledby="publications-list-heading">
      <h2 id="publications-list-heading">Publicaciones</h2>
      {publications.length === 0 ? (
        <p data-testid="publications-empty">Todavía no hay publicaciones.</p>
      ) : (
        <ul data-testid="publications-list">
          {publications.map((publication) => (
            <li
              key={publication.id}
              data-testid={`publication-${publication.id}`}
            >
              <h3>{publication.title}</h3>
              <p>{publication.excerpt}</p>
              <p>{publication.slug}</p>
              <p>
                {publication.status === "PUBLISHED" ? "Publicada" : "Borrador"}
              </p>
              <p>{publication.scope === "MISSION" ? "Misiones" : "General"}</p>
              <Button type="button" onClick={() => onEdit(publication)}>
                Editar
              </Button>
              <Button type="button" onClick={() => onStatus(publication)}>
                {publication.status === "PUBLISHED"
                  ? "Despublicar"
                  : "Publicar"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(publication)}
              >
                Eliminar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
