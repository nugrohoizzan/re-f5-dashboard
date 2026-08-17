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
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMopAnnotation } from "@/actions/mop";

type Point = { x: number; y: number };

type Stroke =
  | { id: string; type: "path"; color: string; points: Point[] }
  | { id: string; type: "rect"; color: string; x: number; y: number; w: number; h: number }
  | { id: string; type: "circle"; color: string; x: number; y: number; w: number; h: number }
  | { id: string; type: "arrow"; color: string; x1: number; y1: number; x2: number; y2: number }
  | { id: string; type: "text"; color: string; x: number; y: number; text: string };

type Tool = "select" | "pen" | "rect" | "circle" | "arrow" | "text";

const COLORS = ["#DC2626", "#18181B", "#2563EB", "#16A34A", "#F59E0B"];
const PAGE_GAP = 12;
const MAX_PAGE_WIDTH = 1200;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const CONTROLS_HIDE_DELAY = 1800; // ms tanpa gerakan sebelum tombol zoom disembunyikan

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface PageSlot {
  pageNumber: number;
  top: number;
  width: number;
  height: number;
  wrapper: HTMLDivElement;
  canvas: HTMLCanvasElement;
  rendered: boolean;
  rendering: boolean;
}

export function MopPdfAnnotator({
  mopId,
  fileUrl,
  initialData,
  readOnly = false,
}: {
  mopId: number;
  fileUrl: string;
  initialData: string;
  readOnly?: boolean;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contentWrapperRef = React.useRef<HTMLDivElement>(null);
  const pagesContainerRef = React.useRef<HTMLDivElement>(null);
  const annotationCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const pdfDocRef = React.useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const slotsRef = React.useRef<PageSlot[]>([]);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const scaleRef = React.useRef(1);

  const [contentSize, setContentSize] = React.useState({ width: 0, height: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // --- Zoom ---
  const [zoom, setZoom] = React.useState(1);
  const zoomRef = React.useRef(1); 
  const renderedZoomRef = React.useRef(1); 
  const zoomGenRef = React.useRef(0); 
  const pinchStateRef = React.useRef<{ startDist: number; liveZoom: number } | null>(null);

  const commitZoom = React.useCallback(async (target: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, target));
    const myGen = ++zoomGenRef.current;
    zoomRef.current = clamped;
    setZoom(clamped);

    if (contentWrapperRef.current) {
      contentWrapperRef.current.style.transformOrigin = "top center";
      contentWrapperRef.current.style.transform = `scale(${clamped / renderedZoomRef.current})`;
    }

    await renderPdfRef.current?.();

    if (zoomGenRef.current !== myGen) return; 
    renderedZoomRef.current = clamped;
    if (contentWrapperRef.current) contentWrapperRef.current.style.transform = "";
  }, []);

  const zoomIn = () => commitZoom(zoomRef.current + ZOOM_STEP);
  const zoomOut = () => commitZoom(zoomRef.current - ZOOM_STEP);
  const zoomReset = () => commitZoom(1);

  // --- Kontrol zoom otomatis muncul/hilang ---
  const [controlsVisible, setControlsVisible] = React.useState(false);
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = React.useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY);
  }, []);

  const keepControlsVisible = React.useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setControlsVisible(true);
  }, []);

  React.useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const [strokes, setStrokes] = React.useState<Stroke[]>(() => {
    try {
      const parsed = JSON.parse(initialData || "[]");
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

  const drawingRef = React.useRef<{ start: Point; current: Stroke | null }>({
    start: { x: 0, y: 0 },
    current: null,
  });
  const [liveStroke, setLiveStroke] = React.useState<Stroke | null>(null);
  const [textInput, setTextInput] = React.useState<{ x: number; y: number } | null>(null);
  const [textValue, setTextValue] = React.useState("");

  const renderSinglePage = React.useCallback(async (slot: PageSlot) => {
    if (slot.rendered || slot.rendering) return;
    const pdf = pdfDocRef.current;
    if (!pdf) return;
    slot.rendering = true;
    try {
      const page = await pdf.getPage(slot.pageNumber);
      const viewport = page.getViewport({ scale: scaleRef.current });
      const canvas = slot.canvas;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        slot.rendered = true;
        slot.wrapper.classList.remove("bg-zinc-300", "animate-pulse");
      }
    } catch (err) {
      console.error(`Gagal render halaman ${slot.pageNumber}`, err);
    } finally {
      slot.rendering = false;
    }
  }, []);

  const renderPdf = React.useCallback(async () => {
    const scrollEl = scrollRef.current;
    const pagesEl = pagesContainerRef.current;
    if (!scrollEl || !pagesEl) return;

    setError(null);
    observerRef.current?.disconnect();
    slotsRef.current = [];

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      if (!pdfDocRef.current) {
        const loadingTask = pdfjsLib.getDocument(fileUrl);
        pdfDocRef.current = await loadingTask.promise;
      }
      const pdf = pdfDocRef.current;
      const numPages = pdf.numPages;

      const containerWidth = scrollEl.clientWidth || 800;
      const firstPage = await pdf.getPage(1);
      const unscaled = firstPage.getViewport({ scale: 1 });
      const baseWidth = Math.min(containerWidth, MAX_PAGE_WIDTH);
      const targetWidth = baseWidth * zoomRef.current;
      const scale = Math.max(targetWidth / unscaled.width, 0.1);
      scaleRef.current = scale;

      pagesEl.innerHTML = "";
      let top = 0;
      let maxWidth = 0;
      const slots: PageSlot[] = [];

      for (let n = 1; n <= numPages; n++) {
        const page = n === 1 ? firstPage : await pdf.getPage(n);
        const viewport = page.getViewport({ scale });

        const wrapper = document.createElement("div");
        wrapper.className = "bg-zinc-300 animate-pulse";
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.style.marginBottom = `${PAGE_GAP}px`;
        wrapper.style.boxShadow = "0 1px 3px rgba(0,0,0,0.15)";

        const canvas = document.createElement("canvas");
        canvas.style.display = "block";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        wrapper.appendChild(canvas);
        pagesEl.appendChild(wrapper);

        slots.push({
          pageNumber: n,
          top,
          width: viewport.width,
          height: viewport.height,
          wrapper,
          canvas,
          rendered: false,
          rendering: false,
        });

        top += viewport.height + PAGE_GAP;
        maxWidth = Math.max(maxWidth, viewport.width);
      }

      slotsRef.current = slots;
      setContentSize({ width: maxWidth, height: Math.max(top - PAGE_GAP, 0) });
      setLoading(false);

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const idx = Number((entry.target as HTMLElement).dataset.pageIndex);
            const slot = slotsRef.current[idx];
            if (slot) {
              renderSinglePage(slot);
              observer.unobserve(entry.target);
            }
          }
        },
        { root: scrollEl, rootMargin: "600px 0px", threshold: 0 }
      );

      slots.forEach((slot, idx) => {
        slot.wrapper.dataset.pageIndex = String(idx);
        observer.observe(slot.wrapper);
      });
      observerRef.current = observer;

      const visibleSlot = slots.find((s) => s.top < scrollEl.scrollTop + scrollEl.clientHeight + 600);
      if (visibleSlot) {
        await renderSinglePage(visibleSlot);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } catch (err) {
      console.error(err);
      setError("Gagal memuat pratinjau PDF.");
      setLoading(false);
    }
  }, [fileUrl, renderSinglePage]);

  const renderPdfRef = React.useRef(renderPdf);
  React.useEffect(() => {
    renderPdfRef.current = renderPdf;
  }, [renderPdf]);

  React.useEffect(() => {
    renderPdf().then(() => {
      renderedZoomRef.current = zoomRef.current;
    });
    let timeout: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        renderPdf().then(() => {
          renderedZoomRef.current = zoomRef.current;
        });
      }, 300);
    });
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => {
      clearTimeout(timeout);
      ro.disconnect();
      observerRef.current?.disconnect();
    };
    
  }, [renderPdf]);

  React.useEffect(() => {
    return () => {
      pdfDocRef.current?.destroy?.();
      pdfDocRef.current = null;
    };
  }, []);

  // --- Pinch-to-zoom (dua jari) ---
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function dist(touches: TouchList) {
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2 && tool === "select") {
        pinchStateRef.current = { startDist: dist(e.touches), liveZoom: zoomRef.current };
        showControls();
      }
    }

    function onTouchMove(e: TouchEvent) {
      const pinch = pinchStateRef.current;
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const ratio = dist(e.touches) / pinch.startDist;
        const live = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, renderedZoomRef.current * ratio));
        pinch.liveZoom = live;
        setZoom(live);
        if (contentWrapperRef.current) {
          contentWrapperRef.current.style.transformOrigin = "top center";
          contentWrapperRef.current.style.transform = `scale(${live / renderedZoomRef.current})`;
        }
      }
    }

    function onTouchEnd() {
      const pinch = pinchStateRef.current;
      if (pinch) {
        pinchStateRef.current = null;

        commitZoom(pinch.liveZoom);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [tool, commitZoom, showControls]);

  const redrawAnnotations = React.useCallback(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas || contentSize.width === 0) return;
    canvas.width = contentSize.width;
    canvas.height = contentSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, contentSize.width, contentSize.height);

    const all = liveStroke ? [...strokes, liveStroke] : strokes;
    for (const s of all) {
      if (!s) continue;
      drawStroke(ctx, s, contentSize.width, contentSize.height);
    }
  }, [strokes, liveStroke, contentSize]);

  React.useEffect(() => {
    redrawAnnotations();
  }, [redrawAnnotations]);

  function relPoint(e: React.PointerEvent): Point {
    const rect = annotationCanvasRef.current!.getBoundingClientRect();
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
    <div className="flex h-full flex-col">
      {!readOnly && (
        <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-md border border-zinc-200 bg-white p-1.5 shadow-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-1">
            <ToolButton icon={MousePointer2} active={tool === "select"} onClick={() => setTool("select")} label="Pilih" />
            <ToolButton icon={Pencil} active={tool === "pen"} onClick={() => setTool("pen")} label="Pena" />
            <ToolButton icon={Type} active={tool === "text"} onClick={() => setTool("text")} label="Teks" />
            <ToolButton icon={Square} active={tool === "rect"} onClick={() => setTool("rect")} label="Kotak" />
            <ToolButton icon={Circle} active={tool === "circle"} onClick={() => setTool("circle")} label="Lingkaran" />
            <ToolButton icon={ArrowUpRight} active={tool === "arrow"} onClick={() => setTool("arrow")} label="Panah" />
          </div>

          <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" />

          <div className="flex shrink-0 items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 shrink-0 rounded-full border-2 transition-transform duration-150 hover:scale-110",
                  color === c ? "scale-110 border-zinc-900" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                aria-label={`Warna ${c}`}
              />
            ))}
          </div>

          <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" />

          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={strokes.length === 0} className="shrink-0">
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Undo</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={strokes.length === 0} className="shrink-0">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Bersihkan</span>
          </Button>
          <div className="min-w-2 flex-1" />
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !dirty} className="shrink-0">
            <Save className="h-4 w-4" />
            {saving ? "Menyimpan..." : "Simpan Coretan"}
          </Button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="relative min-w-0 flex-1 overflow-auto rounded-md bg-zinc-800"
        onPointerMove={showControls}
        onPointerDown={showControls}
      >
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 bg-zinc-800/90 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat pratinjau PDF...
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-4 text-center text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Kontrol zoom — tersembunyi default, muncul saat cursor bergerak /
            layar disentuh di dalam area preview, otomatis hilang lagi kalau
            tidak ada aktivitas. Tidak ikut hilang saat cursor di atas
            kontrol ini sendiri. */}
        <div
          className={cn(
            "sticky top-3 z-20 float-right mr-3 flex items-center gap-0.5 rounded-md border border-zinc-700 bg-zinc-900/90 p-1 shadow-lg backdrop-blur-sm transition-opacity duration-300",
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onPointerEnter={keepControlsVisible}
          onPointerLeave={showControls}
        >
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-30"
            aria-label="Perkecil"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-11 select-none text-center text-xs font-medium text-zinc-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-30"
            aria-label="Perbesar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-5 w-px bg-zinc-700" />
          <button
            onClick={zoomReset}
            disabled={zoom === 1}
            className="focus-ring flex h-7 w-7 items-center justify-center rounded text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-30"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="py-3">
          <div
            ref={contentWrapperRef}
            className="relative mx-auto"
            style={{ width: contentSize.width || undefined, height: contentSize.height || undefined }}
          >
            <div ref={pagesContainerRef} />

            <canvas
              ref={annotationCanvasRef}
              className={cn(
                "absolute inset-0",
                !readOnly && tool !== "select" ? "touch-none cursor-crosshair" : "touch-pan-y touch-pan-x"
              )}
              style={{ width: contentSize.width, height: contentSize.height }}
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
        "focus-ring flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150",
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