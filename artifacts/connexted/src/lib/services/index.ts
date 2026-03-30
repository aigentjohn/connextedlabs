/**
 * Service Layer Index
 * 
 * Central export point for all services
 */

// Core services
export { journeyService, JourneyService } from './journeyService';
export { progressService, ProgressService } from './progressService';
export { analyticsService, AnalyticsService } from './analyticsService';

// Import/Export services
export { importService, ImportService } from './importService';
export { exportService, ExportService } from './exportService';
export { templateService, TemplateService } from './templateService';

// Schema and types
export * from '../schemas/containerSchema';

// Re-export common types
export type { ContainerType, ItemType } from './journeyService';
export type { ProgressData } from './progressService';
export type {
  ParticipantAnalytics,
  JourneyCompletionStats,
  OverallAnalytics
} from './analyticsService';
