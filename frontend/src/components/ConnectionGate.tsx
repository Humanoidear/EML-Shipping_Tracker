import { useState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WifiOff, RefreshCw, Save } from "lucide-react";
import { getApiUrl, setApiUrl, getDefaultServer, onConnectionError, clearConnectionError } from "@/lib/api";

export function ConnectionGate({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [serverUrl, setServerUrl] = useState(() => {
    const saved = localStorage.getItem("apiUrl");
    if (saved) return saved;
    return getDefaultServer();
  });

  const check = async () => {
    setConnected(null);
    try {
      const res = await fetch(`${getApiUrl()}/auth/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      setConnected(res.status < 500); // 401/403 means the server is up
    } catch {
      setConnected(false);
    }
  };

  // Initial check only.
  useEffect(() => {
    check();
  }, [attempt]);

  // If any API request fails due to connection, show the error screen.
  useEffect(() => {
    const unsubscribe = onConnectionError(() => setConnected(false));
    return unsubscribe;
  }, []);

  const handleRetry = () => {
    clearConnectionError();
    setAttempt((a) => a + 1);
  };

  const handleSaveAndCheck = () => {
    setApiUrl(serverUrl);
    clearConnectionError();
    setAttempt((a) => a + 1);
  };

  if (connected === false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex w-full max-w-md flex-col gap-5 rounded-lg border bg-card p-8 shadow-lg">
          <div className="flex flex-col items-center gap-3 text-center">
            <WifiOff className="h-12 w-12 text-destructive" />
            <h1 className="text-xl font-bold">No se pudo conectar al servidor</h1>
            <p className="text-sm text-muted-foreground">
              No se encontró el servidor. Comprueba la dirección y vuelve a intentarlo.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="server-url" className="text-xs">Dirección del servidor</Label>
            <Input
              id="server-url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://servidor:5050"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSaveAndCheck}>
              <Save className="mr-2 h-4 w-4" />
              Guardar y conectar
            </Button>
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (connected === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Conectando al servidor…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
