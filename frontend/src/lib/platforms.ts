export const PLATFORMS = ['linkedin', 'x', 'reddit', 'framer', 'medium', 'instagram'] as const
export type Platform = typeof PLATFORMS[number]
