'use client';

import { z } from 'zod';
import {
  TextField,
  TextareaField,
  StepWizard,
  useZodForm,
  type WizardStep,
} from '@/components/forms';

export interface GrantApplicationValues {
  applicantName: string;
  email: string;
  organization: string;
  projectTitle: string;
  projectDescription: string;
  totalAmount: number;
  milestonesPlan: string;
  agreement: boolean;
}

interface GrantApplicationFormProps {
  onSubmit: (values: GrantApplicationValues) => void | Promise<void>;
  onCancel?: () => void;
}

const schema = z.object({
  applicantName: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  organization: z
    .string()
    .min(1, 'Organization is required')
    .max(100, 'Organization must be less than 100 characters'),
  projectTitle: z
    .string()
    .min(1, 'Project title is required')
    .max(100, 'Project title must be less than 100 characters'),
  projectDescription: z
    .string()
    .min(50, 'Please describe the project in at least 50 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  totalAmount: z.number().positive('Requested amount must be greater than 0'),
  milestonesPlan: z
    .string()
    .min(20, 'Please outline your milestones in at least 20 characters')
    .max(2000, 'Milestones plan must be less than 2000 characters'),
  agreement: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
});

export function GrantApplicationForm({ onSubmit, onCancel }: GrantApplicationFormProps) {
  const form = useZodForm<GrantApplicationValues>({
    schema,
    defaultValues: {
      applicantName: '',
      email: '',
      organization: '',
      projectTitle: '',
      projectDescription: '',
      totalAmount: 0,
      milestonesPlan: '',
      agreement: false,
    },
  });

  const steps: WizardStep<GrantApplicationValues>[] = [
    {
      id: 1,
      title: 'Applicant Information',
      description: 'Tell us who is applying',
      fields: ['applicantName', 'email', 'organization'],
      content: (
        <div className="space-y-4">
          <TextField<GrantApplicationValues>
            name="applicantName"
            label="Full Name"
            placeholder="John Doe"
          />
          <TextField<GrantApplicationValues>
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@example.com"
          />
          <TextField<GrantApplicationValues>
            name="organization"
            label="Organization"
            placeholder="Independent / Example Org"
          />
        </div>
      ),
    },
    {
      id: 2,
      title: 'Project Details',
      description: 'What are you building and how much funding do you need?',
      fields: ['projectTitle', 'projectDescription', 'totalAmount'],
      content: (
        <div className="space-y-4">
          <TextField<GrantApplicationValues>
            name="projectTitle"
            label="Project Title"
            placeholder="On-chain credential explorer"
          />
          <TextareaField<GrantApplicationValues>
            name="projectDescription"
            label="Project Description"
            placeholder="Describe the project, its goals, and its impact..."
            rows={5}
          />
          <TextField<GrantApplicationValues>
            name="totalAmount"
            label="Requested Amount (BST)"
            type="number"
            step="1"
            min="0"
            placeholder="5000"
          />
        </div>
      ),
    },
    {
      id: 3,
      title: 'Milestones & Agreement',
      description: 'How funding will be released and final confirmation',
      fields: ['milestonesPlan', 'agreement'],
      content: (
        <div className="space-y-4">
          <TextareaField<GrantApplicationValues>
            name="milestonesPlan"
            label="Milestones Plan"
            placeholder="List the milestones funds will be released against, with amounts and estimated dates..."
            rows={6}
          />
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <input
              type="checkbox"
              {...form.register('agreement')}
              className="mt-1"
              id="grant-agreement"
            />
            <label htmlFor="grant-agreement" className="text-sm text-gray-700 dark:text-gray-300">
              I certify that the information provided is accurate and complete, and I agree to the
              grant program terms and milestone-based disbursement.
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
      submitLabel="Submit Grant Application"
    />
  );
}
