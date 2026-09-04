import {
  BadgeCheck,
  ChevronRight,
  KeyRound,
  Loader2,
  type LucideIcon,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  User,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useUser } from "@/providers/user.provider"
import { authService } from "@/services/auth.service"
import {
  type ProjectQuota,
  subscriptionService,
  type SubscriptionTier,
  TIER_FEATURES,
  TIER_ORDER,
  type TierLimits,
} from "@/services/subscription.service"

//  Tier styling

const TIER_ACCENT: Record<SubscriptionTier, string> = {
  free: "text-muted-foreground border-border",
  basic: "text-blue-400 border-blue-500/40",
  pro: "text-primary border-primary/40",
  enterprise: "text-yellow-400 border-yellow-500/40",
}

const TIER_BADGE_BG: Record<SubscriptionTier, string> = {
  free: "bg-muted/60 text-muted-foreground",
  basic: "bg-blue-500/10 text-blue-400",
  pro: "bg-primary/10 text-primary",
  enterprise: "bg-yellow-500/10 text-yellow-400",
}

// Section wrapper
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-6 border border-border/70 bg-card/80 p-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="size-4" />
          <h2 className="text-sm font-semibold uppercase tracking-widest">{title}</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

// Quota bar
function QuotaBar({ quota }: { quota: ProjectQuota }) {
  const { current_count, limit } = quota
  const pct = limit === null ? 0 : Math.min(100, Math.round((current_count / limit) * 100))
  const nearLimit = limit !== null && pct >= 80

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Projects used</span>
        <span className={nearLimit ? "text-yellow-400 font-medium" : "text-foreground"}>
          {current_count} / {limit ?? "∞"}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${nearLimit ? "bg-yellow-400" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {limit === null && (
        <p className="text-xs text-muted-foreground">Unlimited projects on your plan.</p>
      )}
    </div>
  )
}

