import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type PasswordResetDialogProps = {
  open: boolean
  email: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PasswordResetDialog({
  open,
  email,
  onOpenChange,
  onConfirm,
}: PasswordResetDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Send a password reset link?</AlertDialogTitle>
          <AlertDialogDescription>
            We will send recovery instructions to {email || "your email address"}. This is currently
            a placeholder request.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Send reset link</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
