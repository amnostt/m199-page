import { Fragment, type ElementType } from "react";
import type { PublicationAdmin } from "./adminTypes.js";
import { MoreHorizontalIcon } from "lucide-react";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../components/ui/context-menu.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";

export interface PublicationListProps {
  heading: string;
  empty: string;
  publications: PublicationAdmin[];
  testId: string;
  onEdit: (publication: PublicationAdmin) => void;
  onDelete: (publication: PublicationAdmin) => void;
  onStatus: (publication: PublicationAdmin) => void;
}

type RowAction = {
  id: string;
  label: string;
  onSelect: () => void;
  group: number;
  destructive?: boolean;
};

type ActionMenu = {
  Group: ElementType;
  Label: ElementType;
  Item: ElementType;
  Separator: ElementType;
};

function RowActionItems({
  actions,
  menu,
}: {
  actions: readonly RowAction[];
  menu: ActionMenu;
}) {
  const groups = actions.reduce<RowAction[][]>((result, action) => {
    (result[action.group] ??= []).push(action);
    return result;
  }, []);
  const Group = menu.Group;
  const Label = menu.Label;
  const Item = menu.Item;
  const Separator = menu.Separator;

  return groups.map((group, index) => (
    <Fragment key={`action-group-${index}`}>
      {index > 0 && <Separator />}
      <Group>
        {index === 0 && <Label>Acciones</Label>}
        {group.map((action) => (
          <Item
            key={action.id}
            className={
              action.destructive
                ? "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive"
                : undefined
            }
            onClick={action.onSelect}
          >
            {action.label}
          </Item>
        ))}
      </Group>
    </Fragment>
  ));
}

const publicationActionMenu = {
  Group: ContextMenuGroup,
  Label: ContextMenuLabel,
  Item: ContextMenuItem,
  Separator: ContextMenuSeparator,
};

const publicationDropdownActionMenu = {
  Group: DropdownMenuGroup,
  Label: DropdownMenuLabel,
  Item: DropdownMenuItem,
  Separator: DropdownMenuSeparator,
};

function publicationRowActions(
  publication: PublicationAdmin,
  onEdit: (publication: PublicationAdmin) => void,
  onDelete: (publication: PublicationAdmin) => void,
  onStatus: (publication: PublicationAdmin) => void,
): RowAction[] {
  return [
    {
      id: "edit",
      label: "Editar",
      onSelect: () => onEdit(publication),
      group: 0,
    },
    {
      id: "status",
      label: publication.status === "PUBLISHED" ? "Despublicar" : "Publicar",
      onSelect: () => onStatus(publication),
      group: 0,
    },
    {
      id: "delete",
      label: "Eliminar",
      onSelect: () => onDelete(publication),
      group: 1,
      destructive: true,
    },
  ];
}

export function PublicationList({
  heading,
  empty,
  publications,
  testId,
  onEdit,
  onDelete,
  onStatus,
}: PublicationListProps) {
  return (
    <section aria-labelledby={`${testId}-heading`} data-testid={testId}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id={`${testId}-heading`}
          className="text-lg font-semibold tracking-tight"
        >
          {heading}
        </h2>
        <span className="text-sm text-muted-foreground">
          {publications.length}{" "}
          {publications.length === 1 ? "publicación" : "publicaciones"}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Alcance</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-16 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {publications.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              publications.map((publication) => {
                const actions = publicationRowActions(
                  publication,
                  onEdit,
                  onDelete,
                  onStatus,
                );
                return (
                  <ContextMenu key={publication.id}>
                    <ContextMenuTrigger
                      render={
                        <TableRow
                          data-testid={`publication-${publication.id}`}
                        />
                      }
                    >
                      <TableCell className="min-w-56">
                        <div className="font-medium">{publication.title}</div>
                        <div className="max-w-[24rem] truncate text-sm text-muted-foreground">
                          {publication.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {publication.type === "POST"
                            ? "Publicación"
                            : publication.type === "OUTING"
                              ? "Salida"
                              : "Evento"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {publication.scope === "MISSION"
                          ? "Misiones"
                          : "General"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            publication.status === "PUBLISHED"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {publication.status === "PUBLISHED"
                            ? "Publicada"
                            : "Borrador"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Acciones para ${publication.title}`}
                              />
                            }
                          >
                            <MoreHorizontalIcon aria-hidden="true" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <RowActionItems
                              actions={actions}
                              menu={publicationDropdownActionMenu}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <RowActionItems
                        actions={actions}
                        menu={publicationActionMenu}
                      />
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
