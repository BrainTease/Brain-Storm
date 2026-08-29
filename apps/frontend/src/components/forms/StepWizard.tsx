'use client';

import { useState, type ReactNode } from 'react';
import type { FieldValues, FieldPath, UseFormReturn } from 'react-hook-form';
import { Form } from './Form';
import { SubmitButton } from './SubmitButton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface WizardStep<T extends FieldValues> {
  id: number;
  title: string;
  description?: string;
  /** Fields validated before advancing past this step. */
  fields: FieldPath<T>[];
  content: ReactNode;
}

interface StepWizardProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  steps: WizardStep<T>[];
  onSubmit: (values: T) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * Generic multi-step form wizard: renders a progress indicator, the active
 * step's fields, and Previous/Next/Submit navigation. Advancing a step
 * validates only that step's `fields` via react-hook-form's `trigger`, so
 * later steps' (still-empty) fields never block earlier navigation.
 */
export function StepWizard<T extends FieldValues>({
  form,
  steps,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
}: StepWizardProps<T>) {
  const [currentStep, setCurrentStep] = useState(steps[0]?.id ?? 1);
  const stepCount = steps.length;
  const activeIndex = steps.findIndex((s) => s.id === currentStep);
  const activeStep = steps[activeIndex] ?? steps[0];

  const handleNext = async () => {
    const isValid = await form.trigger(activeStep.fields);
    if (isValid && activeIndex < stepCount - 1) {
      setCurrentStep(steps[activeIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setCurrentStep(steps[activeIndex - 1].id);
    }
  };

  const isFirstStep = activeIndex === 0;
  const isLastStep = activeIndex === stepCount - 1;

  return (
    <div className="space-y-8">
      {/* Progress Indicator */}
      <div className="flex gap-2">
        {steps.map((step) => (
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeStep.title}</h2>
          {activeStep.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">{activeStep.description}</p>
          )}
        </div>

        <Form form={form} onSubmit={onSubmit}>
          {activeStep.content}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
            {onCancel && (
              <Button type="button" onClick={onCancel} variant="outline" className="flex-1">
                Cancel
              </Button>
            )}
            {!isFirstStep && (
              <Button type="button" onClick={handlePrevious} variant="outline" className="flex-1">
                Previous
              </Button>
            )}
            {!isLastStep && (
              <Button type="button" onClick={handleNext} className="flex-1">
                Next Step
              </Button>
            )}
            {isLastStep && <SubmitButton className="flex-1">{submitLabel}</SubmitButton>}
          </div>
        </Form>
      </Card>
    </div>
  );
}
