"use client";

import { useState, type ChangeEvent } from "react";
import { attachFileToOpportunity, getUploadPresignedUrl } from "./storage-actions";

type AttachmentTrayProps = {
  opportunityId: string;
};

export function AttachmentTray({ opportunityId }: AttachmentTrayProps) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setStatus("Securing upload matrix channel...");

    try {
      const { url, path } = await getUploadPresignedUrl(
        file.name,
        opportunityId,
      );

      setStatus("Transferring binary data payload...");
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Cloud target rejected data blocks.");
      }

      await attachFileToOpportunity(opportunityId, path, file.name);
      setStatus("Upload successful!");
    } catch (err) {
      console.error("[ATTACHMENT_TRAY_FAILURE]", err);
      setStatus("Upload matrix failure. Retry configuration.");
    } finally {
      setUploading(false);
      e.target.value = "";
      window.setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-700/40 bg-slate-900/50 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
          Document Vault
        </span>
        {status ? (
          <span className="animate-pulse font-mono text-[10px] text-blue-400">
            {status}
          </span>
        ) : null}
      </div>

      <label
        className={`flex w-full cursor-pointer items-center justify-center rounded-lg border border-dashed py-2 text-xs font-semibold transition-all ${
          uploading
            ? "cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500"
            : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white"
        }`}
      >
        <input
          type="file"
          disabled={uploading}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        />
        {uploading ? "Uploading Attachment..." : "Attach Vault Document"}
      </label>
    </div>
  );
}
