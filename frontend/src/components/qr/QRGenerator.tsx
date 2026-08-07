import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Props {
  matricula: string;
  size?: number;
}

export function QRGenerator({ matricula, size = 200 }: Props) {
  const svgRef = useRef<HTMLDivElement>(null);
  const qrValue = `eml://contenedor/${matricula}`;

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current.querySelector("svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${matricula}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={svgRef} className="rounded-lg bg-white p-4">
        <QRCodeSVG value={qrValue} size={size} level="M" />
      </div>
      <p className="text-xs text-muted-foreground">{matricula}</p>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Download className="mr-2 h-3 w-3" />
        Descargar QR
      </Button>
    </div>
  );
}
