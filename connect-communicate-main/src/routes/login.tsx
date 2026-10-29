import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Copy, Check, Zap, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { forgotPassword, resetPassword } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — SignovateAI" },
      { name: "description", content: "Sign in to your SignovateAI assistive intelligence dashboard." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormData = z.infer<typeof schema>;

// ── Forgot Password Modal Component ─────────────────────────
function ForgotPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  if (!open) return null;

  const handleRequestOtp = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setStep("otp");
        // In demo mode, the OTP is returned and shown via toast
        if (result.otp) {
          setGeneratedOtp(result.otp);
          toast.info(`Demo OTP: ${result.otp}`, {
            duration: 15000,
            description: "In production, this would be sent to your email",
          });
        }
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp) {
      setError("Please enter the OTP code");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await resetPassword(email, otp, newPassword);
      if (result.success) {
        setStep("success");
        toast.success("Password reset successfully!");
      } else {
        setError(result.error || "Failed to reset password");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setGeneratedOtp("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary-soft to-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.55_0.2_260)] flex items-center justify-center text-primary-foreground">
              {step === "success" ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold">
                {step === "email" && "Forgot Password"}
                {step === "otp" && "Reset Password"}
                {step === "success" && "Password Reset"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {step === "email" && "Enter your email to receive a reset code"}
                {step === "otp" && "Enter the OTP and your new password"}
                {step === "success" && "Your password has been updated"}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === "email" && (
            <>
              <div>
                <Label htmlFor="reset-email">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button onClick={handleRequestOtp} disabled={loading} className="flex-1">
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </div>
            </>
          )}

          {step === "otp" && (
            <>
              {generatedOtp && (
                <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Demo Mode</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your OTP code is: <span className="font-mono font-bold text-primary text-base">{generatedOtp}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    In production, this would be sent to your email.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="otp-code">OTP Code</Label>
                <Input
                  id="otp-code"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("email")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleResetPassword} disabled={loading} className="flex-1">
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </>
          )}

          {step === "success" && (
            <>
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                  <ShieldCheck className="h-8 w-8 text-success" />
                </div>
                <h3 className="font-display text-lg font-bold">All Done!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                Back to Sign In
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Main Login Page ────────────────────────────────────────────
function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const copy = async (kind: "email" | "password", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(`${kind === "email" ? "Email" : "Password"} copied`);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await login(data.email, data.password);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Login failed");
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary-soft via-background to-primary-soft relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.55_0.2_260)] flex items-center justify-center text-primary-foreground font-bold shadow-medium">
              SV
            </div>
            <span className="font-display font-bold text-xl">SignovateAI</span>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <Sparkles className="h-8 w-8 text-primary mb-4" />
          <h2 className="font-display text-3xl font-bold leading-tight">
            Empowering the Deaf, Mute & Blind community through AI.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real-time sign language translation for the Deaf, Mute, and Blind community —
            powered by camera, smart gloves, and AR goggles.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© 2026 SignovateAI. All rights reserved.</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.55_0.2_260)] flex items-center justify-center text-primary-foreground font-bold">
              SV
            </div>
            <span className="font-display font-bold text-xl">SignovateAI</span>
          </div>
          <h1 className="font-display text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back to your dashboard.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full h-10">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
}
