"use client";

export function MopFileViewer({ fileUrl, fileType }: { fileUrl: string; fileType: string }) {
  const src =
    fileType === "docx"
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
      : fileUrl;

  return (
    <iframe
      src={src}
      title="Pratinjau MOP"
      // Absolute + inset-0 dipin langsung ke box parent yang `relative`,
      // supaya ukurannya nggak bergantung pada chain height% yang gampang
      // "collapse" kalau ada ancestor grid/flex yang auto-height.
      className="absolute inset-0 h-full w-full border-0 bg-white"
    />
  );
}
