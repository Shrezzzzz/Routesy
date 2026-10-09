import { z } from 'zod';

export const CreateTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  description: z.string().optional(),
  startLocationName: z.string().optional(),
  startLatitude: z.number().optional(),
  startLongitude: z.number().optional(),
  endLocationName: z.string().optional(),
  endLatitude: z.number().optional(),
  endLongitude: z.number().optional(),
  travelMode: z.enum(['driving', 'walking', 'cycling']).default('driving'),
  routeMode: z.enum(['manual', 'optimized']).default('manual'),
});

export const UpdateTripSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  startLocationName: z.string().optional(),
  startLatitude: z.number().optional(),
  startLongitude: z.number().optional(),
  endLocationName: z.string().optional(),
  endLatitude: z.number().optional(),
  endLongitude: z.number().optional(),
  travelMode: z.enum(['driving', 'walking', 'cycling']).optional(),
  routeMode: z.enum(['manual', 'optimized']).optional(),
});

export type CreateTripInput = z.infer<typeof CreateTripSchema>;
export type UpdateTripInput = z.infer<typeof UpdateTripSchema>;
