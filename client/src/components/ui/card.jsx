/** shadcn-style primitives tuned for DevTrack dark theme */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#d2f5fa]/10 bg-[#171c1d]/80 text-white shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-5 sm:p-6 pb-0', className)} {...props} />
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-base font-semibold leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-gray-500', className)} {...props} />
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-5 sm:p-6 pt-4', className)} {...props} />
}
