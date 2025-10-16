import { z } from 'zod';

// Schema for tracking invoice downloads
export const trackDownloadSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']).refine((val) => ['pdf', 'excel', 'csv'].includes(val), {
    message: 'Format must be pdf, excel, or csv'
  }),
  fileSize: z.number().optional().nullable(),
  success: z.boolean().default(true)
});

// Schema for bulk download requests
export const bulkDownloadSchema = z.object({
  invoiceIds: z.array(z.string()).min(1, {
    message: 'At least one invoice ID is required'
  }),
  format: z.enum(['pdf', 'excel', 'csv'])
});

// Schema for download history filters
export const downloadHistoryFilterSchema = z.object({
  format: z.enum(['pdf', 'excel', 'csv']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  success: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10)
});

// Schema for download statistics
export const downloadStatsSchema = z.object({
  productIds: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export type TrackDownloadInput = z.infer<typeof trackDownloadSchema>;
export type BulkDownloadInput = z.infer<typeof bulkDownloadSchema>;
export type DownloadHistoryFilterInput = z.infer<typeof downloadHistoryFilterSchema>;
export type DownloadStatsInput = z.infer<typeof downloadStatsSchema>;
