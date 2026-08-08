import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { Search } from "lucide-react";

interface GeoResult {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

export function LocationInput({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleInput = (text: string) => {
    setQuery(text);
    onChange(text);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!text.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/geocode/search", { params: { q: text } });
        setResults(res.data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const handleSelect = (r: GeoResult) => {
    setQuery(r.name);
    onChange(r.name, r.lat, r.lng);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={placeholder || "Buscar lugar en OpenStreetMap..."}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-accent"
              onClick={() => handleSelect(r)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      {searching && open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          Buscando...
        </div>
      )}
    </div>
  );
}
