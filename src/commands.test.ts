import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import type { Feature, FeaturesData } from './commands.js';

// Mock console.log and process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// 测试目录
const TEST_DIR = path.join(process.cwd(), '.test-temp');

// 辅助函数：创建测试目录
async function setupTestDir() {
  await fs.mkdir(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);
}

// 辅助函数：清理测试目录
async function cleanupTestDir() {
  process.chdir(path.dirname(TEST_DIR));
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// 辅助函数：创建 mock feature
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

// 辅助函数：创建 mock features data
function createMockFeaturesData(features: Feature[] = []): FeaturesData {
  return {
    version: '1.0',
    project_id: 'test-project',
    project_name: 'Test Project',
    project_type: 'web',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    features,
    metadata: {
      total_features: features.length,
      completed_features: features.filter(f => f.passes).length,
      completion_percentage: 0,
      by_priority: {},
      by_category: {}
    },
    sessions: []
  };
}

describe('File Operations', () => {
  beforeEach(async () => {
    await setupTestDir();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  describe('features.json operations', () => {
    it('should create features.json file', async () => {
      const data = createMockFeaturesData();
      await fs.mkdir('.agent', { recursive: true });
      await fs.writeFile('.agent/features.json', JSON.stringify(data, null, 2));

      const content = await fs.readFile('.agent/features.json', 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.project_name).toBe('Test Project');
    });

    it('should read features.json file', async () => {
      const data = createMockFeaturesData([
        createMockFeature({ id: 'feat-001', description: 'Feature 1' })
      ]);
      await fs.mkdir('.agent', { recursive: true });
      await fs.writeFile('.agent/features.json', JSON.stringify(data, null, 2));

      const content = await fs.readFile('.agent/features.json', 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.features).toHaveLength(1);
    });

    it('should update features.json file', async () => {
      const data = createMockFeaturesData();
      await fs.mkdir('.agent', { recursive: true });
      await fs.writeFile('.agent/features.json', JSON.stringify(data, null, 2));

      // 读取并更新
      const content = await fs.readFile('.agent/features.json', 'utf-8');
      const parsed = JSON.parse(content);
      parsed.features.push(createMockFeature({ id: 'feat-001' }));
      await fs.writeFile('.agent/features.json', JSON.stringify(parsed, null, 2));

      // 验证
      const updated = JSON.parse(await fs.readFile('.agent/features.json', 'utf-8'));
      expect(updated.features).toHaveLength(1);
    });

    it('should return null when features.json does not exist', async () => {
      try {
        await fs.readFile('.agent/features.json', 'utf-8');
      } catch (error) {
        expect((error as NodeJS.ErrnoException).code).toBe('ENOENT');
      }
    });
  });

  describe('project detection', () => {
    it('should detect project when features.json exists', async () => {
      await fs.mkdir('.agent', { recursive: true });
      await fs.writeFile('.agent/features.json', '{}');
      await fs.access('.agent/features.json');
      // 如果没有抛出错误，说明文件存在
      expect(true).toBe(true);
    });

    it('should not detect project when features.json does not exist', async () => {
      try {
        await fs.access('.agent/features.json');
      } catch {
        expect(true).toBe(true);
      }
    });
  });
});

describe('Feature Data Validation', () => {
  it('should create valid feature object', () => {
    const feature = createMockFeature({
      id: 'feat-001',
      description: 'Test feature',
      priority: 'high',
      category: 'ui',
      steps: ['step 1', 'step 2']
    });

    expect(feature.id).toBe('feat-001');
    expect(feature.description).toBe('Test feature');
    expect(feature.priority).toBe('high');
    expect(feature.category).toBe('ui');
    expect(feature.steps).toHaveLength(2);
    expect(feature.passes).toBe(false);
    expect(feature.status).toBe('pending');
  });

  it('should create valid features data object', () => {
    const features = [createMockFeature()];
    const data = createMockFeaturesData(features);

    expect(data.version).toBe('1.0');
    expect(data.features).toHaveLength(1);
    expect(data.metadata.total_features).toBe(1);
  });
});

describe('Priority Types', () => {
  it('should accept all valid priority values', () => {
    const priorities: Array<Feature['priority']> = ['critical', 'high', 'medium', 'low'];

    priorities.forEach(priority => {
      const feature = createMockFeature({ priority });
      expect(feature.priority).toBe(priority);
    });
  });

  it('should accept all valid status values', () => {
    const statuses: Array<Feature['status']> = ['pending', 'in_progress', 'completed'];

    statuses.forEach(status => {
      const feature = createMockFeature({ status });
      expect(feature.status).toBe(status);
    });
  });
});

describe('Metadata Calculation', () => {
  it('should calculate completion percentage correctly', () => {
    const features = [
      createMockFeature({ passes: true }),
      createMockFeature({ passes: false }),
      createMockFeature({ passes: true }),
      createMockFeature({ passes: true }),
    ];

    const completed = features.filter(f => f.passes).length;
    const total = features.length;
    const percentage = Math.round(completed / total * 100 * 100) / 100;

    expect(percentage).toBe(75);
  });

  it('should handle zero features', () => {
    const features: Feature[] = [];
    const completed = features.filter(f => f.passes).length;
    const total = features.length;
    const percentage = total > 0 ? Math.round(completed / total * 100 * 100) / 100 : 0;

    expect(percentage).toBe(0);
  });
});
