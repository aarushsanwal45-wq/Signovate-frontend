// API service layer for FastAPI backend communication

const API_BASE = '/api';

// ── Auth Token Management ──────────────────────────────────
function getAuthToken(): string | null {
  return localStorage.getItem('signovate_auth_token');
}

function setAuthToken(token: string): void {
  localStorage.setItem('signovate_auth_token', token);
}

function clearAuthToken(): void {
  localStorage.removeItem('signovate_auth_token');
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export interface LoginResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  error?: string;
}

export interface StatusResponse {
  authenticated: boolean;
  user?: string;
  user_email?: string;
  hardware?: boolean;
  classes?: string[];
}

export interface STTResponse {
  transcript?: string;
  error?: string;
}

export interface TTSResponse {
  audio_b64?: string;
  error?: string;
}

export interface GestureResponse {
  ok?: boolean;
  letter?: string;
  confidence?: number;
  error?: string;
}

export interface ModelCard {
  id: string;
  name: string;
  type: string;
  kind: 'alphabet' | 'phrases' | 'open-source' | 'custom';
  dataset: string;
  accuracy: number;
  status: 'active' | 'draft' | 'training';
  lastTrained: string;
  progress?: number;
  source?: string;
}

export interface HistoryEntry {
  id: string;
  created_at: string;
  device: string;
  detected_sign: string;
  confidence: number;
  output_text: string;
}

export interface HapticResponse {
  success?: boolean;
  error?: string;
}

// Authentication API
export async function login(email: string, password: string): Promise<LoginResponse & { token?: string }> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (data.success && data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function register(name: string, email: string, password: string): Promise<RegisterResponse & { token?: string }> {
  const response = await fetch(`${API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();
  if (data.success && data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function logout(): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: { ...authHeaders() },
    credentials: 'include',
  });
  clearAuthToken();
  const data = await response.json();
  return data;
}

export async function getStatus(): Promise<StatusResponse> {
  const response = await fetch(`${API_BASE}/status`, {
    headers: { ...authHeaders() },
    credentials: 'include',
  });
  const data = await response.json();
  return data;
}

// STT API
export async function transcribeAudio(audioBlob: Blob, lang: string = 'en-IN'): Promise<STTResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${API_BASE}/stt?lang=${lang}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await response.json();
  return data;
}

export async function sendSTTChunk(chunk: Blob, sessionId: string, lang: string = 'en-IN'): Promise<STTResponse> {
  const formData = new FormData();
  formData.append('chunk', chunk, 'chunk.webm');
  formData.append('session_id', sessionId);
  formData.append('lang', lang);

  const response = await fetch(`${API_BASE}/stt/stream`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  return response.json();
}

export async function stopSTTStream(sessionId: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/stt/stream/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ session_id: sessionId }),
  });
  return response.json();
}

// TTS API
export async function synthesizeSpeech(text: string, lang: string = 'en', gender: string = 'female', volume: number = 1.0): Promise<TTSResponse> {
  const response = await fetch(`${API_BASE}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ text, lang, gender, volume }),
  });
  const data = await response.json();
  return data;
}

// Gesture API
export async function predictGesture(imageBlob: Blob): Promise<GestureResponse> {
  const formData = new FormData();
  formData.append('image', imageBlob, 'frame.jpg');

  const response = await fetch(`${API_BASE}/gesture`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await response.json();
  return data;
}

// Haptic API
export async function triggerHaptic(signal: string): Promise<HapticResponse> {
  const response = await fetch(`${API_BASE}/haptic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ signal }),
  });
  const data = await response.json();
  return data;
}

// ── Training API ────────────────────────────────────────

export interface TrainUploadResponse {
  session: string;
  labels: Record<string, number>;
  total_images: number;
  error?: string;
}

export interface TrainPreviewResponse {
  session: string;
  labels: Record<string, number>;
  total_images: number;
  error?: string;
}

export interface TrainStatusResponse {
  status: 'idle' | 'extracting' | 'training' | 'done' | 'error';
  progress: number;
  message: string;
  accuracy: number;
  logs: string[];
  session: string | null;
  error?: string;
}

export async function uploadTrainingData(
  files: File[],
  label?: string,
  sessionId?: string,
): Promise<TrainUploadResponse> {
  const formData = new FormData();
  files.forEach((f) => {
    // Preserve relative path for folder uploads
    const path = (f as any).webkitRelativePath || f.name;
    formData.append('files', f, path);
  });
  if (label) formData.append('label', label);
  if (sessionId) formData.append('session_id', sessionId);

  console.log(`[api] Starting upload of ${files.length} files to ${API_BASE}/train/upload`);
  
  const response = await fetch(`${API_BASE}/train/upload`, {
    method: 'POST',
    // We remove credentials for the large upload to avoid extra preflight/security checks
    // that cause ERR_ACCESS_DENIED in some browsers
    body: formData,
  });
  return response.json();
}

export async function getTrainPreview(sessionId: string): Promise<TrainPreviewResponse> {
  const response = await fetch(`${API_BASE}/train/preview/${sessionId}`, {
    credentials: 'include',
  });
  return response.json();
}

export async function updateTrainLabels(
  sessionId: string,
  labelMap: Record<string, string>,
): Promise<TrainPreviewResponse> {
  const response = await fetch(`${API_BASE}/train/labels/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ label_map: labelMap }),
  });
  return response.json();
}

