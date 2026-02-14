import { describe, it, expect } from 'vitest';
import type { Feature } from './commands.js';
import {
  updateMetadata,
  getNextPendingFeature,
  generateFeatureId,
  generateProjectId,
  filterFeatures,
  createFeature,
  createFeaturesData,
  markFeatureComplete
} from './utils.js';

// 测试辅助函数
function createMockFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feat-001',
    category: 'functional',
    priority: 'medium',
    description: 'Test feature',
    steps: [],
    acceptance_criteria: [],
    dependencies: [],
    status: 'pending',
    passes: false,
    attempts: 0,
    notes: '',
    ...overrides
  };
}

describe('updateMetadata', () => {
  it('should return zero values for empty features', () => {
    const result = updateMetadata([]);
    expect(result.total_features).toBe(0);
    expect(result.completed_features).toBe(0);
    expect(result.completion_percentage).toBe(0);
  });

  it('should count completed features correctly', () => {
    const features = [
      createMockFeature({ id: 'feat-001', passes: true }),
      createMockFeature({ id: 'feat-002', passes: false }),
      createMockFeature({ id: 'feat-003', passes: true }),
    ];
    const result = updateMetadata(features);
    expect(result.total_features).toBe(3);
    expect(result.completed_features).toBe(2);
    expect(result.completion_percentage).toBe(66.67);
  });

  it('should group by priority correctly', () => {
    const features = [
      createMockFeature({ id: 'feat-001', priority: 'critical', passes: true }),
      createMockFeature({ id: 'feat-002', priority: 'critical', passes: false }),
      createMockFeature({ id: 'feat-003', priority: 'high', passes: true }),
    ];
    const result = updateMetadata(features);
    expect(result.by_priority.critical).toEqual({ total: 2, completed: 1 });
    expect(result.by_priority.high).toEqual({ total: 1, completed: 1 });
  });

  it('should group by category correctly', () => {
    const features = [
      createMockFeature({ id: 'feat-001', category: 'ui', passes: true }),
      createMockFeature({ id: 'feat-002', category: 'ui', passes: true }),
      createMockFeature({ id: 'feat-003', category: 'api', passes: false }),
    ];
    const result = updateMetadata(features);
    expect(result.by_category.ui).toEqual({ total: 2, completed: 2 });
    expect(result.by_category.api).toEqual({ total: 1, completed: 0 });
  });

  it('should handle 100% completion', () => {
    const features = [
      createMockFeature({ id: 'feat-001', passes: true }),
      createMockFeature({ id: 'feat-002', passes: true }),
    ];
    const result = updateMetadata(features);
    expect(result.completion_percentage).toBe(100);
  });

  it('should use default priority when not specified', () => {
    const feature = createMockFeature();
    delete (feature as any).priority;
    const result = updateMetadata([feature]);
    expect(result.by_priority.medium).toEqual({ total: 1, completed: 0 });
  });

  it('should use default category when not specified', () => {
    const feature = createMockFeature();
    delete (feature as any).category;
    const result = updateMetadata([feature]);
    expect(result.by_category.functional).toEqual({ total: 1, completed: 0 });
  });
});

describe('getNextPendingFeature', () => {
  it('should return null when all features are completed', () => {
    const features = [
      createMockFeature({ id: 'feat-001', passes: true }),
      createMockFeature({ id: 'feat-002', passes: true }),
    ];
    expect(getNextPendingFeature(features)).toBeNull();
  });

  it('should return null for empty features', () => {
    expect(getNextPendingFeature([])).toBeNull();
  });

  it('should return the only pending feature', () => {
    const features = [
      createMockFeature({ id: 'feat-001', passes: true }),
      createMockFeature({ id: 'feat-002', passes: false }),
    ];
    const result = getNextPendingFeature(features);
    expect(result?.id).toBe('feat-002');
  });

  it('should prioritize critical over other priorities', () => {
    const features = [
      createMockFeature({ id: 'feat-low', priority: 'low', passes: false }),
      createMockFeature({ id: 'feat-high', priority: 'high', passes: false }),
      createMockFeature({ id: 'feat-critical', priority: 'critical', passes: false }),
      createMockFeature({ id: 'feat-medium', priority: 'medium', passes: false }),
    ];
    const result = getNextPendingFeature(features);
    expect(result?.id).toBe('feat-critical');
  });

  it('should prioritize high over medium and low', () => {
    const features = [
      createMockFeature({ id: 'feat-low', priority: 'low', passes: false }),
      createMockFeature({ id: 'feat-high', priority: 'high', passes: false }),
      createMockFeature({ id: 'feat-medium', priority: 'medium', passes: false }),
    ];
    const result = getNextPendingFeature(features);
    expect(result?.id).toBe('feat-high');
  });

  it('should prioritize medium over low', () => {
    const features = [
      createMockFeature({ id: 'feat-low', priority: 'low', passes: false }),
      createMockFeature({ id: 'feat-medium', priority: 'medium', passes: false }),
    ];
    const result = getNextPendingFeature(features);
    expect(result?.id).toBe('feat-medium');
  });

  it('should skip completed features even if they have higher priority', () => {
    const features = [
      createMockFeature({ id: 'feat-critical-done', priority: 'critical', passes: true }),
      createMockFeature({ id: 'feat-low-pending', priority: 'low', passes: false }),
    ];
    const result = getNextPendingFeature(features);
    expect(result?.id).toBe('feat-low-pending');
  });

  it('should handle unknown priority as medium', () => {
    const features = [
      createMockFeature({ id: 'feat-low', priority: 'low', passes: false }),
      createMockFeature({ id: 'feat-unknown', priority: 'unknown' as any, passes: false }),
    ];
    const result = getNextPendingFeature(features);
    expect(result?.id).toBe('feat-unknown');
  });
});

