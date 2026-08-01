'use client';

import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { BaseButtonProps } from '@/types/componentProps';

interface SubmitButtonProps extends Omit<BaseButtonProps, 'children'> {
  label?: string;
  submittingLabel?: string;
}

export function SubmitButton({
  label,
  submittingLabel,
  variant = 'primary',
  isLoading,
  isDisabled,
  ...rest
}: SubmitButtonProps) {
  const t = useTranslations('forms');
  const {
    formState: { isSubmitting },
  } = useFormContext();

  const submitting = isLoading || isSubmitting;

  return (
    <Button type="submit" variant={variant} isDisabled={submitting || isDisabled} {...rest}>
      {submitting ? (submittingLabel ?? t('submitting')) : (label ?? t('submit'))}
    </Button>
  );
}
