
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Brain, CheckCircle2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Model Library — SignovateAI" },
      {
        name: "description",
        content: "SignovateAI sign language recognition model.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <ModelsPage />
    </AppShell>
  ),
});

function ModelsPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="font-display text-xl font-bold">
          Model Library
        </h2>

        <p className="text-sm text-muted-foreground">
          The sign language recognition model currently used by SignovateAI.
        </p>
      </div>

      {/* Model Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-card rounded-xl border border-border shadow-soft p-4 md:p-5 flex flex-col gap-4">

          {/* Icon + Status */}
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 md:h-11 md:w-11 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 bg-success/15 text-success">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </span>
          </div>

          {/* Model Information */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded bg-primary/15 text-primary">
                ASL Alphabet
              </span>

              <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Custom
              </span>
            </div>

            <div className="font-semibold leading-tight text-sm md:text-base">
              SignovateAI ASL Alphabet
            </div>

            <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
              Custom-trained Random Forest gesture recognition model
            </div>
          </div>

          {/* Model Statistics */}
          <div className="space-y-3">

            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">
                Training classes
              </span>

              <span className="font-medium">
                A–E
              </span>
            </div>

            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">
                Detected training images
              </span>

              <span className="font-medium">
                12,129
              </span>
            </div>

            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">
                Model type
              </span>

              <span className="font-medium">
                Random Forest
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">
                  Hold-out accuracy
                </span>

                <span className="font-medium">
                  99.9%
                </span>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: "99.9%" }}
                />
              </div>
            </div>

            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">
                5-fold cross-validation
              </span>

              <span className="font-medium">
                97.1% ± 2.1%
              </span>
            </div>
          </div>

          {/* Protected Model Notice */}
          <div className="border-t border-border pt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />

            <span>
              This model is managed by the system administrator.
              Model creation, deletion, retraining, and replacement
              are disabled for users.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

