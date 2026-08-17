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
     
      className="absolute inset-0 h-full w-full border-0 bg-white"
    />
  );
}
