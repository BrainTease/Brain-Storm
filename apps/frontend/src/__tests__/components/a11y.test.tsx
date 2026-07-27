import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Skeleton } from '@/components/ui/Skeleton';

expect.extend(toHaveNoViolations);

describe('Component accessibility (axe)', () => {
  it('Button has no a11y violations', async () => {
    const { container } = render(<Button>Submit</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input has no a11y violations with label', async () => {
    const { container } = render(<Input label="Email" type="email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input has no a11y violations with error state', async () => {
    const { container } = render(
      <Input label="Email" type="email" error="Invalid email" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Spinner has no a11y violations', async () => {
    const { container } = render(<Spinner label="Loading content" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Skeleton has no a11y violations', async () => {
    const { container } = render(<Skeleton width={200} height={20} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
