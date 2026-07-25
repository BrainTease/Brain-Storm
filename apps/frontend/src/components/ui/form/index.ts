/**
 * Reusable form-input library.
 *
 * These primitives own all field markup, styling and aria wiring. Everything
 * else in the app is a thin adapter on top of them — `ui/Input`, `ui/Select` and
 * `ui/Textarea` are aliases, and `components/forms/*` binds them to
 * react-hook-form — so there is exactly one implementation of "what a form
 * field looks like".
 */

export { Field, FieldFeedback, useFieldA11y, type FieldMeta } from './Field';
export {
  CHECKBOX_CLASS,
  ERROR_TEXT_CLASS,
  HELPER_TEXT_CLASS,
  LABEL_CLASS,
  RADIO_CLASS,
  controlClass,
  slugifyLabel,
  type ControlSize,
  type ControlStyleOptions,
} from './fieldStyles';
export { TextInput, type TextInputProps } from './TextInput';
export { TextArea, type TextAreaProps } from './TextArea';
export { SelectInput, type SelectInputProps, type SelectOption } from './SelectInput';
export { Checkbox, type CheckboxProps } from './Checkbox';
export { RadioGroup, type RadioGroupProps, type RadioOption } from './RadioGroup';
export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentedOption,
} from './SegmentedControl';
