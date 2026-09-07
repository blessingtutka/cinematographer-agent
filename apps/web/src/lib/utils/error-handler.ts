import { isAxiosError } from "axios"

export function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) {
      return "Wrong credentials"
    }
    return (
      error.response?.data?.detail ?? error.response?.data?.message ?? error.message ?? fallback
    )
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
