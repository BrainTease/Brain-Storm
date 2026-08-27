import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Checkbox,
  RadioGroup,
  SegmentedControl,
  SelectInput,
  TextArea,
  TextInput,
} from '@/components/ui/form';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('TextInput', () => {
  it('derives its id from the label so the two are associated', () => {
    render(<TextInput label="Email address" />);
    expect(screen.getByLabelText('Email address')).toHaveAttribute('id', 'email-address');
  });

  it('marks the control invalid and announces the error', () => {
    render(<TextInput label="Email" error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('points aria-describedby at the error message', () => {
    render(<TextInput id="email" label="Email" error="Required" helperText="Ignored" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.queryByText('Ignored')).not.toBeInTheDocument();
  });

  it('points aria-describedby at the helper text when valid', () => {
    render(<TextInput id="email" label="Email" helperText="We never share it" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-describedby', 'email-helper');
  });

  it('accepts typed input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextInput label="Name" onChange={onChange} />);
    await user.type(screen.getByLabelText('Name'), 'Alice');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('TextArea', () => {
  it('renders a multi-line control with the requested rows', () => {
    render(<TextArea label="Bio" rows={6} />);
    expect(screen.getByLabelText('Bio')).toHaveAttribute('rows', '6');
  });
});

describe('SelectInput', () => {
  it('renders every option', () => {
    render(<SelectInput label="Level" options={options} />);
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
  });

  it('prepends the placeholder option', () => {
    render(
      <SelectInput
        label="Level"
        options={options}
        placeholderOption={{ value: '', label: 'All levels' }}
      />
    );
    const rendered = screen.getAllByRole('option').map((o) => o.textContent);
    expect(rendered).toEqual(['All levels', 'Option A', 'Option B']);
  });
});

describe('Checkbox', () => {
  it('reflects the checked state and reports changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Email me" checked={false} onChange={onChange} />);
    const box = screen.getByLabelText('Email me');
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(onChange).toHaveBeenCalled();
  });

  it('keeps the label associated in the row variant', () => {
    render(<Checkbox id="pref" variant="row" label="Progress updates" checked readOnly />);
    expect(screen.getByLabelText('Progress updates')).toBeChecked();
  });
});

describe('RadioGroup', () => {
  it('checks the option matching the current value', () => {
    render(<RadioGroup name="pick" label="Pick one" options={options} value="b" />);
    expect(screen.getByLabelText('Option B')).toBeChecked();
    expect(screen.getByLabelText('Option A')).not.toBeChecked();
  });

  it('reports the selected value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup name="pick" label="Pick one" options={options} onValueChange={onValueChange} />
    );
    await user.click(screen.getByLabelText('Option A'));
    expect(onValueChange).toHaveBeenCalledWith('a');
  });

  it('keeps a hidden label as the accessible group name', () => {
    render(<RadioGroup name="pick" label="Pick one" labelHidden options={options} />);
    expect(screen.getByText('Pick one')).toHaveClass('sr-only');
  });
});

describe('SegmentedControl', () => {
  it('marks the active segment with aria-pressed', () => {
    render(
      <SegmentedControl
        ariaLabel="Filter courses"
        options={options}
        value="a"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Option A' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Option B' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('reports the clicked segment', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        ariaLabel="Filter courses"
        options={options}
        value="a"
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Option B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
