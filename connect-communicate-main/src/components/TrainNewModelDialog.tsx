import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Upload,
  FileText,
  Image as ImageIcon,
  Video,
  Hand,
  Camera,
  Cpu,
  Loader2,
  Check,
  X,
  Download,
  Sparkles,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getStatus, uploadTrainingData, updateTrainLabels, startTraining as apiStartTraining, getTrainStatus, type ModelCard } from "@/lib/api";

type SourceTab = "images";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (model: { name: string; type: string; accuracy: number }) => void;
  retrainModel?: ModelCard | null;
}

const OPEN_SOURCE_RESULTS = [
  { id: "mp", name: "google/mediapipe-hands", source: "HuggingFace", accuracy: 91.0, desc: "Hand landmark detection" },
  { id: "mnist", name: "sign-language-mnist", source: "TensorFlow Hub", accuracy: 88.4, desc: "ASL alphabet classifier" },
  { id: "asl", name: "asl-alphabet-recognition", source: "HuggingFace", accuracy: 93.7, desc: "Real-time ASL letters" },
];

export function TrainNewModelDialog({ open, onOpenChange, onCreated, retrainModel }: Props) {
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState<SourceTab>("images");

  // Tab 3 - Images & Zip (REAL BACKEND)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<{ labels: Record<string, number>, total: number } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [explicitLabel, setExplicitLabel] = useState("");

  // Step 2 - Config
  const [modelName, setModelName] = useState(retrainModel?.name || "");
  const [modelType, setModelType] = useState(retrainModel?.type.toLowerCase() || "alphabet");

  useEffect(() => {
    if (open && retrainModel) {
      setModelName(retrainModel.name);
      setModelType(retrainModel.type.toLowerCase());
    }
  }, [open, retrainModel]);
  const [epochs, setEpochs] = useState(20);
  const [valSplit, setValSplit] = useState([20]);
  const [device, setDevice] = useState("camera");
  const [freshStart, setFreshStart] = useState(false);

  // Step 3 - Training
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const reset = () => {
    setStep(1);
    setTab("images");
    setSessionId(null);
    setDatasetInfo(null);
    setIsUploading(false);
    setExplicitLabel("");
    setModelName("");
    setModelType("alphabet");
    setEpochs(20);
    setValSplit([20]);
    setDevice("camera");
    setFreshStart(false);
    setTraining(false);
    setProgress(0);
    setLogs([]);
    setDone(false);
  };

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };



  const [renamingLabels, setRenamingLabels] = useState<Record<string, string>>({});
  const [isUpdatingLabels, setIsUpdatingLabels] = useState(false);

  const handleDatasetDrop = async (files: File[]) => {
    if (!files || files.length === 0) {
      toast.error("No valid image files found in the selection.");
      return;
    }
    setIsUploading(true);
    toast.info(`Uploading ${files.length} file(s)...`);
    try {
      const res = await uploadTrainingData(
        files, 
        explicitLabel.trim() ? explicitLabel.trim() : undefined,
        sessionId || undefined // Pass existing session if available
      );
      if (res.error) throw new Error(res.error);
      setSessionId(res.session);
      setDatasetInfo({ labels: res.labels, total: res.total_images });
      // Initialize renaming state: map current labels to themselves
      const initialRenaming: Record<string, string> = {};
      Object.keys(res.labels).forEach(l => initialRenaming[l] = l);
      setRenamingLabels(initialRenaming);
      
      toast.success(`Uploaded successfully! Found ${res.total_images} images across ${Object.keys(res.labels).length} labels.`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const saveLabels = async () => {
    if (!sessionId) return;
    
    // Find what actually changed
    const changes: Record<string, string> = {};
    let hasChanges = false;
    Object.entries(renamingLabels).forEach(([oldName, newName]) => {
      if (oldName !== newName && newName.trim()) {
        changes[oldName] = newName.trim();
        hasChanges = true;
      }
    });

    if (!hasChanges) {
      setStep(2);
      return;
    }

    setIsUpdatingLabels(true);
    try {
      const res = await updateTrainLabels(sessionId, changes);
      if (res.error) throw new Error(res.error);
      setDatasetInfo({ labels: res.labels, total: res.total_images });
      
      const updatedRenaming: Record<string, string> = {};
      Object.keys(res.labels).forEach(l => updatedRenaming[l] = l);
      setRenamingLabels(updatedRenaming);
      
      toast.success("Labels updated successfully");
      setStep(2);
    } catch (err: any) {
      toast.error("Failed to update labels: " + err.message);
    } finally {
      setIsUpdatingLabels(false);
    }
  };



  // Real Training Effect
  useEffect(() => {
    if (!training || done) return;
    const id = setInterval(async () => {
      try {
        const status = await getTrainStatus();
        if (status.status === "error") {
          toast.error("Training error: " + status.message);
          clearInterval(id);
          setTraining(false);
          return;
        }
        
        setProgress(status.progress);
        if (status.logs && status.logs.length > 0) {
           setLogs(status.logs);
        }
        
        if (status.status === "done") {
          clearInterval(id);
          setTraining(false);
          setDone(true);
          onCreated?.({ name: modelName || "Custom Model", type: modelType, accuracy: status.accuracy });
        }
      } catch (err) {
        console.error("Poll failed", err);
      }
    }, 1500);
    return () => clearInterval(id);
  }, [training, done, modelName, modelType, onCreated]);

  const startTrainingSequence = async () => {
    if (!sessionId && tab === "images") {
       toast.error("Please upload dataset first");
       return;
    }
    setProgress(0);
    setLogs(["Starting background training process..."]);
    setTraining(true);
    setDone(false);
    
    if (tab === "images" && sessionId) {
      try {
        const res = await apiStartTraining(sessionId, {
          test_size: valSplit[0] / 100,
          n_estimators: 300,
          fresh: freshStart,
        });
        if (res.error) {
           toast.error(res.error);
           setTraining(false);
        }
      } catch(err: any) {
        toast.error(err.message || "Failed to start training");
        setTraining(false);
      }
    } else {
      // Fake start for non-implemented tabs
      const id = setInterval(() => {
        setDone(true);
        setTraining(false);
        clearInterval(id);
        onCreated?.({ name: modelName || "Mock Model", type: modelType, accuracy: 88.5 });
      }, 3000);
    }
  };

  const sourceReady = !!sessionId;

  const StepDots = () => (
    <div className="flex items-center justify-center gap-2 mb-1">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            "h-2 rounded-full transition-all",
            s === step ? "w-10 bg-primary" : s < step ? "w-2.5 bg-primary/60" : "w-2.5 bg-muted",
          )}
        />
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{retrainModel ? `Retrain: ${retrainModel.name}` : "Train a New Model"}</DialogTitle>
          <DialogDescription>
            {retrainModel 
              ? `Update ${retrainModel.name} with more gesture data.` 
              : `Step ${step} of 3 — ${["Choose Training Source", "Model Config", "Review & Train"][step - 1]}`}
          </DialogDescription>
        </DialogHeader>

        <StepDots />

        {/* STEP 1 — Source */}
        {step === 1 && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as SourceTab)} className="mt-2">
            <TabsList className="grid grid-cols-1 w-full h-auto">
              <TabsTrigger value="images" className="flex flex-col gap-1 py-2 text-xs"><ImageIcon className="h-4 w-4" /> Images / ZIP</TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="space-y-3 mt-4">
              <div className="bg-muted/30 p-3 rounded-lg text-sm mb-4 border border-border">
                <p className="font-medium mb-1 text-primary">Pro Tip: Select the Parent Folder</p>
                <p className="text-muted-foreground text-xs mb-3">
                  To upload multiple gestures at once, click "Upload Folder" and select the **main folder** 
                  (like "train") that contains your labeled sub-folders.
                </p>
                
                <p className="font-medium mb-1">Option 2: Add one by one</p>
                <p className="text-muted-foreground text-xs mb-2">Upload a single folder, then click "Add More" to add another one.</p>
                <Input 
                  value={explicitLabel} 
                  onChange={(e) => setExplicitLabel(e.target.value)} 
                  placeholder="Label for loose images (Optional if uploading folder)" 
                  className="h-8"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <DropZone
                  accept="image/*"
                  directory
                  onFiles={handleDatasetDrop}
                  title={isUploading ? "Uploading..." : (sessionId ? "Add More Folder" : "Upload Folder")}
                  subtitle="Select directory"
                  icon={isUploading ? <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" /> : <FolderOpen className="h-7 w-7 text-muted-foreground" />}
                />
                <DropZone
                  accept="image/*,.zip"
                  multiple
                  onFiles={handleDatasetDrop}
                  title={isUploading ? "Uploading..." : (sessionId ? "Add More Files" : "Drop Files/ZIP")}
                  subtitle="Images or ZIP"
                  icon={isUploading ? <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />}
                />
              </div>

              {sessionId && (
                <div className="flex justify-center pt-2">
                  <Button variant="ghost" size="sm" onClick={reset} className="text-destructive hover:text-destructive">
                    <X className="h-4 w-4 mr-1" /> Start Over / Clear All
                  </Button>
                </div>
              )}
              {datasetInfo && (
                <div className="mt-4 rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-muted/50 text-xs font-medium flex items-center justify-between">
                    <span>Dataset Preview</span>
                    <span className="text-primary font-bold">{datasetInfo.total} total images</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Detected Label</th>
                          <th className="text-right px-3 py-2 font-medium">Images Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(datasetInfo.labels).map(([label, count]) => (
                          <tr key={label} className="border-t border-border">
                            <td className="px-3 py-1">
                              <Input 
                                value={renamingLabels[label] ?? label}
                                onChange={(e) => setRenamingLabels(prev => ({ ...prev, [label]: e.target.value }))}
                                className="h-7 text-xs font-bold bg-background/50"
                              />
                            </td>
                            <td className="px-3 py-1 text-right text-muted-foreground">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* STEP 2 — Config */}
        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div>
              <Label>Model name</Label>
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g. ASL Alphabet v3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Model type</Label>
                <Select value={modelType} onValueChange={setModelType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alphabet">Alphabet</SelectItem>
                    <SelectItem value="phrases">Phrases</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target device</Label>
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camera"><span className="inline-flex items-center gap-2"><Camera className="h-3.5 w-3.5" /> Camera</span></SelectItem>
                    <SelectItem value="gloves"><span className="inline-flex items-center gap-2"><Hand className="h-3.5 w-3.5" /> Gloves</span></SelectItem>
                    <SelectItem value="nova"><span className="inline-flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /> NOVA Device</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Epochs (Trees in Forest)</Label>
              <Input type="number" min={1} max={500} value={epochs} onChange={(e) => setEpochs(Math.max(1, Number(e.target.value) || 1))} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label>Validation split</Label>
                <span className="text-sm font-medium">{valSplit[0]}%</span>
              </div>
              <Slider 
                value={valSplit} 
                onValueChange={setValSplit} 
                max={50} 
                min={0}
                step={5} 
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Direct (0%)</span>
                <span>Max (50%)</span>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/40 transition">
              <input
                type="checkbox"
                checked={freshStart}
                onChange={(e) => setFreshStart(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Fresh start (replace existing data)</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  By default, every upload is merged with previously-trained gestures so
                  the model accumulates knowledge over time. Tick this to wipe the
                  persistent training folder first and train{' '}
                  <span className="font-medium">only on this upload</span>. Useful when
                  earlier uploads contained bad data.
                </div>
              </div>
            </label>
          </div>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Source", "Images/ZIP Dataset"],
                    ["Model name", modelName || "Untitled Model"],
                    ["Model type", modelType],
                    ["Epochs", String(epochs)],
                    ["Validation split", `${valSplit[0]}%`],
                    ["Target device", device],
                    ["Training data", freshStart ? "Fresh — only this upload" : "Merged with previous uploads"],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground w-1/3">{k}</td>
                      <td className="px-3 py-2 font-medium capitalize">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!training && !done && (
              <Button onClick={startTrainingSequence} className="w-full">
                <Sparkles className="h-4 w-4 mr-2" /> Start Training
              </Button>
            )}

            {(training || done) && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{done ? "Complete" : "Training in progress"}</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", done ? "bg-success" : "bg-primary")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-[oklch(0.18_0.02_260)] text-[oklch(0.95_0.02_140)] font-mono text-xs p-3 space-y-1 max-h-48 overflow-y-auto">
                  {logs.map((line, i) => <div key={i}>{line}</div>)}
                  {training && <div className="animate-pulse">▌</div>}
                </div>
                {done && (
                  <Button variant="outline" className="w-full" onClick={() => close(false)}>
                    <Check className="h-4 w-4 mr-2" /> Done
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer nav */}
        <div className="flex items-center justify-between pt-3 border-t border-border mt-3">
          <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
          <div className="flex gap-2">
            {step > 1 && !training && !done && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            )}
            {step < 3 && (
              <Button 
                onClick={step === 1 ? saveLabels : () => setStep(step + 1)} 
                disabled={(step === 1 && (!sourceReady || isUploading || isUpdatingLabels))}
              >
                {isUpdatingLabels && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DropZone({
  accept,
  multiple,
  directory,
  onFiles,
  title,
  subtitle,
  icon,
}: {
  accept: string;
  multiple?: boolean;
  directory?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to handle folder drops if supported, or just files
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const items = e.dataTransfer.items;
    if (items) {
      // Trying to get files from folders if dropped
      const files: File[] = [];
      const promises: Promise<void>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(new Promise((resolve) => {
            traverseFileTree(item, "", (f) => files.push(f), resolve);
          }));
        }
      }
      Promise.all(promises).then(() => onFiles(files));
    } else {
      onFiles(Array.from(e.dataTransfer.files));
    }
  };

  const traverseFileTree = (item: any, path: string, addFile: (f: File) => void, resolve: () => void) => {
    path = path || "";
    if (item.isFile) {
      item.file((file: File) => {
        // Create a new File object with the relative path preserved in a custom property
        // though browsers usually put it in webkitRelativePath for input[webkitdirectory]
        // for drops we can't easily set webkitRelativePath, but we can pass it along
        Object.defineProperty(file, 'webkitRelativePath', {
          value: path + item.name
        });
        addFile(file);
        resolve();
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries((entries: any[]) => {
        const entryPromises = entries.map(entry => 
          new Promise<void>(res => traverseFileTree(entry, path + item.name + "/", addFile, res))
        );
        Promise.all(entryPromises).then(() => resolve());
      });
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition",
        drag ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
      )}
    >
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
        {icon}
      </div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        {...(directory ? { webkitdirectory: "", directory: "" } as any : {})}
        className="hidden"
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
    </div>
  );
}
