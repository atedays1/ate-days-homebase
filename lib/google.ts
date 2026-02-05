// Server-side only Google Drive utilities
// This file should only be imported in API routes

import { google } from "googleapis"
import { 
  GOOGLE_MIME_TYPES, 
  EXPORT_MIME_MAP, 
  DownloadedFile,
  getGoogleFileTypeLabel 
} from "./google-types"

// Re-export types for convenience
export * from "./google-types"

export async function downloadDriveFile(
  fileId: string,
  accessToken: string,
  fileName: string,
  mimeType: string
): Promise<DownloadedFile> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: "v3", auth: oauth2Client })

  // Check if this is a Google Workspace file that needs export
  const exportMimeType = EXPORT_MIME_MAP[mimeType]

  let content: Buffer
  let finalMimeType: string
  let finalName: string

  if (exportMimeType) {
    // Export Google Workspace files (Docs, Sheets, Slides)
    const response = await drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: "arraybuffer" }
    )
    content = Buffer.from(response.data as ArrayBuffer)
    finalMimeType = exportMimeType

    // Update filename with correct extension
    const extension = exportMimeType === GOOGLE_MIME_TYPES.PDF ? ".pdf" : ".csv"
    finalName = fileName.replace(/\.[^/.]+$/, "") + extension
  } else {
    // Download regular files directly
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    )
    content = Buffer.from(response.data as ArrayBuffer)
    finalMimeType = mimeType
    finalName = fileName
  }

  return {
    content,
    mimeType: finalMimeType,
    name: finalName,
  }
}

export async function getFileMetadata(
  fileId: string,
  accessToken: string
): Promise<{ name: string; mimeType: string; size: number }> {
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: "v3", auth: oauth2Client })

  const response = await drive.files.get({
    fileId,
    fields: "name,mimeType,size",
  })

  return {
    name: response.data.name || "Unknown",
    mimeType: response.data.mimeType || "application/octet-stream",
    size: parseInt(response.data.size || "0", 10),
  }
}
