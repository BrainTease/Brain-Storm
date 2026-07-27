/**
 * Labelled text input.
 *
 * Kept under this name for the existing call sites; the implementation now lives
 * in the shared form library so `Input`, `forms/TextField` and the hand-rolled
 * inputs on the settings screens cannot drift apart.
 */
export { TextInput as Input, type TextInputProps as InputProps } from './form/TextInput';
