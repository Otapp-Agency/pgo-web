'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useTRPC } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Image from "next/image"

type FormState = {
  errors?: {
    username?: string[]
    password?: string[]
  }
  message?: string
} | undefined

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const trpc = useTRPC()
  const [state, setState] = useState<FormState>(undefined)

  const loginMutation = useMutation(trpc.auth.login.mutationOptions({
    onSuccess: (data) => {
      if (data.success) {
        // Redirect based on password change requirement
        router.push(data.redirectTo || '/dashboard')
      }
    },
    onError: (error: unknown) => {
      // Handle validation errors
      const trpcError = error as { data?: { code?: string }; cause?: unknown; message?: string }
      if (trpcError.data?.code === 'BAD_REQUEST' && trpcError.cause && typeof trpcError.cause === 'object' && 'errors' in trpcError.cause) {
        setState({
          errors: (trpcError.cause as { errors?: { username?: string[]; password?: string[] } }).errors,
          message: trpcError.message,
        })
      } else {
        setState({
          message: trpcError.message || 'An error occurred',
        })
      }
    },
  }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setState(undefined)

    const formData = new FormData(e.currentTarget)
    const username = formData.get('username') as string
    const password = formData.get('password') as string

    // Validate form data
    if (!username || !password) {
      setState({
        errors: {
          username: !username ? ['Username is required.'] : undefined,
          password: !password ? ['Password field must not be empty.'] : undefined,
        },
      })
      return
    }

    loginMutation.mutate({ username, password })
  }

  const pending = loginMutation.isPending

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your PGO Engine account
                </p>
              </div>

              {state?.message && (
                <div className="text-sm font-medium text-destructive text-center">
                  {state.message}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  required
                />
                {state?.errors?.username && (
                  <p className="text-sm font-medium text-destructive">
                    {state.errors.username}
                  </p>
                )}
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
                {state?.errors?.password && (
                  <p className="text-sm font-medium text-destructive">
                    {state.errors.password}
                  </p>
                )}
              </Field>

              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Logging in..." : "Login"}
                </Button>
              </Field>


            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/images/logoipsum.png"
              fill
              placeholder="blur"
              blurDataURL="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
