import React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  className
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(e.target.checked)
    }
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
        checked ? 'bg-primary-500' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </label>
  )
}