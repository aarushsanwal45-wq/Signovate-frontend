import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Users, Activity, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — SignovateAI" },
      { name: "description", content: "Platform administration and analytics." },
    ],
  }),
  component: () => (
    <AppShell>
      <AdminGuard />
    </AppShell>
  ),
});

const DAU = [
  { day: "Mon", v: 34 },
  { day: "Tue", v: 41 },
  { day: "Wed", v: 38 },
  { day: "Thu", v: 52 },
  { day: "Fri", v: 47 },
  { day: "Sat", v: 60 },
  { day: "Sun", v: 55 },
];

const TOP_SIGNS = [
  { sign: "Hello", count: 312 },
  { sign: "Thank You", count: 287 },
  { sign: "Help", count: 201 },
  { sign: "Yes", count: 198 },
  { sign: "No", count: 154 },
];

const DEVICE_USAGE = [
  { name: "Webcam", value: 58, color: "var(--color-primary)" },
  { name: "Gloves", value: 28, color: "oklch(0.72 0.16 160)" },
  { name: "NOVA", value: 14, color: "oklch(0.68 0.18 35)" },
];

const USERS = [
  { name: "Arjun Singh", role: "admin", lastLogin: "Today", status: "Active" },
  { name: "Priya Mehta", role: "user", lastLogin: "Yesterday", status: "Active" },
  { name: "Raj Verma", role: "user", lastLogin: "Apr 18, 2026", status: "Active" },
];

function AdminGuard() {
  const { role, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (role !== "admin") return <Navigate to="/dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-warning/15 text-warning flex items-center justify-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Admin panel</h2>
          <p className="text-sm text-muted-foreground">Platform-wide management & analytics.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total Users" value="12" trend="+3 this week" />
        <KpiCard icon={Activity} label="Translations (7d)" value="1,184" trend="+22%" />
        <KpiCard icon={TrendingUp} label="Avg Accuracy" value="92.6%" trend="+0.8%" />
        <KpiCard icon={ShieldCheck} label="Uptime" value="99.8%" trend="Stable" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-soft p-5">
          <h3 className="font-display font-semibold mb-4">Daily Active Users (last 7 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DAU}>
                <defs>
                  <linearGradient id="dau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#dau)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <h3 className="font-display font-semibold mb-4">Device Usage</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEVICE_USAGE}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {DEVICE_USAGE.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top signs + users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <h3 className="font-display font-semibold mb-4">Top Signs Detected</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_SIGNS} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="sign"
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-soft p-5">
          <h3 className="font-display font-semibold mb-4">User Management</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Role</th>
                <th className="py-2">Last Login</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {USERS.map((u) => (
                <tr key={u.name}>
                  <td className="py-2.5 font-medium">{u.name}</td>
                  <td className="py-2.5">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-warning/15 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 text-muted-foreground">{u.lastLogin}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: any;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft p-5">
      <div className="flex items-center justify-between">
        <span className="h-9 w-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs text-success font-medium">{trend}</span>
      </div>
      <div className="mt-4 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
