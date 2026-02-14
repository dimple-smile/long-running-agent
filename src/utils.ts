/**
 * 纯函数工具模块 - 可独立测试
 */

import type { Feature, FeaturesData } from './commands.js';

/**
 * 更新元数据
 */
export function updateMetadata(features: Feature[]): FeaturesData['metadata'] {
  const total = features.length;
  const completed = features.filter(f => f.passes).length;

  const byPriority: Record<string, { total: number; completed: number }> = {};
  const byCategory: Record<string, { total: number; completed: number }> = {};

  for (const f of features) {
    // 按优先级
    const p = f.priority || 'medium';
    byPriority[p] = byPriority[p] || { total: 0, completed: 0 };
    byPriority[p].total++;
    if (f.passes) byPriority[p].completed++;

    // 按类别
    const c = f.category || 'functional';
    byCategory[c] = byCategory[c] || { total: 0, completed: 0 };
    byCategory[c].total++;
    if (f.passes) byCategory[c].completed++;
  }

  return {
    total_features: total,
    completed_features: completed,
    completion_percentage: total > 0 ? Math.round(completed / total * 100 * 100) / 100 : 0,
    by_priority: byPriority,
    by_category: byCategory
  };
}

/**
 * 获取下一个待处理的功能（按优先级排序）
 */
export function getNextPendingFeature(features: Feature[]): Feature | null {
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const pending = features.filter(f => !f.passes);
  if (pending.length === 0) return null;

  pending.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    return pa - pb;
  });

  return pending[0];
}

/**
 * 生成功能 ID
 */
export function generateFeatureId(index: number): string {
  return `feat-${String(index).padStart(3, '0')}`;
}

/**
 * 生成项目 ID
 */
export function generateProjectId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

/**
 * 过滤功能列表
 */
export function filterFeatures(
  features: Feature[],
  options: { filter?: string; priority?: string }
): Feature[] {
  let result = [...features];

  if (options.filter === 'pending') {
    result = result.filter(f => !f.passes);
  } else if (options.filter === 'done') {
    result = result.filter(f => f.passes);
  }

  if (options.priority) {
    result = result.filter(f => f.priority === options.priority);
  }

  return result;
}

/**
 * 创建默认功能对象
 */
export function createFeature(
  id: string,
  description: string,
  options: {
    category?: string;
    priority?: Feature['priority'];
    steps?: string[];
  } = {}
): Feature {
  return {
    id,
    category: options.category || 'functional',
    priority: options.priority || 'medium',
    description,
    steps: options.steps || [],
    acceptance_criteria: [],
    dependencies: [],
    status: 'pending',
    passes: false,
    attempts: 0,
    notes: ''
  };
}

/**
 * 创建默认项目数据
 */
export function createFeaturesData(
  projectName: string,
  projectType: string = 'web'
): FeaturesData {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    project_id: generateProjectId(projectName),
    project_name: projectName,
    project_type: projectType,
    created_at: now,
    updated_at: now,
    features: [],
    metadata: {
      total_features: 0,
      completed_features: 0,
      completion_percentage: 0,
      by_priority: {},
      by_category: {}
    },
    sessions: []
  };
}

/**
 * 标记功能为完成
 */
export function markFeatureComplete(
  feature: Feature,
  notes?: string
): Feature {
  return {
    ...feature,
    passes: true,
    status: 'completed',
    completed_at: new Date().toISOString(),
    attempts: feature.attempts + 1,
    notes: notes || feature.notes
  };
}
