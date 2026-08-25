import type { Prisma } from "@/generated/prisma/client";

export function buildKycUploadPersistence(params: {
  fileUrl: string;
  messageSid: string;
}): Pick<Prisma.KycDocumentUncheckedCreateInput, "fileUrl" | "status" | "ocrData"> {
  return {
    fileUrl: params.fileUrl,
    status: "PENDING",
    ocrData: {
      source: {
        provider: "TWILIO",
        messageSid: params.messageSid,
      },
    },
  };
}
