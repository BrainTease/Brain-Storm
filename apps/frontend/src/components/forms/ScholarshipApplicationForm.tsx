'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Form, TextField, TextareaField, SubmitButton, useZodForm } from '@/components/forms';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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

const STEP_COUNT = 3;

const STEPS = [
  { id: 1, title: 'Personal Information', description: 'Tell us about yourself' },
  { id: 2, title: 'Academic Details', description: 'Your educational background' },
  { id: 3, title: 'Essay & Agreement', description: 'Final thoughts and confirmation' },
];

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
  gpa: z
    .number()
    .min(0, 'GPA must be at least 0')
    .max(4.0, 'GPA must not exceed 4.0'),
  yearOfStudy: z
    .string()
    .min(1, 'Year of study is required'),
  financialNeed: z
    .string()
    .min(10, 'Please provide details about your financial need')
    .max(1000, 'Financial need description must be less than 1000 characters'),
  essayResponse: z
    .string()
    .min(100, 'Essay must be at least 100 characters')
    .max(2000, 'Essay must be less than 2000 characters'),
  agreement: z
    .boolean()
    .refine((v) => v === true, 'You must agree to the terms'),
});

export function ScholarshipApplicationForm({ onSubmit, onCancel }: ScholarshipApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

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

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEP_COUNT));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 1:
        return ['firstName', 'lastName', 'email', 'phone'];
      case 2:
        return ['institution', 'fieldOfStudy', 'gpa', 'yearOfStudy'];
      case 3:
        return ['financialNeed', 'essayResponse', 'agreement'];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex gap-2">
        {STEPS.map((step) => (
          <div key={step.id} className="flex-1">
            <div
              className={`h-2 rounded-full transition-colors ${
                step.id <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
              {step.title}
            </p>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {STEPS[currentStep - 1].title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {STEPS[currentStep - 1].description}
          </p>
        </div>

        <Form form={form} onSubmit={onSubmit}>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
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
          )}

          {/* Step 2: Academic Details */}
          {currentStep === 2 && (
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
          )}

          {/* Step 3: Essay & Agreement */}
          {currentStep === 3 && (
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
                  I certify that the information provided is accurate and complete, and I agree to the scholarship terms and conditions.
                </label>
              </div>
              {form.formState.errors.agreement && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {form.formState.errors.agreement.message}
                </p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={handlePrevious}
                variant="outline"
                className="flex-1"
              >
                Previous
              </Button>
            )}
            {currentStep < STEP_COUNT && (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-1"
              >
                Next Step
              </Button>
            )}
            {currentStep === STEP_COUNT && (
              <SubmitButton className="flex-1">Submit Application</SubmitButton>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
}
