import { AnimatePresence, motion } from "framer-motion"
import { LoaderCircle, Send } from "lucide-react"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"

type SceneInputPanelProps = {
  onSubmit: (rawText: string) => Promise<void>
  loading?: boolean
  apiError?: string | null
}

export function SceneInputPanel({
  onSubmit,
  loading = false,
  apiError = null,
}: SceneInputPanelProps) {
  const [rawText, setRawText] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const length = rawText.length
    if (length < 10) {
      setValidationError("Scene text must contain at least 10 characters.")
      return
    }
    if (length > 10000) {
      setValidationError("Scene text must not exceed 10,000 characters.")
      return
    }
    setValidationError(null)
    await onSubmit(rawText)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            01 / Input
          </p>
          <h2 className="mt-1 text-xl font-semibold">Scene Input</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {rawText.length.toLocaleString()} / 10,000
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={rawText}
          onChange={(event) => {
            setRawText(event.target.value)
            if (validationError) {
              setValidationError(null)
            }
          }}
          maxLength={10000}
          disabled={loading}
          placeholder="Paste a screenplay scene..."
          className="min-h-44 w-full resize-y border border-input bg-background/70 p-3 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          aria-label="Screenplay scene"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <AnimatePresence mode="wait">
            {(validationError || apiError) && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-destructive"
              >
                {validationError ?? apiError}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" disabled={loading} className="ml-auto">
            {loading ? <LoaderCircle className="animate-spin" /> : <Send />}
            {loading ? "Analyzing" : "Analyze scene"}
          </Button>
        </div>
      </form>
    </motion.section>
  )
}