// Backup codes display
function BackupCodesDisplay({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backup recovery codes</DialogTitle>
          <DialogDescription>
            Save these codes somewhere safe. Each code can only be used once.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {codes.map((code) => (
            <code
              key={code}
              className="rounded border border-border bg-muted px-3 py-2 text-center font-mono text-sm tracking-widest"
            >
              {code}
            </code>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 2FA Setup dialog
function TwoFactorSetupDialog({
  onSuccess,
  onClose,
}: {
  onSuccess: (codes: string[]) => void
  onClose: () => void
}) {
  const [step, setStep] = useState<"loading" | "scan" | "verify">("loading")
  const [setupData, setSetupData] = useState<{
    secret: string
    provisioning_uri: string
    qr_code_base64: string
  } | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    authService
      .setupTwoFactor()
      .then((data) => {
        setSetupData(data)
        setStep("scan")
      })
      .catch(() => onClose())
  }, [onClose])

  async function handleEnable() {
    if (!code.trim()) {
      return
    }
    setBusy(true)
    try {
      const backupCodes = await authService.enableTwoFactor(code.trim())
      onSuccess(backupCodes)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable two-factor authentication</DialogTitle>
          <DialogDescription>
            Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {step === "scan" && setupData && (
          <div className="space-y-4">
            <div className="flex justify-center rounded border border-border bg-white p-3">
              <img
                src={`data:image/png;base64,${setupData.qr_code_base64}`}
                alt="2FA QR code"
                className="size-48"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Can't scan? <span className="font-mono text-foreground">{setupData.secret}</span>
            </p>
            <Button className="w-full" onClick={() => setStep("verify")}>
              I've scanned it <ChevronRight className="size-4" />
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Authentication code
              <Input
                className="mt-2"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </label>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("scan")}>
                Back
              </Button>
              <Button disabled={busy || code.length < 6} onClick={handleEnable}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Enable 2FA
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Disable 2FA dialog
function DisableTwoFactorDialog({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void
  onClose: () => void
}) {
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleDisable() {
    if (!password || !code) {
      return
    }
    setBusy(true)
    try {
      await authService.disableTwoFactor(password, code)
      onSuccess()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable two-factor authentication</DialogTitle>
          <DialogDescription>
            Enter your current password and an authenticator code to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Current password
            <Input
              type="password"
              className="mt-2"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Authentication code
            <Input
              className="mt-2"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || !password || !code}
            onClick={handleDisable}
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Disable 2FA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main page
export default function AccountSettings() {
  const { user, refreshUser } = useUser()

  // 2FA dialog state
  const [showSetup2FA, setShowSetup2FA] = useState(false)
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

  // Subscription
  const [tierLimits, setTierLimits] = useState<TierLimits | null>(null)
  const [quota, setQuota] = useState<ProjectQuota | null>(null)
  const [tierBusy, setTierBusy] = useState<SubscriptionTier | null>(null)

  useEffect(() => {
    void subscriptionService.getTiers().then(setTierLimits)
    void subscriptionService.getQuota().then(setQuota)
  }, [])

  if (!user) {
    return null
  }

  const initials = (user.full_name ?? user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleEnable2FASuccess(codes: string[]) {
    setShowSetup2FA(false)
    setBackupCodes(codes)
    await refreshUser()
  }

  async function handleDisable2FASuccess() {
    setShowDisable2FA(false)
    toast.success("Two-factor authentication disabled")
    await refreshUser()
  }

  async function handleRegenerateCodes() {
    const codes = await authService.regenerateBackupCodes()
    setBackupCodes(codes)
  }

  async function handleChangeTier(tier: SubscriptionTier) {
    setTierBusy(tier)
    try {
      await subscriptionService.changeTier(tier)
      await refreshUser()
      // Re-fetch quota after tier change
      void subscriptionService.getQuota().then(setQuota)
    } finally {
      setTierBusy(null)
    }
  }

  return (
    <div className="w-full max-w-3xl">
      {/* Header */}
      <header className="mb-8 border-b border-border/70 pb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, security, and subscription.
        </p>
      </header>

      <div className="space-y-4">
        {/* ── Profile ──────────────────────────────────────────────────── */}
        <Section
          icon={User}
          title="Profile"
          description="Your account identity as it appears across the studio."
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {user.full_name ?? <span className="text-muted-foreground">No name set</span>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Account status</dt>
              <dd>
                {user.is_active ? (
                  <Badge variant="outline" className="gap-1.5 border-green-500/40 text-green-400">
                    <BadgeCheck className="size-3" /> Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">Disabled</Badge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Email verified</dt>
              <dd>
                {user.is_verified ? (
                  <Badge variant="outline" className="gap-1.5 border-green-500/40 text-green-400">
                    <BadgeCheck className="size-3" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500/40 text-yellow-400">
                    Unverified
                  </Badge>
                )}
              </dd>
            </div>
          </dl>
        </Section>

        {/*  Security / 2FA */}
        <Section
          icon={ShieldCheck}
          title="Security"
          description="Two-factor authentication adds a second layer of protection to your account."
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {user.is_2fa_enabled
                  ? "Enabled — your account is protected with TOTP."
                  : "Disabled — only your password protects this account."}
              </p>
            </div>
            {user.is_2fa_enabled ? (
              <Badge className="shrink-0 gap-1.5 bg-green-500/15 text-green-400 hover:bg-green-500/20">
                <ShieldCheck className="size-3" /> On
              </Badge>
            ) : (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                Off
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {!user.is_2fa_enabled ? (
              <Button size="sm" onClick={() => setShowSetup2FA(true)}>
                <QrCode className="size-4" /> Enable 2FA
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => void handleRegenerateCodes()}>
                  <RefreshCw className="size-4" /> New backup codes
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setShowDisable2FA(true)}>
                  <ShieldOff className="size-4" /> Disable 2FA
                </Button>
              </>
            )}
          </div>

          <div className="rounded border border-border/50 bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            <KeyRound className="mb-1 inline size-3" /> Backup codes let you regain access when you
            don't have your authenticator device. Store them in a password manager.
          </div>
        </Section>

        {/*  Subscription  */}
        <Section
          icon={Sparkles}
          title="Subscription"
          description="Your current plan, project usage, and available tiers."
        >
          {/* Current plan summary */}
          <div
            className={`flex items-start justify-between gap-4 rounded border p-4 ${TIER_ACCENT[user.subscription_tier]}`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${TIER_BADGE_BG[user.subscription_tier]}`}
                >
                  {TIER_FEATURES[user.subscription_tier].label}
                </span>
                <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                  Current plan
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {TIER_FEATURES[user.subscription_tier].description}
              </p>
            </div>
          </div>

          {/* Usage quota */}
          {quota ? (
            <QuotaBar quota={quota} />
          ) : (
            <div className="h-8 animate-pulse rounded bg-muted" />
          )}

          <Separator />

          {/* Tier cards */}
          <div className="grid gap-2">
            {TIER_ORDER.map((tier) => {
              const isCurrent = user.subscription_tier === tier
              const info = TIER_FEATURES[tier]
              const limit = tierLimits?.[tier]

              return (
                <div
                  key={tier}
                  className={`border p-4 transition-colors ${
                    isCurrent ? "border-primary/50 bg-primary/5" : "border-border/50 bg-card/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${TIER_BADGE_BG[tier]}`}
                        >
                          {info.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tierLimits
                            ? limit === null
                              ? "Unlimited projects"
                              : `${limit} project${limit === 1 ? "" : "s"}`
                            : "…"}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {info.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <BadgeCheck className="size-3 shrink-0 text-primary/60" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="shrink-0 pt-0.5">
                      {isCurrent ? (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Current
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={tierBusy !== null}
                          onClick={() => void handleChangeTier(tier)}
                        >
                          {tierBusy === tier ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            "Switch"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            In production, tier changes are driven by a payment provider webhook, not directly by
            the client.
          </p>
        </Section>
      </div>

      {/* Dialogs */}
      {showSetup2FA && (
        <TwoFactorSetupDialog
          onSuccess={(codes) => void handleEnable2FASuccess(codes)}
          onClose={() => setShowSetup2FA(false)}
        />
      )}
      {showDisable2FA && (
        <DisableTwoFactorDialog
          onSuccess={() => void handleDisable2FASuccess()}
          onClose={() => setShowDisable2FA(false)}
        />
      )}
      {backupCodes && (
        <BackupCodesDisplay codes={backupCodes} onClose={() => setBackupCodes(null)} />
      )}
    </div>
  )
}
