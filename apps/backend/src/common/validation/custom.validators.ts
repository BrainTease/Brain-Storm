import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

/**
 * Custom validators for domain-specific validation rules
 */

@ValidatorConstraint({ name: 'isStellarPublicKey', async: false })
export class IsStellarPublicKeyConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^G[A-Z2-7]{55}$/.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid Stellar public key`;
  }
}

export function IsStellarPublicKey(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStellarPublicKeyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/.test(value);
  }

  defaultMessage(): string {
    return 'Password must be 8-128 characters with uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidCouponCode', async: false })
export class IsValidCouponCodeConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^[A-Z0-9-]{3,50}$/.test(value);
  }

  defaultMessage(): string {
    return 'Coupon code must be 3-50 uppercase alphanumeric characters with hyphens';
  }
}

export function IsValidCouponCode(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCouponCodeConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidUrl', async: false })
export class IsValidUrlConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'Must be a valid URL';
  }
}

export function IsValidUrl(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUrlConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidPhoneNumber', async: false })
export class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return /^\+?[1-9]\d{1,14}$/.test(value);
  }

  defaultMessage(): string {
    return 'Must be a valid phone number (E.164 format)';
  }
}

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPhoneNumberConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidPercentage', async: false })
export class IsValidPercentageConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return typeof value === 'number' && value >= 0 && value <= 100;
  }

  defaultMessage(): string {
    return 'Must be a valid percentage between 0 and 100';
  }
}

export function IsValidPercentage(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPercentageConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const object = args.object as any;
    if (!value || !object.endDate) return true;
    return new Date(value) < new Date(object.endDate);
  }

  defaultMessage(): string {
    return 'Start date must be before end date';
  }
}

export function IsValidDateRange(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDateRangeConstraint,
    });
  };
}
