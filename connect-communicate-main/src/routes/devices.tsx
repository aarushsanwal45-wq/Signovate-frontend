import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getDevices, createDevice, updateDevice, deleteDevice } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Video,
  Hand,
  Glasses,
  Mic,
  Cpu,
  Trash2,
  Settings as SettingsIcon,
  Power,
  Bluetooth,
  Wifi,
  Usb,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "My Devices — SignovateAI" },
      { name: "description", content: "Manage your connected cameras, smart gloves, and AR goggles." },
    ],
  }),
  component: () => (
    <AppShell>
      <DevicesPage />
    </AppShell>
  ),
});

const DEVICE_ICONS: Record<string, any> = {
  camera: Video,
  gloves: Hand,
  goggles: Glasses,
  nova: Cpu,
  microphone: Mic,
};

const DEVICE_TYPES = [
  { value: "camera", label: "Webcam / IP Camera", icon: Video, desc: "Connect via USB, device ID, or IP stream" },
  { value: "gloves", label: "Smart Gloves", icon: Hand, desc: "Bluetooth gesture input — independent from camera" },
  { value: "goggles", label: "AR Goggles / Smart Glasses", icon: Glasses, desc: "Connect via Bluetooth or WiFi" },
  { value: "nova", label: "NOVA Device", icon: Cpu, desc: "Compact dedicated sign language translation device (148x90x82mm)" },
];

const DEMO_DEVICES = [
  {
    id: "demo-webcam",
    isDemo: true,
    name: "Built-in Webcam",
    nickname: "Built-in Webcam",
    device_type: "camera",
    connection_type: "usb",
    status: "connected",
    last_seen_label: "Just now",
    primaryAction: "Enable",
  },
  {
    id: "demo-gloves",
    isDemo: true,
    name: "SignalVate Gloves v1",
    nickname: "SignalVate Gloves v1",
    device_type: "gloves",
    connection_type: "bluetooth",
    status: "offline",
    last_seen_label: "2 hours ago",
    primaryAction: "Connect",
    note: "Gloves operate independently from camera. Each has its own AI model.",
  },
  {
    id: "demo-goggles",
    isDemo: true,
    name: "NOVA AR Goggles",
    nickname: "NOVA AR Goggles",
    device_type: "goggles",
    connection_type: "bluetooth",
    status: "pairing",
    last_seen_label: "Pairing in progress...",
    primaryAction: "Retry Pairing",
  },
];

