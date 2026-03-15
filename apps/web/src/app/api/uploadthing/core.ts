import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  profileImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => ({ uploadedAt: Date.now() }))
    .onUploadComplete(({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
