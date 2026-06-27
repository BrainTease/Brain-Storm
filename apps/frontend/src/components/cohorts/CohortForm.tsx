'use client';

import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Form, TextField, TextareaField, SubmitButton, useZodForm } from '@/components/forms';
import { Button } from '@/components/ui/Button';

export interface CohortFormValues {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
}

interface CohortFormProps {
  onSubmit: (values: CohortFormValues) => void | Promise<void>;
  onCancel?: () => void;
  defaultValues?: Partial<CohortFormValues>;
}

export function CohortForm({ onSubmit, onCancel, defaultValues }: CohortFormProps) {
  const t = useTranslations('cohorts.form');
  const tForms = useTranslations('forms');

  const schema = z
    .object({
      name: z
        .string()
        .min(3, tForms('minLength', { min: 3 }))
        .max(80, tForms('maxLength', { max: 80 })),
      description: z
        .string()
        .max(500, tForms('maxLength', { max: 500 }))
        .default(''),
      startDate: z.string().min(1, tForms('required')),
      endDate: z.string().min(1, tForms('required')),
      capacity: z.coerce
        .number()
        .int()
        .min(1, tForms('minValue', { min: 1 }))
        .max(500, tForms('maxValue', { max: 500 })),
    })
    .refine((v) => !v.endDate || v.endDate >= v.startDate, {
      path: ['endDate'],
      message: tForms('minValue', { min: 'start date' }),
    });

  const form = useZodForm<CohortFormValues>({
    schema,
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      capacity: 25,
      ...defaultValues,
    },
  });

  return (
    <Form form={form} onSubmit={onSubmit}>
      <TextField<CohortFormValues>
        name="name"
        label={t('name')}
        placeholder={t('namePlaceholder')}
        autoComplete="off"
      />
      <TextareaField<CohortFormValues>
        name="description"
        label={t('description')}
        placeholder={t('descriptionPlaceholder')}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField<CohortFormValues> name="startDate" label={t('startDate')} type="date" />
        <TextField<CohortFormValues> name="endDate" label={t('endDate')} type="date" />
      </div>
      <TextField<CohortFormValues>
        name="capacity"
        label={t('capacity')}
        helperText={t('capacityHint')}
        type="number"
        min={1}
      />
      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
        <SubmitButton label={t('submit')} submittingLabel={t('submitting')} />
      </div>
    </Form>
  );
}
