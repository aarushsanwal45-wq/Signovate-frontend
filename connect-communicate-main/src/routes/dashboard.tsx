import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Plus,
  Brain,
  List,
  Cpu,
  Activity,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Wifi,
  Zap,
  History,
  ShieldCheck,
  Play,
  ChevronRight,
  Video,
  Database,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getStatus,
  getHistory,
  getModels,
  getDevices,
  getTrainedGestures,
  type HistoryEntry,
  type ModelCard,
  type Device,
  type TrainedGesture,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SignovateAI" },
      {
        name: "description",
        content: "Your assistive intelligence command center.",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <Dashboard />
    </AppShell>
  ),
});

function Dashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [models, setModels] = useState<ModelCard[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [gestures, setGestures] = useState<TrainedGesture[]>([]);

  const [stats, setStats] = useState({
    hardware: false,
    backendOnline: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        const [status, hist, modelList, deviceList, gestureList] =
          await Promise.all([
            getStatus(),
            getHistory(8),
            getModels(),
            getDevices(),
            getTrainedGestures(),
          ]);

        setHistory(hist);
        setModels(modelList);
        setDevices(deviceList);
        setGestures(gestureList);

        setStats({
          hardware: !!status.hardware,
          backendOnline: true,
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        setStats({
          hardware: false,
          backendOnline: false,
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const activeDevices = devices.filter(
    (device) =>
      device.status?.toLowerCase() === "connected" ||
      device.status?.toLowerCase() === "online" ||
      device.status?.toLowerCase() === "active"
  );

  const activeModels = models.filter(
    (model) => model.status === "active"
  );

  const trainingModels = models.filter(
    (model) => model.status === "training"
  );

  return (
    <div className="page-enter dashboard-grid min-h-full space-y-5 md:space-y-6">
      {/* ─────────────────────────────────────────────
          HERO
      ───────────────────────────────────────────── */}

      <section className="panel-accent relative overflow-hidden p-5 md:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-56 w-56 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="eyebrow mb-2 flex items-center gap-2">
              <span
                className={`status-dot h-1.5 w-1.5 rounded-full ${
                  stats.backendOnline
                    ? "bg-success text-success"
                    : loading
                      ? "bg-warning text-warning"
                      : "bg-destructive text-destructive"
                }`}
              />

              {loading
                ? "CHECKING SYSTEM"
                : stats.backendOnline
                  ? "SYSTEM ONLINE"
                  : "SYSTEM OFFLINE"}
            </div>

            <h1 className="gradient-text text-2xl font-bold md:text-3xl lg:text-4xl">
              Assistive Intelligence
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Monitor your translation system, connected hardware, models and
              recent activity from one command center.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate({ to: "/translate" })}
              className="glow-button h-10 gap-2 px-4"
            >
              <Play className="h-4 w-4" />
              Start Translating
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate({ to: "/devices" })}
              className="glow-button h-10 gap-2 border-border/70 bg-background/30"
            >
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>

        {/* System indicators */}

        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 border-t border-border/50 pt-4 md:grid-cols-4">
          <SystemIndicator
            icon={Activity}
            label="Translation Engine"
            value={
              loading
                ? "Checking..."
                : stats.backendOnline
                  ? "Ready"
                  : "Unavailable"
            }
            active={stats.backendOnline}
          />

          <SystemIndicator
            icon={Cpu}
            label="Hardware"
            value={
              loading
                ? "Checking..."
                : stats.hardware
                  ? "Connected"
                  : "Offline"
            }
            active={stats.hardware}
          />

          <SystemIndicator
            icon={Brain}
            label="Trained Models"
            value={loading ? "Loading..." : String(models.length)}
            active={models.length > 0}
          />

          <SystemIndicator
            icon={ShieldCheck}
            label="Backend"
            value={
              loading
                ? "Checking..."
                : stats.backendOnline
                  ? "Online"
                  : "Offline"
            }
            active={stats.backendOnline}
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          KEY METRICS
      ───────────────────────────────────────────── */}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Recent Translations"
          value={loading ? "—" : String(history.length)}
          description="Records loaded from history"
          icon={Activity}
          tone="purple"
        />

        <MetricCard
          label="Trained Models"
          value={loading ? "—" : String(models.length)}
          description={
            loading
              ? "Checking model library"
              : `${activeModels.length} active`
          }
          icon={Brain}
          tone="blue"
        />

        <MetricCard
          label="Registered Devices"
          value={loading ? "—" : String(devices.length)}
          description={
            loading
              ? "Checking devices"
              : `${activeDevices.length} currently active`
          }
          icon={Cpu}
          tone={devices.length > 0 ? "green" : "muted"}
        />

        <MetricCard
          label="Gesture Classes"
          value={loading ? "—" : String(gestures.length)}
          description="Trained gesture categories"
          icon={Database}
          tone={gestures.length > 0 ? "green" : "muted"}
        />
      </section>

      {/* ─────────────────────────────────────────────
          QUICK STATS
      ───────────────────────────────────────────── */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          icon={Brain}
          label="Active Models"
          value={loading ? "—" : String(activeModels.length)}
        />

        <MiniStat
          icon={Video}
          label="Translation Records"
          value={loading ? "—" : String(history.length)}
        />

        <MiniStat
          icon={Cpu}
          label="Hardware"
          value={
            loading
              ? "—"
              : stats.hardware
                ? "Connected"
                : "Offline"
          }
        />

        <MiniStat
          icon={Users}
          label="Account"
          value={
            role === "admin"
              ? "Administrator"
              : "Standard User"
          }
        />
      </section>

      {/* ─────────────────────────────────────────────
          MAIN WORKSPACE
      ───────────────────────────────────────────── */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Recent Activity */}

        <div className="glow-card xl:col-span-3">
          <div className="relative z-10 p-4 md:p-5">
            <SectionHeader
              icon={History}
              title="Recent Activity"
              subtitle="Latest translation events"
              action="View all"
              onAction={() => navigate({ to: "/logs" })}
            />

            <div className="mt-4">
              {history.length > 0 ? (
                <div className="space-y-1">
                  {history.map((log, index) => (
                    <ActivityRow
                      key={log.id}
                      log={log}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Activity}
                  title="No translation activity"
                  description="Start a translation session to populate your activity feed."
                  action="Start translating"
                  onAction={() => navigate({ to: "/translate" })}
                />
              )}
            </div>
          </div>
        </div>

        {/* Device Status */}

        <div className="glow-card xl:col-span-2">
          <div className="relative z-10 p-4 md:p-5">
            <SectionHeader
              icon={Cpu}
              title="Device Status"
              subtitle="Registered hardware"
              action="Manage"
              onAction={() => navigate({ to: "/devices" })}
            />

            <div className="mt-4 space-y-2">
              {devices.length > 0 ? (
                devices.slice(0, 4).map((device) => (
                  <DeviceRow
                    key={device.id}
                    name={device.nickname || device.name}
                    type={device.device_type}
                    status={device.status}
                    active={
                      device.status?.toLowerCase() === "connected" ||
                      device.status?.toLowerCase() === "online" ||
                      device.status?.toLowerCase() === "active"
                    }
                  />
                ))
              ) : (
                <>
                  <DeviceRow
                    name="System Hardware"
                    type="Backend detected"
                    status={
                      stats.hardware
                        ? "Connected"
                        : "Offline"
                    }
                    active={stats.hardware}
                  />

                  <EmptyState
                    icon={Cpu}
                    title="No registered devices"
                    description="Connect or register a device to manage it from this dashboard."
                    action="Manage devices"
                    onAction={() => navigate({ to: "/devices" })}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────
          LOWER PANELS
      ───────────────────────────────────────────── */}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick Actions */}

        <div className="glow-card">
          <div className="relative z-10 p-4 md:p-5">
            <SectionHeader
              icon={Zap}
              title="Quick Actions"
              subtitle="Common operations"
            />

            <div className="mt-4 space-y-2">
              <ActionButton
                icon={Camera}
                title="Live Translate"
                description="Open camera translation"
                onClick={() => navigate({ to: "/translate" })}
              />

              <ActionButton
                icon={Brain}
                title="Model Library"
                description="Manage translation models"
                onClick={() => navigate({ to: "/models" })}
              />

              <ActionButton
                icon={List}
                title="Translation Logs"
                description="Review previous activity"
                onClick={() => navigate({ to: "/logs" })}
              />
            </div>
          </div>
        </div>

        {/* Model Status */}

        <div className="glow-card">
          <div className="relative z-10 p-4 md:p-5">
            <SectionHeader
              icon={Brain}
              title="Model Status"
              subtitle="Current model library"
              action="Open"
              onAction={() => navigate({ to: "/models" })}
            />

            <div className="mt-4 space-y-3">
              <SnapshotRow
                label="Total models"
                value={loading ? "Loading..." : String(models.length)}
                active={models.length > 0}
              />

              <SnapshotRow
                label="Active models"
                value={loading ? "Loading..." : String(activeModels.length)}
                active={activeModels.length > 0}
              />

              <SnapshotRow
                label="Training"
                value={loading ? "Loading..." : String(trainingModels.length)}
                active={trainingModels.length > 0}
              />

              <SnapshotRow
                label="Gesture classes"
                value={loading ? "Loading..." : String(gestures.length)}
                active={gestures.length > 0}
              />
            </div>
          </div>
        </div>

        {/* Workspace */}

        <div className="glow-card">
          <div className="relative z-10 p-4 md:p-5">
            <SectionHeader
              icon={ShieldCheck}
              title="System Snapshot"
              subtitle="Current environment"
            />

            <div className="mt-4 space-y-3">
              <SnapshotRow
                label="Backend API"
                value={
                  loading
                    ? "Checking..."
                    : stats.backendOnline
                      ? "Online"
                      : "Offline"
                }
                active={stats.backendOnline}
              />

              <SnapshotRow
                label="Hardware"
                value={
                  loading
                    ? "Checking..."
                    : stats.hardware
                      ? "Connected"
                      : "Offline"
                }
                active={stats.hardware}
              />

              <SnapshotRow
                label="Model subsystem"
                value={
                  loading
                    ? "Checking..."
                    : models.length > 0
                      ? "Available"
                      : "No models"
                }
                active={models.length > 0}
              />

              <SnapshotRow
                label="Activity history"
                value={
                  loading
                    ? "Loading..."
                    : history.length > 0
                      ? `${history.length} records`
                      : "Empty"
                }
                active={history.length > 0}
              />
            </div>

            <Button
              variant="outline"
              className="mt-5 h-9 w-full justify-between border-border/60 bg-background/30 text-xs"
              onClick={() => navigate({ to: "/settings" })}
            >
              Workspace settings
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SYSTEM INDICATOR
───────────────────────────────────────────── */

function SystemIndicator({
  icon: Icon,
  label,
  value,
  active,
}: {
  icon: any;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
          active
            ? "border-success/20 bg-success/10 text-success"
            : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0">
        <div className="truncate text-[10px] text-muted-foreground">
          {label}
        </div>

        <div
          className={`truncate text-xs font-medium ${
            active
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: any;
  tone: "purple" | "blue" | "green" | "muted";
}) {
  const toneClasses = {
    purple:
      "bg-primary-soft text-primary border-primary/20",

    blue:
      "bg-blue-500/10 text-blue-400 border-blue-400/20",

    green:
      "bg-success/10 text-success border-success/20",

    muted:
      "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="glow-card shimmer min-h-[145px] p-4 md:p-5">
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border ${toneClasses[tone]}`}
          >
            <Icon className="h-4 w-4" />
          </div>

          <span className="eyebrow">
            LIVE
          </span>
        </div>

        <div className="mt-5">
          <div className="font-display text-2xl font-bold tracking-tight">
            {value}
          </div>

          <div className="mt-0.5 text-xs font-medium text-foreground/80">
            {label}
          </div>

          <div className="mt-1 text-[10px] text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MINI STAT
───────────────────────────────────────────── */

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-box flex min-w-0 items-center gap-2.5 p-3 md:p-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/40 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-bold md:text-base">
          {value}
        </div>

        <div className="truncate text-[10px] text-muted-foreground">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: any;
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-header">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/40 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>

        <div>
          <h3 className="text-sm font-semibold">
            {title}
          </h3>

          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      {action && onAction && (
        <button
          onClick={onAction}
          className="group flex items-center gap-1 text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          {action}

          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTIVITY ROW
───────────────────────────────────────────── */

function ActivityRow({
  log,
  index,
}: {
  log: HistoryEntry;
  index: number;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-3 transition-colors hover:border-border/60 hover:bg-background/30">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary-soft text-sm font-bold text-primary">
        {log.detected_sign?.[0]?.toUpperCase() || "?"}

        {index === 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {log.detected_sign}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{log.device}</span>

          <span className="text-border">
            •
          </span>

          <span>
            {log.confidence.toFixed(1)}% confidence
          </span>
        </div>
      </div>

      <div className="shrink-0 text-[10px] text-muted-foreground">
        {new Date(log.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DEVICE ROW
───────────────────────────────────────────── */

function DeviceRow({
  name,
  type,
  status,
  active,
}: {
  name: string;
  type: string;
  status: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/25 p-3 transition-colors hover:border-primary/20 hover:bg-background/40">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          active
            ? "border-success/20 bg-success/10 text-success"
            : "border-border bg-muted/30 text-muted-foreground"
        }`}
      >
        <Cpu className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">
          {name}
        </div>

        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {type}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            active
              ? "bg-success shadow-[0_0_7px_var(--color-success)]"
              : "bg-muted-foreground/50"
          }`}
        />

        <span
          className={`text-[10px] font-medium ${
            active
              ? "text-success"
              : "text-muted-foreground"
          }`}
        >
          {status || "Unknown"}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ACTION BUTTON
───────────────────────────────────────────── */

function ActionButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-lg border border-border/50 bg-background/20 p-3 text-left transition-all hover:border-primary/25 hover:bg-primary/5"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">
          {title}
        </div>

        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {description}
        </div>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
  );
}

/* ─────────────────────────────────────────────
   SNAPSHOT ROW
───────────────────────────────────────────── */

function SnapshotRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            active
              ? "bg-success shadow-[0_0_7px_var(--color-success)]"
              : "bg-muted-foreground/50"
          }`}
        />

        <span className="truncate text-xs text-muted-foreground">
          {label}
        </span>
      </div>

      <span
        className={`ml-3 shrink-0 text-[10px] font-medium ${
          active
            ? "text-success"
            : "text-muted-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: any;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/20 px-5 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary-soft text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <div className="mt-3 text-sm font-medium">
        {title}
      </div>

      <p className="mt-1 max-w-xs text-[10px] leading-relaxed text-muted-foreground">
        {description}
      </p>

      <button
        onClick={onAction}
        className="mt-4 text-[10px] font-medium text-primary hover:underline"
      >
        {action}
      </button>
    </div>
  );
}