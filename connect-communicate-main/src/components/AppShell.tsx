import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  Cpu,
  Video,
  Brain,
  ClipboardList,
  Settings,
  ShieldCheck,
  Bell,
  Search,
  LogOut,
  HelpCircle,
  Menu,
  Check,
  AlertCircle,
  Info,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/devices", label: "My Devices", icon: Cpu },
  { to: "/translate", label: "Live Translate", icon: Video },
  { to: "/models", label: "Model Library", icon: Brain },
  { to: "/logs", label: "Logs & History", icon: ClipboardList },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  // Load notifications
  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { getNotifications } = await import("@/lib/api");
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { markNotificationRead } = await import("@/lib/api");
      await markNotificationRead(id);
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { markAllNotificationsRead } = await import("@/lib/api");
      await markAllNotificationsRead();
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      const { deleteNotification } = await import("@/lib/api");
      await deleteNotification(id);
      loadNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const currentPath = routerState.location.pathname;
  const currentNav = NAV.find((n) => currentPath.startsWith(n.to));
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-border bg-sidebar-bg flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.2_260)] flex items-center justify-center text-primary-foreground font-bold text-sm shadow-soft">
            SV
          </div>
          <div>
            <div className="font-display font-bold text-base leading-none">SignovateAI</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">v1.0.0 · beta</div>
          </div>
        </div>

        <div className="mx-3 mt-4 mb-3 rounded-lg bg-card border border-border p-3 flex items-center gap-3 shadow-soft">
          <div className="h-9 w-9 rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user.name || user.email}
            </div>
            <span
              className={cn(
                "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5",
                role === "admin"
                  ? "bg-warning/15 text-warning-foreground"
                  : "bg-primary-soft text-primary"
              )}
            >
              {role === "admin" ? "Admin" : "User"}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {NAV.map((item) => {
            const active = currentPath.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {role === "admin" && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                currentPath.startsWith("/admin")
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-foreground/70 hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <button className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground/70 hover:bg-sidebar-accent">
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </button>
          <div className="px-3 text-[10px] text-muted-foreground">© 2026 SignovateAI. All rights reserved.</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-[260px] flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background border-b border-border flex items-center px-4 lg:px-6 gap-4">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display font-semibold text-lg">{currentNav?.label ?? "Dashboard"}</h1>

          <div className="flex-1 max-w-md ml-auto hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search..."
                className="w-full pl-9 pr-12 h-9 rounded-md bg-muted border border-transparent text-sm focus:outline-none focus:border-primary focus:bg-background"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-background border border-border px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto md:ml-0">

          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <button className="relative h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" collisionPadding={16} className="w-[calc(100vw-2rem)] sm:w-80 p-0 max-w-[calc(100vw-2rem)]">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 text-xs"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[60vh] sm:h-[400px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No notifications
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notif) => {
                      const Icon =
                        notif.type === "success"
                          ? Check
                          : notif.type === "warning"
                          ? AlertCircle
                          : Info;
                      const iconColor =
                        notif.type === "success"
                          ? "text-success"
                          : notif.type === "warning"
                          ? "text-warning-foreground"
                          : "text-primary";
                      
                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            "p-3 sm:p-4 hover:bg-muted/50 transition-colors",
                            !notif.read && "bg-primary-soft/30"
                          )}
                        >
                          <div className="flex gap-3">
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", 
                              notif.type === "success" ? "bg-success/15" :
                              notif.type === "warning" ? "bg-warning/15" :
                              "bg-primary-soft"
                            )}>
                              <Icon className={cn("h-4 w-4", iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm">{notif.title}</h4>
                                <button
                                  onClick={() => deleteNotif(notif.id)}
                                  className="text-muted-foreground hover:text-foreground shrink-0"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(notif.created_at).toLocaleString()}
                                </span>
                                {!notif.read && (
                                  <button
                                    onClick={() => markAsRead(notif.id)}
                                    className="text-[10px] text-primary hover:underline"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full bg-primary-soft text-primary font-semibold text-sm flex items-center justify-center hover:ring-2 hover:ring-primary/30">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-4 lg:p-6 min-w-0">{children}</main>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
