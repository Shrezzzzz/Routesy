import { z } from 'zod';

export const CreateStopSchema = z.object({
  name: z.string().min(1, 'Stop name is required'),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  sequence: z.number().int().min(0),
  notes: z.string().optional(),
  category: z.string().optional(),
  estimatedVisitMinutes: z.number().int().min(0).optional(),
});

export const UpdateStopSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  sequence: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  estimatedVisitMinutes: z.number().int().min(0).optional(),
  visitedAt: z.string().datetime().optional(),
  skipped: z.boolean().optional(),
});

export const ReorderStopsSchema = z.array(
  z.object({
    id: z.string(),
    sequence: z.number().int().min(0),
  })
);

export type CreateStopInput = z.infer<typeof CreateStopSchema>;
export type UpdateStopInput = z.infer<typeof UpdateStopSchema>;
export type ReorderStopsInput = z.infer<typeof ReorderStopsSchema>;
