import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SignovateAI" },
      { name: "description", content: "Manage your profile, devices, translation, and accessibility preferences." },
    ],
  }),
  component: () => (
    <AppShell>
      <SettingsPage />
    </AppShell>
  ),
});

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your SignovateAI experience.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto h-auto p-1 bg-muted rounded-lg gap-1 sm:gap-0">
          <TabsTrigger value="profile" className="whitespace-nowrap px-4">Profile</TabsTrigger>
          <TabsTrigger value="translation" className="whitespace-nowrap px-4">Translation</TabsTrigger>
          <TabsTrigger value="accessibility" className="whitespace-nowrap px-4">Accessibility</TabsTrigger>
          <TabsTrigger value="security" className="whitespace-nowrap px-4">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="bg-card rounded-xl border border-border p-4 sm:p-6 mt-4 space-y-4">
          <div>
            <Label>Email</Label>
            <Input defaultValue={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label>Full name</Label>
            <Input defaultValue={user?.name ?? ""} />
          </div>
          <Button>Save changes</Button>
        </TabsContent>

        <TabsContent value="translation" className="bg-card rounded-xl border border-border p-4 sm:p-6 mt-4 space-y-4">
          <div>
            <Label>Confidence threshold</Label>
            <Input type="range" min="0" max="100" defaultValue="75" />
          </div>
          <div>
            <Label>Output language</Label>
            <Input defaultValue="English (US)" />
          </div>
        </TabsContent>

        <TabsContent value="accessibility" className="bg-card rounded-xl border border-border p-4 sm:p-6 mt-4 space-y-4">
          <div>
            <Label>Font size scale</Label>
            <Input type="range" min="80" max="150" defaultValue="100" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hc" />
            <Label htmlFor="hc">High contrast mode</Label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="cb" />
            <Label htmlFor="cb">Color blind mode</Label>
          </div>
        </TabsContent>

        <TabsContent value="security" className="bg-card rounded-xl border border-border p-4 sm:p-6 mt-4 space-y-4">
          <Button variant="outline">Change password</Button>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="2fa" />
            <Label htmlFor="2fa">Enable two-factor authentication</Label>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
