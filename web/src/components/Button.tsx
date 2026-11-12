import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import './Button.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the single saffron action on a view; `ghost` is for everything else. */
  variant?: 'primary' | 'ghost'
  size?: 'md' | 'sm'
}

export function Button({ variant = 'primary', size = 'md', type = 'button', className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('pt-btn', `pt-btn--${variant}`, size === 'sm' && 'pt-btn--sm', className)}
      {...rest}
    />
  )
}
