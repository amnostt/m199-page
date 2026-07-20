import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "isAbsent", async: false })
class IsAbsentConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    return !Object.prototype.hasOwnProperty.call(args.object, args.property);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must not be provided; use lifecycle commands`;
  }
}

export function IsAbsent(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyKey.toString(),
      options: validationOptions,
      validator: IsAbsentConstraint,
    });
  };
}
