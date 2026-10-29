import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, Loader2, Trash2, AlertCircle } from "lucide-react";
import { getHistory, deleteHistoryEntry, clearAllHistory, type HistoryEntry } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Logs & History — SignovateAI" },
      { name: "description", content: "Review your past translations, devices used, and detected signs." },
    ],
  }),
  component: () => (
    <AppShell>
      <LogsPage />
    </AppShell>
  ),
});

function LogsPage() {
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState("all");
  const [logs, setLogs] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getHistory(200);
      setLogs(res);
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (device !== "all" && l.device !== device) return false;
      if (query) {
        const searchLower = query.toLowerCase();
        return (
          l.detected_sign.toLowerCase().includes(searchLower) ||
          l.output_text.toLowerCase().includes(searchLower) ||
          l.device.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [logs, device, query]);

  const devices = Array.from(new Set(logs.map((l) => l.device)));

  const exportCsv = () => {
    const rows = [
      ["Timestamp", "Device", "Sign", "Confidence", "Output"],
      ...filtered.map((l) => [
        new Date(l.created_at).toISOString(),
        l.device,
        l.detected_sign,
        l.confidence,
        l.output_text,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signovateai-logs.csv";
    a.click();
    toast.success("CSV exported successfully");
  };

  const deleteEntry = async (id: string) => {
    try {
      console.log('Deleting entry with ID:', id);
      await deleteHistoryEntry(id);
      setLogs(prev => prev.filter(l => l.id !== id));
      toast.success("Log entry deleted");
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete entry");
    }
  };

  const clearAll = async () => {
    try {
      const result = await clearAllHistory();
      setLogs([]);
      setShowClearDialog(false);
      toast.success(`Cleared ${result.count} log entries`);
    } catch (error: any) {
      toast.error(error.message || "Failed to clear history");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="font-display text-xl font-bold">Logs & history</h2>
          <p className="text-sm text-muted-foreground">All your past translation events from the last 7 days.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setShowClearDialog(true)}
            disabled={logs.length === 0}
            className="flex-1 sm:flex-none text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Clear All
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0} className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[220px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search signs, output, or device..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All devices</option>
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} events</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary-soft flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg">No history yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Start using the Live Translate feature to see your gesture detection history here.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          {/* Mobile view: Cards */}
          <div className="md:hidden divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No results found for "{query}"
              </div>
            ) : (
              filtered.map((l) => (
                <div key={l.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary truncate text-base">{l.detected_sign}</span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          l.confidence >= 95
                            ? "bg-success/15 text-success"
                            : l.confidence >= 90
                            ? "bg-primary-soft text-primary"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {l.confidence.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <span>{new Date(l.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span>·</span>
                      <span className="truncate">{l.device}</span>
                      {l.output_text && (
                        <>
                          <span>·</span>
                          <span className="truncate">{l.output_text}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEntry(l.id)}
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Desktop view: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Device</th>
                  <th className="px-4 py-2">Sign</th>
                  <th className="px-4 py-2">Confidence</th>
                  <th className="px-4 py-2">Output</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No results found for "{query}"
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.device}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary">{l.detected_sign}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            l.confidence >= 95
                              ? "bg-success/15 text-success"
                              : l.confidence >= 90
                              ? "bg-primary-soft text-primary"
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {l.confidence.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.output_text}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteEntry(l.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {logs.length} log entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
