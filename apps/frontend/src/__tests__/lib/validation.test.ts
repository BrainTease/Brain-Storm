import { describe, expect, it } from 'vitest';

export const validators = {
  required: (value: string) => {
    if (!value || value.trim() === '') {
      return 'This field is required';
    }
    return true;
  },

  email: (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return true;
  },

  minLength: (length: number) => (value: string) => {
    if (value.length < length) {
      return `Must be at least ${length} characters`;
    }
    return true;
  },

  maxLength: (length: number) => (value: string) => {
    if (value.length > length) {
      return `Must not exceed ${length} characters`;
    }
    return true;
  },

  stellarAddress: (value: string) => {
    const stellarRegex = /^G[A-Z2-7]{56}$/;
    if (!stellarRegex.test(value)) {
      return 'Please enter a valid Stellar address';
    }
    return true;
  },

  url: (value: string) => {
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return true;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  phoneNumber: (value: string) => {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
    return true;
  },

  alphanumeric: (value: string) => {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(value)) {
      return 'Only alphanumeric characters are allowed';
    }
    return true;
  },

  noSpecialCharacters: (value: string) => {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/g;
    if (specialCharRegex.test(value)) {
      return 'Special characters are not allowed';
    }
    return true;
  },

  strongPassword: (value: string) => {
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (!hasUppercase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowercase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }

    return true;
  },
};

describe('required validator', () => {
  it('should return true for non-empty value', () => {
    expect(validators.required('hello')).toBe(true);
  });

  it('should return error for empty string', () => {
    expect(validators.required('')).toBe('This field is required');
  });

  it('should return error for whitespace only', () => {
    expect(validators.required('   ')).toBe('This field is required');
  });
});

describe('email validator', () => {
  it('should accept valid email addresses', () => {
    expect(validators.email('user@example.com')).toBe(true);
    expect(validators.email('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validators.email('not-an-email')).toBe('Please enter a valid email address');
    expect(validators.email('user@')).toBe('Please enter a valid email address');
    expect(validators.email('@example.com')).toBe('Please enter a valid email address');
  });
});

describe('minLength validator', () => {
  it('should accept string meeting minimum length', () => {
    const validator = validators.minLength(5);
    expect(validator('hello')).toBe(true);
    expect(validator('hello world')).toBe(true);
  });

  it('should reject string below minimum length', () => {
    const validator = validators.minLength(5);
    expect(validator('hi')).toBe('Must be at least 5 characters');
    expect(validator('test')).toBe('Must be at least 5 characters');
  });
});

describe('maxLength validator', () => {
  it('should accept string under maximum length', () => {
    const validator = validators.maxLength(10);
    expect(validator('short')).toBe(true);
    expect(validator('exact10ch')).toBe(true);
  });

  it('should reject string exceeding maximum length', () => {
    const validator = validators.maxLength(10);
    expect(validator('this is too long')).toBe('Must not exceed 10 characters');
  });
});

describe('stellarAddress validator', () => {
  it('should accept valid Stellar addresses', () => {
    const validAddress = 'GBRPYHIL2CI3WHZDTOOQFC6MB5XPBGHX7UCKMIA24PJC7TNBWD5JSDU';
    expect(validators.stellarAddress(validAddress)).toBe(true);
  });

  it('should reject invalid Stellar addresses', () => {
    expect(validators.stellarAddress('invalid-address')).toBe(
      'Please enter a valid Stellar address'
    );
    expect(
      validators.stellarAddress('GBRPYHIL2CI3WHZDTOOQFC6MB5XPBGHX7UCKMIA24PJC7TNBWD5JSDA')
    ).toBe('Please enter a valid Stellar address');
  });
});

describe('url validator', () => {
  it('should accept valid URLs', () => {
    expect(validators.url('https://example.com')).toBe(true);
    expect(validators.url('http://localhost:3000')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validators.url('not a url')).toBe('Please enter a valid URL');
    expect(validators.url('htp://example')).toBe('Please enter a valid URL');
  });
});

describe('phoneNumber validator', () => {
  it('should accept valid phone numbers', () => {
    expect(validators.phoneNumber('123-456-7890')).toBe(true);
    expect(validators.phoneNumber('+1 (555) 123-4567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validators.phoneNumber('123')).toBe('Please enter a valid phone number');
    expect(validators.phoneNumber('abc')).toBe('Please enter a valid phone number');
  });
});

describe('alphanumeric validator', () => {
  it('should accept alphanumeric strings', () => {
    expect(validators.alphanumeric('abc123')).toBe(true);
    expect(validators.alphanumeric('ABC')).toBe(true);
    expect(validators.alphanumeric('123')).toBe(true);
  });

  it('should reject strings with special characters', () => {
    expect(validators.alphanumeric('abc-123')).toBe('Only alphanumeric characters are allowed');
    expect(validators.alphanumeric('test@123')).toBe('Only alphanumeric characters are allowed');
  });
});

describe('noSpecialCharacters validator', () => {
  it('should accept strings without special characters', () => {
    expect(validators.noSpecialCharacters('hello world')).toBe(true);
    expect(validators.noSpecialCharacters('abc123')).toBe(true);
  });

  it('should reject strings with special characters', () => {
    expect(validators.noSpecialCharacters('hello@world')).toBe(
      'Special characters are not allowed'
    );
    expect(validators.noSpecialCharacters('test!123')).toBe('Special characters are not allowed');
  });
});

describe('strongPassword validator', () => {
  it('should accept strong passwords', () => {
    expect(validators.strongPassword('SecurePass123!')).toBe(true);
    expect(validators.strongPassword('MyPassword@2024')).toBe(true);
  });

  it('should reject password without uppercase', () => {
    expect(validators.strongPassword('password123!')).toBe(
      'Password must contain at least one uppercase letter'
    );
  });

  it('should reject password without lowercase', () => {
    expect(validators.strongPassword('PASSWORD123!')).toBe(
      'Password must contain at least one lowercase letter'
    );
  });

  it('should reject password without numbers', () => {
    expect(validators.strongPassword('Password!')).toBe(
      'Password must contain at least one number'
    );
  });

  it('should reject password without special characters', () => {
    expect(validators.strongPassword('Password123')).toBe(
      'Password must contain at least one special character'
    );
  });
});

describe('validator composition', () => {
  it('should chain validators together', () => {
    const email = 'user@example.com';
    const required = validators.required(email) === true;
    const valid = validators.email(email) === true;

    expect(required && valid).toBe(true);
  });

  it('should handle multiple validation failures', () => {
    const value = '';

    const requiredResult = validators.required(value);
    const emailResult = requiredResult === true ? validators.email(value) : requiredResult;

    expect(requiredResult).toBe('This field is required');
    expect(emailResult).toBe('This field is required');
  });
});
