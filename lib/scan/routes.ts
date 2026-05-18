/** Physical master QR campaign id (intake attribution). */
export const MASTER_QR_SOURCE = "Master_QR" as const;

/** Smart gate — entry point encoded on the printed master QR. */
export const SCAN_PATH = "/scan" as const;

export const DOWNLOAD_APP_PATH = "/download-app" as const;

export const MASTER_QR_INTAKE_PATH = `/intake?src=${MASTER_QR_SOURCE}` as const;
