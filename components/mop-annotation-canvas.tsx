"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Pencil,
  Type,
  Square,
  Circle,
  ArrowUpRight,
  Undo2,
  Trash2,
  Save,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMopAnnotation } from "@/actions/mop";

type Point = { x: number; y: number }; // relative 0-1

type Stroke =
  | { id: string; type: "path"; color: string; points: Point[] }
  | { id: string; type: "rect"; color: string; x: number; y: number; w: number; h: number }
  | { id: string; type: "circle"; color: string; x: number; y: number; w: number; h: number }
  | { id: string; type: "arrow"; color: string; x1: number; y1: number; x2: number; y2: number }
  | { id: string; type: "text"; color: string; x: number; y: number; text: string };

type Tool = "select" | "pen" | "rect" | "circle" | "arrow" | "text";

const COLORS = ["#DC2626", "#18181B", "#2563EB", "#16A34A", "#F59E0B"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function MopAnnotationCanvas({
  mopId,
  initialData,
  readOnly = false,
}: {
  mopId: number;
  initialData: string;
  readOnly?: boolean;
}) {
  const [strokes, setStrokes] = React.useState<Stroke[]>(() => {
    try {
      const parsed = JSON.parse(initialData || "[]");
      // Data lama yang tersimpan mungkin punya elemen null/rusak — saring di
      // sini supaya tidak crash saat digambar, dan otomatis "sembuh" begitu
      // disimpan lagi lewat tombol "Simpan Coretan".
      return Array.isArray(parsed)
        ? parsed.filter((s): s is Stroke => !!s && typeof s === "object")
        : [];
    } catch {
      return [];
    }
  });
  const [tool, setTool] = React.useState<Tool>("select");
  const [color, setColor] = React.useState(COLORS[0]);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawingRef = React.useRef<{ start: Point; current: Stroke | null }>({
    start: { x: 0, y: 0 },
    current: null,
  });
  const [liveStroke, setLiveStroke] = React.useState<Stroke | null>(null);
  const [textInput, setTextInput] = React.useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = React.useState("");

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    const all = liveStroke ? [...strokes, liveStroke] : strokes;
    for (const s of all) {
      if (!s) continue; // guard terhadap elemen null/undefined yang lolos filter awal
      drawStroke(ctx, s, w, h);
    }
  }, [strokes, liveStroke]);

  React.useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  function relPoint(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (readOnly || tool === "select") return;
    const p = relPoint(e);

    if (tool === "text") {
      setTextInput(p);
      setTextValue("");
      return;
    }

    drawingRef.current.start = p;
    if (tool === "pen") {
      drawingRef.current.current = { id: uid(), type: "path", color, points: [p] };
    } else if (tool === "rect") {
      drawingRef.current.current = { id: uid(), type: "rect", color, x: p.x, y: p.y, w: 0, h: 0 };
    } else if (tool === "circle") {
      drawingRef.current.current = { id: uid(), type: "circle", color, x: p.x, y: p.y, w: 0, h: 0 };
    } else if (tool === "arrow") {
      drawingRef.current.current = { id: uid(), type: "arrow", color, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    }
    setLiveStroke(drawingRef.current.current);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (readOnly || !drawingRef.current.current) return;
    const p = relPoint(e);
    const cur = drawingRef.current.current;
    const start = drawingRef.current.start;

    if (cur.type === "path") {
      cur.points.push(p);
    } else if (cur.type === "rect" || cur.type === "circle") {
      cur.x = Math.min(start.x, p.x);
      cur.y = Math.min(start.y, p.y);
      cur.w = Math.abs(p.x - start.x);
      cur.h = Math.abs(p.y - start.y);
    } else if (cur.type === "arrow") {
      cur.x2 = p.x;
      cur.y2 = p.y;
    }
    setLiveStroke({ ...cur } as Stroke);
  }

  function handlePointerUp() {
    if (readOnly) return;
    const finished = drawingRef.current.current;
    if (!finished) return;
    setStrokes((s) => [...s, finished]);
    drawingRef.current.current = null;
    setLiveStroke(null);
    setDirty(true);
  }

  function commitText() {
    if (textInput && textValue.trim()) {
      setStrokes((s) => [
        ...s,
        { id: uid(), type: "text", color, x: textInput.x, y: textInput.y, text: textValue.trim() },
      ]);
      setDirty(true);
    }
    setTextInput(null);
    setTextValue("");
  }

  function handleUndo() {
    setStrokes((s) => s.slice(0, -1));
    setDirty(true);
  }

  function handleClear() {
    if (strokes.length === 0) return;
    if (!confirm("Hapus semua coretan pada dokumen ini?")) return;
    setStrokes([]);
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveMopAnnotation(mopId, JSON.stringify(strokes));
      toast.success("Coretan tersimpan.");
      setDirty(false);
    } catch {
      toast.error("Gagal menyimpan coretan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pointer-events-none flex h-full flex-col">
      {!readOnly && (
        <div className="pointer-events-auto mb-2 flex flex-wrap items-center gap-1 rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm">
          <ToolButton icon={MousePointer2} active={tool === "select"} onClick={() => setTool("select")} label="Pilih" />
          <ToolButton icon={Pencil} active={tool === "pen"} onClick={() => setTool("pen")} label="Pena" />
          <ToolButton icon={Type} active={tool === "text"} onClick={() => setTool("text")} label="Teks" />
          <ToolButton icon={Square} active={tool === "rect"} onClick={() => setTool("rect")} label="Kotak" />
          <ToolButton icon={Circle} active={tool === "circle"} onClick={() => setTool("circle")} label="Lingkaran" />
          <ToolButton icon={ArrowUpRight} active={tool === "arrow"} onClick={() => setTool("arrow")} label="Panah" />

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-transform duration-150 hover:scale-110",
                color === c ? "border-zinc-900 scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
              aria-label={`Warna ${c}`}
            />
          ))}

          <div className="mx-1 h-5 w-px bg-zinc-200" />

          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={strokes.length === 0}>
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={strokes.length === 0}>
            <Trash2 className="h-4 w-4" /> Bersihkan
          </Button>
          <div className="flex-1" />
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Coretan"}
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 overflow-hidden rounded-md",
          !readOnly && tool !== "select" ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
        )}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {textInput && (
          <div
            className="absolute z-10"
            style={{ left: `${textInput.x * 100}%`, top: `${textInput.y * 100}%` }}
          >
            <input
              autoFocus
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") {
                  setTextInput(null);
                  setTextValue("");
                }
              }}
              className="focus-ring rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-sm shadow-sm"
              style={{ color }}
              placeholder="Ketik..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "focus-ring flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150",
        active ? "bg-red-600 text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (s.type === "path") {
    if (s.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x * w, p.y * h);
    ctx.stroke();
  } else if (s.type === "rect") {
    ctx.strokeRect(s.x * w, s.y * h, s.w * w, s.h * h);
  } else if (s.type === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      (s.x + s.w / 2) * w,
      (s.y + s.h / 2) * h,
      Math.max((s.w / 2) * w, 1),
      Math.max((s.h / 2) * h, 1),
      0,
      0,
      2 * Math.PI
    );
    ctx.stroke();
  } else if (s.type === "arrow") {
    const x1 = s.x1 * w,
      y1 = s.y1 * h,
      x2 = s.x2 * w,
      y2 = s.y2 * h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  } else if (s.type === "text") {
    ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(s.text, s.x * w, s.y * h + 12);
  }
}