describe('generateFeatureId', () => {
  it('should generate correct feature IDs', () => {
    const testCases = [
      { index: 1, expected: 'feat-001' },
      { index: 9, expected: 'feat-009' },
      { index: 10, expected: 'feat-010' },
      { index: 99, expected: 'feat-099' },
      { index: 100, expected: 'feat-100' },
      { index: 999, expected: 'feat-999' },
    ];

    for (const { index, expected } of testCases) {
      expect(generateFeatureId(index)).toBe(expected);
    }
  });
});

describe('generateProjectId', () => {
  it('should convert to lowercase', () => {
    expect(generateProjectId('MyProject')).toBe('myproject');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateProjectId('My Cool Project')).toBe('my-cool-project');
  });

  it('should replace special characters with hyphens', () => {
    expect(generateProjectId('Project@123!')).toBe('project-123-');
  });

  it('should replace underscore with hyphens', () => {
    expect(generateProjectId('test-project_v1')).toBe('test-project-v1');
  });
});

describe('filterFeatures', () => {
  const features = [
    createMockFeature({ id: 'feat-001', priority: 'high', passes: true }),
    createMockFeature({ id: 'feat-002', priority: 'low', passes: false }),
    createMockFeature({ id: 'feat-003', priority: 'high', passes: false }),
  ];

  it('should return all features when no filter', () => {
    const result = filterFeatures(features, {});
    expect(result).toHaveLength(3);
  });

  it('should filter pending features', () => {
    const result = filterFeatures(features, { filter: 'pending' });
    expect(result).toHaveLength(2);
    expect(result.every(f => !f.passes)).toBe(true);
  });

  it('should filter done features', () => {
    const result = filterFeatures(features, { filter: 'done' });
    expect(result).toHaveLength(1);
    expect(result.every(f => f.passes)).toBe(true);
  });

  it('should filter by priority', () => {
    const result = filterFeatures(features, { priority: 'high' });
    expect(result).toHaveLength(2);
    expect(result.every(f => f.priority === 'high')).toBe(true);
  });

  it('should combine filters', () => {
    const result = filterFeatures(features, { filter: 'pending', priority: 'high' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('feat-003');
  });
});

describe('createFeature', () => {
  it('should create feature with default values', () => {
    const feature = createFeature('feat-001', 'Test feature');
    expect(feature.id).toBe('feat-001');
    expect(feature.description).toBe('Test feature');
    expect(feature.category).toBe('functional');
    expect(feature.priority).toBe('medium');
    expect(feature.status).toBe('pending');
    expect(feature.passes).toBe(false);
  });

  it('should create feature with custom options', () => {
    const feature = createFeature('feat-001', 'Test feature', {
      category: 'ui',
      priority: 'critical',
      steps: ['step 1', 'step 2']
    });
    expect(feature.category).toBe('ui');
    expect(feature.priority).toBe('critical');
    expect(feature.steps).toHaveLength(2);
  });
});

describe('createFeaturesData', () => {
  it('should create valid features data', () => {
    const data = createFeaturesData('My Project', 'api');
    expect(data.project_name).toBe('My Project');
    expect(data.project_id).toBe('my-project');
    expect(data.project_type).toBe('api');
    expect(data.version).toBe('1.0');
    expect(data.features).toHaveLength(0);
    expect(data.metadata.total_features).toBe(0);
  });

  it('should default to web project type', () => {
    const data = createFeaturesData('Test');
    expect(data.project_type).toBe('web');
  });
});

describe('markFeatureComplete', () => {
  it('should mark feature as complete', () => {
    const feature = createFeature('feat-001', 'Test');
    const completed = markFeatureComplete(feature);
    expect(completed.passes).toBe(true);
    expect(completed.status).toBe('completed');
    expect(completed.completed_at).toBeDefined();
    expect(completed.attempts).toBe(1);
  });

  it('should add notes when provided', () => {
    const feature = createFeature('feat-001', 'Test');
    const completed = markFeatureComplete(feature, 'Done successfully');
    expect(completed.notes).toBe('Done successfully');
  });

  it('should preserve existing notes if no new notes', () => {
    const feature = createFeature('feat-001', 'Test');
    feature.notes = 'Existing note';
    const completed = markFeatureComplete(feature);
    expect(completed.notes).toBe('Existing note');
  });

  it('should increment attempts', () => {
    const feature = createFeature('feat-001', 'Test');
    feature.attempts = 2;
    const completed = markFeatureComplete(feature);
    expect(completed.attempts).toBe(3);
  });
});
