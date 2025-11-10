/**
 * Circle Switcher Component
 * Quick navigation between multiple circles (grade levels)
 * Perfect for parents with multiple children in different grades
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Users, Plus, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Circle {
  id: string
  name: string
  description: string
  member_count?: number
  unread_count?: number
  role: 'admin' | 'member'
  status: 'approved' | 'pending'
}

interface CircleSwitcherProps {
  currentCircleId?: string
  onCircleChange?: (circleId: string) => void
}

export function CircleSwitcher({ currentCircleId, onCircleChange }: CircleSwitcherProps) {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCircles()
  }, [])

  const fetchCircles = async () => {
    try {
      const response = await fetch('/api/circles/my-circles')

      if (!response.ok) {
        throw new Error('Failed to fetch circles')
      }

      const data = await response.json()
      setCircles(data.circles || [])
    } catch (error) {
      console.error('Error fetching circles:', error)
      toast.error('Failed to load your circles')
    } finally {
      setLoading(false)
    }
  }

  const handleCircleSelect = (circleId: string) => {
    if (onCircleChange) {
      onCircleChange(circleId)
    } else {
      router.push(`/circles/${circleId}`)
    }
  }

  const currentCircle = circles.find((c) => c.id === currentCircleId)
  const approvedCircles = circles.filter((c) => c.status === 'approved')
  const pendingCircles = circles.filter((c) => c.status === 'pending')

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Users className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    )
  }

  if (circles.length === 0) {
    return (
      <Button variant="outline" onClick={() => router.push('/circles')}>
        <Plus className="h-4 w-4 mr-2" />
        Join a Circle
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-[200px] justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {currentCircle ? (
              <span className="truncate">{currentCircle.name}</span>
            ) : (
              <span>My Circles ({approvedCircles.length})</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel>Your Circles</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Approved Circles */}
        {approvedCircles.length > 0 ? (
          approvedCircles.map((circle) => (
            <DropdownMenuItem
              key={circle.id}
              onClick={() => handleCircleSelect(circle.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{circle.name}</span>
                    {circle.id === currentCircleId && (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </div>
                  {circle.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {circle.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  {circle.role === 'admin' && (
                    <Badge variant="secondary" className="text-xs">
                      Admin
                    </Badge>
                  )}
                  {circle.unread_count && circle.unread_count > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {circle.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-gray-500 text-center">
            No circles yet
          </div>
        )}

        {/* Pending Circles */}
        {pendingCircles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-gray-500">
              Pending Approval
            </DropdownMenuLabel>
            {pendingCircles.map((circle) => (
              <DropdownMenuItem
                key={circle.id}
                disabled
                className="opacity-60"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{circle.name}</span>
                  <Badge variant="outline" className="text-xs">
                    Pending
                  </Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Actions */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/circles')}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Join Another Circle
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
