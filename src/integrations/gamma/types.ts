export type GammaGenerationStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | string;

export type GammaGenerationCreateRequest = {
  inputText: string;

  title?: string;
  format?: "presentation" | "document" | "webpage" | "social" | string;
  themeId?: string;
  folderId?: string;
  numCards?: number;

  imageOptions?: {
    enabled?: boolean;
    model?: string;
    style?: string;
  };

  outputLanguage?: string;
};

export type GammaGenerationCreateResponse = {
  generationId?: string;
  id?: string;
  status?: GammaGenerationStatus;
  [k: string]: unknown;
};

export type GammaGenerationGetResponse = {
  generationId?: string;
  id?: string;
  status?: GammaGenerationStatus;

  files?: Array<{
    type?: "pptx" | "pdf" | "png" | "gslides" | string;
    url?: string;
  }>;

  fileUrls?: Record<string, string>;

  error?: { message?: string; code?: string } | string;

  [k: string]: unknown;
};
