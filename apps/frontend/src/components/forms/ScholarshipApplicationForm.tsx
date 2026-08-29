'use client';

import { z } from 'zod';
import {
  TextField,
  TextareaField,
  StepWizard,
  useZodForm,
  type WizardStep,
} from '@/components/forms';

export interface ScholarshipApplicationValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  institution: string;
  fieldOfStudy: string;
  gpa: number;
  yearOfStudy: string;
  financialNeed: string;
  essayResponse: string;
  agreement: boolean;
}

interface ScholarshipApplicationFormProps {
  onSubmit: (values: ScholarshipApplicationValues) => void | Promise<void>;
  onCancel?: () => void;
}

const schema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters'),
  institution: z
    .string()
    .min(1, 'Institution is required')
    .max(100, 'Institution name must be less than 100 characters'),
  fieldOfStudy: z
    .string()
    .min(1, 'Field of study is required')
    .max(100, 'Field of study must be less than 100 characters'),
  gpa: z.number().min(0, 'GPA must be at least 0').max(4.0, 'GPA must not exceed 4.0'),
  yearOfStudy: z.string().min(1, 'Year of study is required'),
  financialNeed: z
    .string()
    .min(10, 'Please provide details about your financial need')
    .max(1000, 'Financial need description must be less than 1000 characters'),
  essayResponse: z
    .string()
    .min(100, 'Essay must be at least 100 characters')
    .max(2000, 'Essay must be less than 2000 characters'),
  agreement: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
});

export function ScholarshipApplicationForm({
  onSubmit,
  onCancel,
}: ScholarshipApplicationFormProps) {
  const form = useZodForm<ScholarshipApplicationValues>({
    schema,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      institution: '',
      fieldOfStudy: '',
      gpa: 3.0,
      yearOfStudy: '',
      financialNeed: '',
      essayResponse: '',
      agreement: false,
    },
  });

  const steps: WizardStep<ScholarshipApplicationValues>[] = [
    {
      id: 1,
      title: 'Personal Information',
      description: 'Tell us about yourself',
      fields: ['firstName', 'lastName', 'email', 'phone'],
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField<ScholarshipApplicationValues>
              name="firstName"
              label="First Name"
              placeholder="John"
            />
            <TextField<ScholarshipApplicationValues>
              name="lastName"
              label="Last Name"
              placeholder="Doe"
            />
          </div>
          <TextField<ScholarshipApplicationValues>
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
          />
          <TextField<ScholarshipApplicationValues>
            name="phone"
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      ),
    },
    {
      id: 2,
      title: 'Academic Details',
      description: 'Your educational background',
      fields: ['institution', 'fieldOfStudy', 'gpa', 'yearOfStudy'],
      content: (
        <div className="space-y-4">
          <TextField<ScholarshipApplicationValues>
            name="institution"
            label="Educational Institution"
            placeholder="University of Example"
          />
          <TextField<ScholarshipApplicationValues>
            name="fieldOfStudy"
            label="Field of Study"
            placeholder="Computer Science"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField<ScholarshipApplicationValues>
              name="gpa"
              label="GPA"
              type="number"
              step="0.01"
              min="0"
              max="4.0"
              placeholder="3.5"
            />
            <TextField<ScholarshipApplicationValues>
              name="yearOfStudy"
              label="Year of Study"
              placeholder="Junior"
            />
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Essay & Agreement',
      description: 'Final thoughts and confirmation',
      fields: ['financialNeed', 'essayResponse', 'agreement'],
      content: (
        <div className="space-y-4">
          <TextareaField<ScholarshipApplicationValues>
            name="financialNeed"
            label="Financial Need Statement"
            placeholder="Explain your financial situation and why you need this scholarship..."
            rows={4}
          />
          <TextareaField<ScholarshipApplicationValues>
            name="essayResponse"
            label="Essay: Why do you deserve this scholarship?"
            placeholder="Share your story, accomplishments, and goals..."
            rows={6}
          />
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              {...form.register('agreement')}
              className="mt-1"
              id="agreement"
            />
            <label htmlFor="agreement" className="text-sm text-gray-700 dark:text-gray-300">
              I certify that the information provided is accurate and complete, and I agree to the
              scholarship terms and conditions.
            </label>
          </div>
          {form.formState.errors.agreement && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.agreement.message}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <StepWizard
      form={form}
      steps={steps}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel="Submit Application"
    />
  );
}
