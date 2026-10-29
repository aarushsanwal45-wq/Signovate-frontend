import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Ear, MicOff, Eye, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — SignovateAI" },
      { name: "description", content: "Set up your SignovateAI assistive intelligence account in three simple steps." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[^A-Za-z0-9]/, "Add a special character"),
});
type FormData = z.infer<typeof schema>;

const COMMUNITIES = [
  { value: "deaf", label: "Deaf", icon: Ear },
  { value: "mute", label: "Mute", icon: MicOff },
  { value: "blind", label: "Blind", icon: Eye },
  { value: "multiple", label: "Multiple", icon: Users },
] as const;

function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [step, setStep] = useState(1);
  const [community, setCommunity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onChange" });

  const password = watch("password") ?? "";
  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await registerUser(data.fullName, data.email, data.password);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Registration failed");
      return;
    }
    toast.success("Account created! Welcome to SignovateAI.");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-medium border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary-soft to-background">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.2_260)] flex items-center justify-center text-primary-foreground font-bold">
              SV
            </div>
            <span className="font-display font-bold text-lg">SignovateAI</span>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    s <= step ? "bg-primary" : "bg-muted"
                  )}
                />
                <div className="text-[10px] mt-1 text-muted-foreground">
                  Step {s} {s === 1 ? "· Account" : s === 2 ? "· Community" : "· Devices"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Create your account</h2>
                <p className="text-sm text-muted-foreground">Just a few details to get started.</p>
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...register("fullName")} />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} />
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i <= strength
                          ? strength <= 2
                            ? "bg-destructive"
                            : strength === 3
                            ? "bg-warning"
                            : "bg-success"
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
              <Button
                onClick={handleSubmit(() => setStep(2))}
                className="w-full h-10"
                type="button"
              >
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">I am part of the</h2>
                <p className="text-sm text-muted-foreground">
                  This helps us personalize your experience.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {COMMUNITIES.map((c) => {
                  const Icon = c.icon;
                  const active = community === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCommunity(c.value)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        active
                          ? "border-primary bg-primary-soft shadow-soft"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-5 w-5 text-primary" />
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="mt-2 font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground">community</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!community}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">Device setup</h2>
                <p className="text-sm text-muted-foreground">
                  You can connect cameras, smart gloves, and AR goggles after signup. We'll guide you.
                </p>
              </div>
              <div className="rounded-lg bg-primary-soft border border-primary/20 p-4 text-sm">
                <div className="font-medium text-primary">You're almost done!</div>
                <p className="text-muted-foreground mt-1">
                  After creating your account, head to <strong>My Devices</strong> to add your first device.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
