import type { FileAssetResponse } from "./adminTypes.js";
import { FileUploadWidget } from "./FileUploadWidget.js";
import { Field, FieldDescription, FieldLabel } from "../components/ui/field.js";
import { Button } from "../components/ui/button.js";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

const MAX_IMAGES = 5;

export interface PublicationImageFieldProps {
  imageIds: string[];
  onChange: (imageIds: string[]) => void;
  disabled?: boolean;
}

export function PublicationImageField({
  imageIds,
  onChange,
  disabled = false,
}: PublicationImageFieldProps) {
  const replaceImage = (index: number, asset: FileAssetResponse) => {
    if (
      imageIds.some(
        (imageId, current) => current !== index && imageId === asset.id,
      )
    )
      return;
    onChange(
      imageIds.map((imageId, current) =>
        current === index ? asset.id : imageId,
      ),
    );
  };

  const removeImage = (index: number) => {
    onChange(imageIds.filter((_, current) => current !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= imageIds.length) return;
    const next = [...imageIds];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    onChange(next);
  };

  const appendImage = (asset: FileAssetResponse) => {
    if (imageIds.length >= MAX_IMAGES || imageIds.includes(asset.id)) return;
    onChange([...imageIds, asset.id]);
  };

  return (
    <Field data-testid="publication-images-field">
      <FieldLabel>Imágenes de la publicación</FieldLabel>
      <FieldDescription id="publication-images-description">
        Agrega de una a cinco imágenes. La primera imagen es la destacada y
        aparecerá en las listas y portadas.
      </FieldDescription>

      {imageIds.length > 0 && (
        <div
          role="list"
          aria-label="Imágenes de la publicación"
          className="space-y-3"
        >
          {imageIds.map((imageId, index) => (
            <div
              key={imageId}
              role="listitem"
              data-testid={`publication-image-${index}`}
              className="rounded-lg border border-border bg-muted/20 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {index === 0 && (
                    <Star aria-hidden="true" className="size-4" />
                  )}
                  Imagen {index + 1}
                  {index === 0 && (
                    <span className="text-xs font-normal text-muted-foreground">
                      (destacada)
                    </span>
                  )}
                </span>
                <span className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mover imagen ${index + 1} arriba`}
                    onClick={() => moveImage(index, -1)}
                    disabled={disabled || index === 0}
                  >
                    <ChevronUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Mover imagen ${index + 1} abajo`}
                    onClick={() => moveImage(index, 1)}
                    disabled={disabled || index === imageIds.length - 1}
                  >
                    <ChevronDown aria-hidden="true" />
                  </Button>
                </span>
              </div>
              <FileUploadWidget
                category="PUBLICATION_FEATURED_IMAGE"
                fileId={imageId}
                onUploaded={(asset) => replaceImage(index, asset)}
                onRemove={() => removeImage(index)}
                preview
                previewVariant="hero"
                previewAlt={`Imagen ${index + 1} de la publicación`}
                data-testid={`publication-image-upload-${index}`}
              />
            </div>
          ))}
        </div>
      )}

      {imageIds.length < MAX_IMAGES && (
        <FileUploadWidget
          category="PUBLICATION_FEATURED_IMAGE"
          fileId={null}
          onUploaded={appendImage}
          preview={false}
          description={`Agrega otra imagen (${imageIds.length}/${MAX_IMAGES}).`}
          data-testid="publication-image-add"
        />
      )}
    </Field>
  );
}
