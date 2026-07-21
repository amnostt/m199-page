/**
 * DownloadLabels — class-validator constraint for the
 * `downloadLabels?: Record<fileId, label>` payload field.
 *
 * Sibling invariant: `downloadLabels` is only valid when `downloadIds` is
 * also supplied. Every key MUST belong to `downloadIds`. Each value MUST
 * be a string of 1-120 characters after trimming.
 *
 * This follows the same `registerDecorator` + `@ValidatorConstraint`
 * pattern used by `is-absent.decorator.ts` so it remains consistent
 * with the rest of the codebase.
 */
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

export const DOWNLOAD_LABEL_MAX_LENGTH = 120;

@ValidatorConstraint({ name: "DownloadLabels", async: false })
class DownloadLabelsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined) {
      return true;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const obj = args.object as Record<string, unknown>;
    const downloadIds = obj.downloadIds;
    if (!Array.isArray(downloadIds)) {
      return false;
    }

    const allowedIds = new Set<string>(downloadIds as string[]);

    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (typeof raw !== "string") {
        return false;
      }
      if (!allowedIds.has(key)) {
        return false;
      }
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return false;
      }
      if (trimmed.length > DOWNLOAD_LABEL_MAX_LENGTH) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const obj = args.object as Record<string, unknown>;
    if (!Array.isArray(obj.downloadIds)) {
      return "downloadLabels requires downloadIds";
    }
    return "each downloadLabel must be a trimmed non-empty string of at most 120 characters and its key must belong to downloadIds";
  }
}

export function DownloadLabels(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: DownloadLabelsConstraint,
    });
  };
}
