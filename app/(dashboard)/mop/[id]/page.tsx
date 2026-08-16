import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { mops, mopNotes, mopAnnotations, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { StatusBadge } from "@/components/status-badge";
import { MopFileViewer } from "@/components/mop-file-viewer";
import { MopAnnotationCanvas } from "@/components/mop-annotation-canvas";
import { MopPdfAnnotator } from "@/components/mop-pdf-annotator";
import { MopNotesPanel } from "@/components/mop-notes-panel";
import { MopEditDialog, MopDeleteButton, MopDownloadButton, MopStatusButton } from "@/components/mop-actions";
import { ArrowLeft } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";

export default async function MopDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const session = await auth();
  const canReview = session?.user?.role === "admin" || session?.user?.role === "team_leader";

  const [mop] = await db.select().from(mops).where(eq(mops.id, id)).limit(1);
  if (!mop) notFound();

  const [annotation, notesRaw, uploader, reviewer] = await Promise.all([
    db.select().from(mopAnnotations).where(eq(mopAnnotations.mopId, id)).limit(1),
    db
      .select({
        id: mopNotes.id,
        mopId: mopNotes.mopId,
        note: mopNotes.note,
        createdBy: mopNotes.createdBy,
        createdAt: mopNotes.createdAt,
        authorName: users.name,
      })
      .from(mopNotes)
      .leftJoin(users, eq(mopNotes.createdBy, users.id))
      .where(eq(mopNotes.mopId, id))
      .orderBy(asc(mopNotes.createdAt)),
    mop.uploadedBy
      ? db.select().from(users).where(eq(users.id, mop.uploadedBy)).limit(1)
      : Promise.resolve([]),
    mop.reviewedBy
      ? db.select().from(users).where(eq(users.id, mop.reviewedBy)).limit(1)
      : Promise.resolve([]),
  ]);

  return (
    <div className="page-enter flex flex-col gap-4 lg:h-[calc(100vh-8rem)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/mop"
            className="focus-ring mb-1 inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke daftar MOP
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-900 sm:text-lg">{mop.title}</h1>
            <StatusBadge status={mop.status} />
          </div>
          <p className="text-xs text-zinc-400">
            {mop.scrCode && <span className="font-mono">{mop.scrCode}</span>}
            {mop.scrCode && mop.requestedBy && " · "}
            {mop.requestedBy && `Diminta oleh ${mop.requestedBy}`}
            {" · "}Diunggah {uploader[0]?.name ?? "—"} pada {formatTimestamp(mop.createdAt)}
            {mop.status === "selesai_review" && reviewer[0] && (
              <> · Direview {reviewer[0].name}</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MopDownloadButton fileUrl={mop.fileUrl} fileName={mop.fileName} />
          <MopEditDialog mop={mop} />
          {canReview && (
            <>
              <MopStatusButton id={mop.id} status={mop.status} />
              <MopDeleteButton id={mop.id} />
            </>
          )}
        </div>
      </div>

      {/*
        `lg:grid-rows-1` = grid-template-rows: repeat(1, minmax(0, 1fr)).
        Tanpa ini, baris grid default "auto" TIDAK ikut meregang mengisi
        tinggi parent (beda dari flexbox) — jadi kolom preview di bawah
        tidak pernah dapat tinggi piksel yang pasti, dan iframe/canvas di
        dalamnya ikut salah ukur. Di mobile dikasih tinggi tetap (70vh)
        supaya tetap punya area preview yang jelas & halaman bisa discroll
        normal alih-alih dipaksa muat dalam viewport.
      */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:min-h-0 lg:grid-rows-1 lg:grid-cols-[1fr_320px]">
        {mop.fileType === "pdf" ? (
          // PDF: dirender sendiri lewat pdf.js (bukan iframe viewer bawaan
          // browser) supaya layer coretan hidup di sistem koordinat yang
          // sama dengan halaman dokumen, dan ikut ter-scroll bersamaan.
          <div className="min-h-0 min-w-0 h-[75vh] rounded-lg border border-zinc-200 bg-zinc-100 lg:h-full">
            <MopPdfAnnotator
              mopId={mop.id}
              fileUrl={mop.fileUrl}
              initialData={annotation[0]?.data ?? "[]"}
            />
          </div>
        ) : (
          <div className="relative h-[70vh] min-h-[400px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 lg:h-full">
            <MopFileViewer fileUrl={mop.fileUrl} fileType={mop.fileType} />
            <div className="absolute inset-0 pointer-events-none">
              <MopAnnotationCanvas mopId={mop.id} initialData={annotation[0]?.data ?? "[]"} />
            </div>
          </div>
        )}

        <div className="min-h-0 rounded-lg border border-zinc-200 bg-white p-3 lg:overflow-y-auto">
          <MopNotesPanel mopId={mop.id} notes={notesRaw} canWrite={canReview} />
        </div>
      </div>
    </div>
  );
}
