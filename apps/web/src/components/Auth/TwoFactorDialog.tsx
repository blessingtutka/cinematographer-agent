import { type SubmitEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type TwoFactorDialogProps = {
  open: boolean
  code: string
  onCodeChange: (code: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: (event: SubmitEvent) => void
}

export function TwoFactorDialog({
  open,
  code,
  onCodeChange,
  onOpenChange,
  onSubmit,
}: TwoFactorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify with your authenticator</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to finish signing in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            autoFocus
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ""))}
            className="h-12 w-full border border-input bg-background px-3 text-center text-xl tracking-[0.45em] text-foreground outline-none focus:border-primary"
            placeholder="000000"
          />
          <Button
            type="submit"
            className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/80"
          >
            Verify code
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
