'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  label?: string;
  submittingLabel?: string;
}

export function SubmitButton({
  label,
  submittingLabel,
  variant = 'primary',
  ...rest
}: SubmitButtonProps) {
  const t = useTranslations('forms');
  const {
    formState: { isSubmitting },
  } = useFormContext();

  return (
    <Button type="submit" variant={variant} disabled={isSubmitting} {...rest}>
      {isSubmitting ? (submittingLabel ?? t('submitting')) : (label ?? t('submit'))}
    </Button>
  );
}
