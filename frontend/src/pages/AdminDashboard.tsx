import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportCharts } from "@/components/charts/ReportCharts";
import { Ship, Box, AlertTriangle, TrendingUp, MoveRight } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalContenedores: 0,
    totalClientes: 0,
    peligrosaCount: 0,
    movimientosHoy: 0,
  });
  const [estadoDist, setEstadoDist] = useState<{ nombre: string; color: string; cantidad: number }[]>([]);
  const [tiposIso, setTiposIso] = useState<{ tipo: string; cantidad: number }[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/contenedores"),
      api.get("/clientes"),
      api.get("/reportes/estados-distribucion"),
      api.get("/reportes/tipos-iso"),
      api.get("/reportes/peligrosa"),
    ]).then(([contRes, cliRes, estRes, isoRes, pelRes]) => {
      const conts = contRes.data;
      setStats({
        totalContenedores: conts.length,
        totalClientes: cliRes.data.length,
        peligrosaCount: conts.filter((c: any) => c.mercancia_peligrosa).length,
        movimientosHoy: 0,
      });
      setEstadoDist(estRes.data);
      setTiposIso(isoRes.data);
    });
  }, []);

  const cards = [
    { icon: Ship, label: "Contenedores", value: stats.totalContenedores, color: "text-blue-400" },
    { icon: Box, label: "Clientes", value: stats.totalClientes, color: "text-green-400" },
    { icon: AlertTriangle, label: "Peligrosos", value: stats.peligrosaCount, color: "text-orange-400" },
    { icon: TrendingUp, label: "Movimientos hoy", value: "-", color: "text-purple-400" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Panel de Administración</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <card.icon className={`h-8 w-8 ${card.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCharts
          type="bar"
          title="Distribución por Estado"
          data={estadoDist.map((e) => ({ name: e.nombre, value: e.cantidad, color: e.color }))}
        />
        <ReportCharts
          type="pie"
          title="Tipos ISO"
          data={tiposIso.map((t) => ({ name: t.tipo, value: t.cantidad }))}
        />
      </div>
    </div>
  );
}
