import type { InputHTMLAttributes } from 'react'
import { Input } from './Field'
import { applyPhoneEdit, UAE_MOBILE_PLACEHOLDER } from '../../lib/phone'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  /** Receives the formatted number, e.g. `+971 50 123 4567`. */
  onChange: (value: string) => void
}

/** Text input that keeps a UAE number formatted as it is typed or pasted. */
export function PhoneInput({ value, onChange, placeholder = UAE_MOBILE_PLACEHOLDER, ...rest }: PhoneInputProps) {
  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(applyPhoneEdit(e.target.value, value))}
      {...rest}
    />
  )
}
