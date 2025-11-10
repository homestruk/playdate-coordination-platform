/**
 * Reusable loading spinner component
 */

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-16 w-16',
  lg: 'h-32 w-32'
}

export function LoadingSpinner({ message = 'Loading...', size = 'lg' }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-gray-900 mx-auto ${sizeClasses[size]}`} />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  )
}
