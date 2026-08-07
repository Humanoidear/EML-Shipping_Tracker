import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface Props {
  onScan: (matricula: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopScanner = async () => {
    if (stoppedRef.current || !scannerRef.current) return;
    stoppedRef.current = true;
    try {
      await scannerRef.current.stop();
    } catch {
      // scanner may already be stopped
    }
  };

  useEffect(() => {
    stoppedRef.current = false;
    const el = document.getElementById("qr-reader");
    if (!el) return;

    scannerRef.current = new Html5Qrcode("qr-reader");
    scannerRef.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const match = decodedText.match(/eml:\/\/contenedor\/(.+)/);
          if (match && !stoppedRef.current) {
            stopScanner();
            onScanRef.current(match[1]);
          }
        },
        () => {}
      )
      .catch(console.error);

    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Escanear QR</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div id="qr-reader" className="overflow-hidden rounded-md" />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Apunta la cámara al código QR del contenedor
        </p>
      </Card>
    </div>
  );
}