export async function startTraining(
  sessionId: string,
  config?: { test_size?: number; n_estimators?: number; fresh?: boolean },
): Promise<{ status: string; session: string; fresh?: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/train/start/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(config ?? {}),
  });
  return response.json();
}

export async function getTrainStatus(): Promise<TrainStatusResponse> {
  const response = await fetch(`${API_BASE}/train/status`, {
    credentials: 'include',
  });
  return response.json();
}

export async function getModels(): Promise<ModelCard[]> {
  const response = await fetch(`${API_BASE}/models`, {
    credentials: 'include',
  });
  return response.json();
}

export async function deleteModel(id: string): Promise<{ status: string; error?: string }> {
  const response = await fetch(`${API_BASE}/models/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.json();
}

export async function createModel(model: ModelCard): Promise<ModelCard | { error: string }> {
  const response = await fetch(`${API_BASE}/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(model),
  });
  return response.json();
}

export async function cancelTraining(): Promise<{ status: string; error?: string }> {
  const response = await fetch(`${API_BASE}/train/cancel`, {
    method: 'POST',
    credentials: 'include',
  });
  return response.json();
}

export async function getHistory(limit: number = 50): Promise<HistoryEntry[]> {
  const response = await fetch(`${API_BASE}/history?limit=${limit}`, {
    credentials: 'include',
  });
  return response.json();
}

export async function deleteHistoryEntry(id: string): Promise<{ status: string; id: string }> {
  console.log('API: Deleting history entry:', id);
  const response = await fetch(`${API_BASE}/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  console.log('API: Response status:', response.status);
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API: Error response:', error);
    const errorMessage = error.detail?.error || error.error || 'Failed to delete history entry';
    throw new Error(errorMessage);
  }
  
  const result = await response.json();
  console.log('API: Success response:', result);
  return result;
}

export async function clearAllHistory(): Promise<{ status: string; count: number }> {
  const response = await fetch(`${API_BASE}/history`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.error || 'Failed to clear history');
  }
  return response.json();
}

// ── Device Management API ────────────────────────────────────────

export interface Device {
  id: string;
  user_id: string;
  name: string;
  nickname?: string;
  device_type: string;
  connection_type: string;
  status: string;
  battery?: number;
  signal_strength?: number;
  last_seen: string;
  created_at: string;
}

export async function getDevices(): Promise<Device[]> {
  const response = await fetch(`${API_BASE}/devices`, {
    credentials: 'include',
  });
  return response.json();
}

export async function createDevice(device: {
  name: string;
  nickname?: string;
  device_type: string;
  connection_type: string;
  status?: string;
  battery?: number;
  signal_strength?: number;
}): Promise<Device> {
  const response = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(device),
  });
  return response.json();
}

export async function updateDevice(
  id: string,
  update: {
    status?: string;
    last_seen?: string;
    battery?: number;
    signal_strength?: number;
  }
): Promise<Device> {
  const response = await fetch(`${API_BASE}/devices/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(update),
  });
  return response.json();
}

export async function deleteDevice(id: string): Promise<{ status: string; id: string }> {
  const response = await fetch(`${API_BASE}/devices/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.json();
}

// ── Notifications API ────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export async function getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
  const response = await fetch(`${API_BASE}/notifications?unread_only=${unreadOnly}`, {
    credentials: 'include',
  });
  return response.json();
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const response = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'POST',
    credentials: 'include',
  });
  return response.json();
}

export async function markAllNotificationsRead(): Promise<{ status: string; count: number }> {
  const response = await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    credentials: 'include',
  });
  return response.json();
}

export async function deleteNotification(id: string): Promise<{ status: string; id: string }> {
  const response = await fetch(`${API_BASE}/notifications/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.json();
}

// ── Gesture Management API ────────────────────────────────────────

export interface TrainedGesture {
  name: string;
  sample_count: number;
  data_path: string;
}

export async function getTrainedGestures(): Promise<TrainedGesture[]> {
  const response = await fetch(`${API_BASE}/gestures`, {
    credentials: 'include',
  });
  return response.json();
}

export async function deleteGesture(gestureName: string): Promise<{
  status: string;
  gesture: string;
  images_removed: number;
  message: string;
}> {
  const response = await fetch(`${API_BASE}/gestures/${encodeURIComponent(gestureName)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.error || 'Failed to delete gesture');
  }
  return response.json();
}

export async function retrainAfterDeletion(): Promise<{
  status: string;
  session: string;
  message: string;
}> {
  const response = await fetch(`${API_BASE}/gestures/retrain`, {
    method: 'POST',
    credentials: 'include',
  });
  return response.json();
}

export async function getGestureCount(): Promise<{ count: number }> {
  const response = await fetch(`${API_BASE}/gestures/count`, {
    credentials: 'include',
  });
  return response.json();
}

export async function clearAllGestures(): Promise<{
  status: string;
  gestures_removed: number;
  message: string;
}> {
  const response = await fetch(`${API_BASE}/gestures`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return response.json();
}

// ── Forgot / Reset Password API ────────────────────────────────

export async function forgotPassword(email: string): Promise<{
  success: boolean;
  message?: string;
  otp?: string;
  error?: string;
}> {
  const response = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return response.json();
}

export async function resetPassword(email: string, otp: string, newPassword: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const response = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password: newPassword }),
  });
  return response.json();
}