function DevicesPage() {
  const { user } = useAuth();
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [hiddenDemoIds, setHiddenDemoIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDevices();
      setUserDevices(data ?? []);
    } catch (error) {
      console.error("Failed to load devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const remove = async (id: string) => {
    try {
      await deleteDevice(id);
      toast.success("Device removed");
      load();
    } catch (error) {
      toast.error("Failed to remove device");
    }
  };

  const removeDemo = (id: string) => {
    setHiddenDemoIds((prev) => [...prev, id]);
    toast.success("Device removed");
  };

  const toggle = async (d: any) => {
    const next = d.status === "connected" ? "offline" : "connected";
    try {
      await updateDevice(d.id, { status: next, last_seen: new Date().toISOString() });
      load();
    } catch (error) {
      toast.error("Failed to update device");
    }
  };

  const visibleDemos = DEMO_DEVICES.filter((d) => !hiddenDemoIds.includes(d.id));
  const devices = [...visibleDemos, ...userDevices];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="font-display text-xl font-bold">Connected devices</h2>
          <p className="text-sm text-muted-foreground">
            Cameras, gloves, AR goggles, and more.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Add Device
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary-soft flex items-center justify-center mb-4">
            <Video className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg">No devices yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Connect your first camera, glove, or AR goggle to start translating.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add your first device
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {devices.map((d) => {
            const Icon = DEVICE_ICONS[d.device_type] ?? Video;
            const isDemo = !!d.isDemo;
            return (
              <div
                key={d.id}
                className="bg-card rounded-xl border border-border shadow-soft p-4 md:p-5 flex flex-col gap-3 md:gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 md:h-11 md:w-11 rounded-lg bg-primary-soft flex items-center justify-center text-primary shrink-0">
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium",
                      d.status === "connected"
                        ? "bg-success/15 text-success"
                        : d.status === "pairing"
                        ? "bg-warning/15 text-warning-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {d.status === "connected"
                      ? "Connected"
                      : d.status === "pairing"
                      ? "Pairing"
                      : "Offline"}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm md:text-base">{d.nickname ?? d.name}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground">
                    {d.name} · <span className="uppercase">{d.connection_type}</span>
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    Last seen{" "}
                    {isDemo
                      ? d.last_seen_label
                      : d.last_seen
                      ? new Date(d.last_seen).toLocaleString()
                      : "never"}
                  </div>
                </div>
                {isDemo && d.note && (
                  <div className="text-[10px] md:text-xs rounded-lg bg-primary-soft/60 border border-primary/20 text-foreground/80 p-2 md:p-2.5 leading-relaxed">
                    {d.note}
                  </div>
                )}
                <div className="flex gap-2 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (isDemo ? toast.info(`${d.primaryAction} (demo)`) : toggle(d))}
                    className="flex-1"
                  >
                    <Power className="h-3.5 w-3.5 mr-1" />
                    {isDemo
                      ? d.primaryAction
                      : d.status === "connected"
                      ? "Disable"
                      : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => isDemo && toast.info("Configure (demo)")}>
                    <SettingsIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => (isDemo ? removeDemo(d.id) : remove(d.id))}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddDeviceDialog open={open} onOpenChange={setOpen} onAdded={load} />
    </div>
  );
}

function AddDeviceDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string>("camera");
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);

  // Camera
  const [cameraLabel, setCameraLabel] = useState("");
  const [resolution, setResolution] = useState("720p");
  const [fps, setFps] = useState("30");
  const [port, setPort] = useState("");
  const [tested, setTested] = useState(false);

  // Gloves
  const [scanning, setScanning] = useState(false);
  const [pairedGlove, setPairedGlove] = useState<string | null>(null);

  // Goggles
  const [gogglesTab, setGogglesTab] = useState<"bt" | "wifi">("bt");
  const [ssid, setSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");

  // NOVA
  const [novaPort, setNovaPort] = useState("usb-c-1");

  const reset = () => {
    setStep(1);
    setType("camera");
    setNickname("");
    setCameraLabel("");
    setResolution("720p");
    setFps("30");
    setPort("");
    setTested(false);
    setScanning(false);
    setPairedGlove(null);
    setGogglesTab("bt");
    setSsid("");
    setWifiPass("");
    setNovaPort("usb-c-1");
  };

  // Glove scan simulation
  useEffect(() => {
    if (step === 2 && type === "gloves" && !pairedGlove) {
      setScanning(true);
      const t = setTimeout(() => setScanning(false), 1800);
      return () => clearTimeout(t);
    }
  }, [step, type, pairedGlove]);

  const connectionFor = (t: string) =>
    t === "camera" ? "usb" : t === "gloves" ? "bluetooth" : t === "goggles" ? (gogglesTab === "wifi" ? "wifi" : "bluetooth") : "usb";

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const conn = connectionFor(type);
    const defaultName =
      type === "camera"
        ? cameraLabel || "Webcam"
        : type === "gloves"
        ? pairedGlove || "Smart Gloves"
        : type === "goggles"
        ? "AR Goggles"
        : "NOVA Device";
    
    try {
      await createDevice({
        name: defaultName,
        nickname: nickname || undefined,
        device_type: type,
        connection_type: conn,
        status: "connected",
        battery: type === "gloves" || type === "goggles" || type === "nova" ? Math.floor(60 + Math.random() * 40) : undefined,
        signal_strength: Math.floor(70 + Math.random() * 30),
      });
      
      toast.success("Device added!");
      onAdded();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to add device");
    } finally {
      setSaving(false);
    }
  };

  const canNextFromStep2 = () => {
    if (type === "camera") return tested;
    if (type === "gloves") return !!pairedGlove;
    if (type === "goggles") return gogglesTab === "bt" || (ssid.length > 0 && wifiPass.length > 0);
    return true;
  };

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "h-2 rounded-full transition-all",
            s === step ? "w-8 bg-primary" : s < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a new device · Step {step} of 3</DialogTitle>
        </DialogHeader>

        <StepDots />

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose the device type to connect.</p>
            <div className="grid grid-cols-2 gap-3">
              {DEVICE_TYPES.map((t) => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "p-5 rounded-xl border-2 text-left transition flex flex-col gap-2",
                      active ? "border-primary bg-primary-soft shadow-soft" : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      active ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground leading-snug">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && type === "camera" && (
          <div className="space-y-4">
            <div>
              <Label>Device Label</Label>
              <Input value={cameraLabel} onChange={(e) => setCameraLabel(e.target.value)} placeholder="e.g. Living Room Camera" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">480p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>FPS</Label>
                <Select value={fps} onValueChange={setFps}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Device Port / ID</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="e.g. /dev/video0 or 192.168.1.42" />
            </div>
            <Button
              variant={tested ? "outline" : "default"}
              onClick={() => { setTested(true); toast.success("Connection test successful"); }}
              className="w-full"
            >
              {tested ? <><Check className="h-4 w-4 mr-2" /> Test successful</> : <><Usb className="h-4 w-4 mr-2" /> Test Connection</>}
            </Button>
          </div>
        )}

        {step === 2 && type === "gloves" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <div className={cn(
                "mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-3",
                scanning ? "bg-primary-soft animate-pulse" : "bg-success/15"
              )}>
                {scanning ? <Bluetooth className="h-7 w-7 text-primary animate-pulse" /> : <Check className="h-7 w-7 text-success" />}
              </div>
              <div className="font-medium">
                {scanning ? "Scanning for nearby gloves..." : "Found 2 nearby devices"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure your gloves are powered on and in pairing mode.
              </p>
            </div>
            {!scanning && (
              <div className="space-y-2">
                {["SignalVate Gloves v1", "GestureX Pro"].map((g) => (
                  <div key={g} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <Hand className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{g}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={pairedGlove === g ? "outline" : "default"}
                      onClick={() => { setPairedGlove(g); toast.success(`Paired with ${g}`); }}
                    >
                      {pairedGlove === g ? <><Check className="h-3.5 w-3.5 mr-1" /> Paired</> : "Pair"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && type === "goggles" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setGogglesTab("bt")}
                className={cn(
                  "py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2",
                  gogglesTab === "bt" ? "bg-card shadow-soft" : "text-muted-foreground"
                )}
              >
                <Bluetooth className="h-4 w-4" /> Bluetooth Pair
              </button>
              <button
                onClick={() => setGogglesTab("wifi")}
                className={cn(
                  "py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2",
                  gogglesTab === "wifi" ? "bg-card shadow-soft" : "text-muted-foreground"
                )}
              >
                <Wifi className="h-4 w-4" /> WiFi Config
              </button>
            </div>
            {gogglesTab === "bt" ? (
              <div className="rounded-xl border border-border bg-surface p-6 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-primary-soft flex items-center justify-center mb-3 animate-pulse">
                  <Bluetooth className="h-6 w-6 text-primary" />
                </div>
                <div className="font-medium">Ready to pair</div>
                <p className="text-xs text-muted-foreground mt-1">Hold the power button on your goggles for 3 seconds.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>WiFi SSID</Label>
                  <Input value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="MyHomeWiFi" />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && type === "nova" && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-border bg-surface p-6">
              <div className="flex items-center justify-center gap-4">
                <div className="h-20 w-28 rounded-lg bg-gradient-to-br from-primary-soft to-primary/20 border border-primary/30 flex items-center justify-center relative">
                  <Cpu className="h-8 w-8 text-primary" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-6 bg-primary/60 rounded-b" />
                </div>
                <div className="flex flex-col items-center text-xs text-muted-foreground">
                  <Usb className="h-5 w-5 text-primary" />
                  <span>USB-C</span>
                </div>
                <div className="h-16 w-16 rounded-lg border border-border flex items-center justify-center text-xs text-muted-foreground">
                  Host
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Connect your NOVA device to any USB-C port on this machine.
              </p>
            </div>
            <div>
              <Label>USB-C Port</Label>
              <Select value={novaPort} onValueChange={setNovaPort}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usb-c-1">USB-C Port 1 (left)</SelectItem>
                  <SelectItem value="usb-c-2">USB-C Port 2 (right)</SelectItem>
                  <SelectItem value="usb-c-hub">External USB-C Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Device nickname</Label>
              <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. My main cam" />
            </div>
            <div>
              <Label>Assign to user profile</Label>
              <Select defaultValue="me">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">{user?.email ?? "Me"}</SelectItem>
                  <SelectItem value="shared">Shared (household)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={submit} disabled={saving} className="w-full">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save & Connect"}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
          <Button variant="ghost" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 3 && (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && !canNextFromStep2()}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
