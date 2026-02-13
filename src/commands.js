/**
 * Long-Running Agent CLI Commands
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import Conf from 'conf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 配置存储
const config = new Conf({
  projectName: 'long-running-agent',
  defaults: {}
});

// 常量
const AGENT_DIR = '.agent';
const FEATURES_FILE = `${AGENT_DIR}/features.json`;
const PROGRESS_FILE = `${AGENT_DIR}/progress.md`;

/**
 * 检查是否在项目目录中
 */
async function checkProject() {
  try {
    await fs.access(FEATURES_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取 features.json
 */
async function readFeatures() {
  try {
    const content = await fs.readFile(FEATURES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 写入 features.json
 */
async function writeFeatures(data) {
  data.updated_at = new Date().toISOString();
  data.metadata = updateMetadata(data.features);
  await fs.writeFile(FEATURES_FILE, JSON.stringify(data, null, 2));
}

/**
 * 更新元数据
 */
function updateMetadata(features) {
  const total = features.length;
  const completed = features.filter(f => f.passes).length;

  const byPriority = {};
  const byCategory = {};

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
 * 初始化项目
 */
export async function initProject(name, options) {
  const targetDir = options.dir;
  const projectType = options.type;
  const projectName = name || path.basename(path.resolve(targetDir));

  const spinner = ora('Initializing project...').start();

  try {
    // 创建目录结构
    await fs.mkdir(path.join(targetDir, AGENT_DIR, 'sessions'), { recursive: true });

    // 创建 features.json
    const features = {
      version: '1.0',
      project_id: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      project_name: projectName,
      project_type: projectType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    await fs.writeFile(
      path.join(targetDir, FEATURES_FILE),
      JSON.stringify(features, null, 2)
    );

    // 创建 progress.md
    const progress = `# ${projectName} - 项目进度

## 基本信息
- 项目名称: ${projectName}
- 项目类型: ${projectType}
- 创建时间: ${new Date().toLocaleDateString('zh-CN')}
- 最后更新: ${new Date().toLocaleDateString('zh-CN')}

## 当前状态
- 进度: 0/0 (0%)
- 状态: 初始化
- 当前功能: 无
- 阻塞: 无

## 会话记录
_暂无会话记录_

## 功能清单

### ✅ 已完成 (0)
_暂无_

### 🔄 进行中 (0)
_暂无_

### ⏳ 待处理 (0)
_暂无_
`;

    await fs.writeFile(path.join(targetDir, PROGRESS_FILE), progress);

    // 创建 init.sh
    const initSh = generateInitScript(projectType);
    await fs.writeFile(path.join(targetDir, 'init.sh'), initSh);
    await fs.chmod(path.join(targetDir, 'init.sh'), 0o755);

    // 创建 .claude/CLAUDE.md
    await fs.mkdir(path.join(targetDir, '.claude'), { recursive: true });
    const claudeMd = generateClaudeMd(projectName);
    await fs.writeFile(path.join(targetDir, '.claude/CLAUDE.md'), claudeMd);

    // 创建 app_spec.txt 模板
    const appSpec = `# ${projectName} - 应用规格说明

## 概述
[描述你的应用]

## 核心功能
1. [功能 1]
2. [功能 2]
3. [功能 3]

## 技术栈
- 前端: [React/Vue/etc]
- 后端: [Node.js/Python/etc]
- 数据库: [PostgreSQL/MongoDB/etc]

## 非功能性需求
- 性能: [要求]
- 安全: [要求]
`;

    await fs.writeFile(path.join(targetDir, 'app_spec.txt'), appSpec);

    // 初始化 Git
    try {
      execSync('git init', { cwd: targetDir, stdio: 'pipe' });
      execSync('git add .', { cwd: targetDir, stdio: 'pipe' });
      execSync('git commit -m "Initial: project setup"', { cwd: targetDir, stdio: 'pipe' });
    } catch {
      // Git 可能已初始化
    }

    spinner.succeed('Project initialized!');

    console.log();
    console.log(chalk.bold('📁 Created files:'));
    console.log(`   ${AGENT_DIR}/features.json  - Feature list`);
    console.log(`   ${AGENT_DIR}/progress.md    - Progress tracking`);
    console.log(`   .claude/CLAUDE.md  - Claude Code instructions`);
    console.log(`   init.sh            - Startup script`);
    console.log(`   app_spec.txt       - Application specification`);
    console.log();
    console.log(chalk.bold('📝 Next steps:'));
    console.log('   1. Edit app_spec.txt to define your application');
    console.log('   2. Add features: npx @dimples/lra add "feature description"');
    console.log('   3. Check status: npx @dimples/lra status');

  } catch (error) {
    spinner.fail('Failed to initialize project');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * 显示状态
 */
export async function showStatus(options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    console.log('   Run: npx @dimples/lra init');
    process.exit(1);
  }

  const data = await readFeatures();
  if (!data) {
    console.log(chalk.red('❌ Cannot read features.json'));
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify({
      project_name: data.project_name,
      progress: {
        total: data.metadata.total_features,
        completed: data.metadata.completed_features,
        percentage: data.metadata.completion_percentage
      },
      next_feature: getNextPendingFeature(data.features)
    }, null, 2));
    return;
  }

  // 人类可读输出
  console.log();
  console.log(chalk.bold(`📊 ${data.project_name} - 项目状态`));
  console.log('═'.repeat(40));
  console.log(`├── 进度: ${data.metadata.completed_features}/${data.metadata.total_features} (${data.metadata.completion_percentage}%)`);

  const next = getNextPendingFeature(data.features);
  if (next) {
    console.log(`├── 下一个: ${chalk.cyan(next.id)} ${next.description}`);
  } else {
    console.log(`├── 下一个: ${chalk.green('全部完成!')}`);
  }
  console.log('└── 阻塞: 无');
  console.log();

  // 按优先级统计
  console.log(chalk.bold('📋 按优先级:'));
  for (const [priority, stats] of Object.entries(data.metadata.by_priority || {})) {
    const color = priority === 'critical' ? chalk.red :
                  priority === 'high' ? chalk.yellow :
                  priority === 'medium' ? chalk.blue : chalk.gray;
    console.log(`   ${color(priority)}: ${stats.completed}/${stats.total}`);
  }
  console.log();
}

/**
 * 添加功能
 */
export async function addFeature(description, options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    process.exit(1);
  }

  const data = await readFeatures();

  const newId = `feat-${String(data.features.length + 1).padStart(3, '0')}`;

  const feature = {
    id: newId,
    category: options.category || 'functional',
    priority: options.priority || 'medium',
    description: description,
    steps: options.steps || [],
    acceptance_criteria: [],
    dependencies: [],
    status: 'pending',
    passes: false,
    attempts: 0,
    notes: ''
  };

  data.features.push(feature);
  await writeFeatures(data);

  console.log(chalk.green(`✅ Added feature [${newId}]: ${description}`));
}

/**
 * 获取下一个功能
 */
export async function getNextFeature(options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    process.exit(1);
  }

  const data = await readFeatures();
  const next = getNextPendingFeature(data.features);

  if (!next) {
    console.log(chalk.green('🎉 All features completed!'));
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(next, null, 2));
  } else {
    console.log();
    console.log(chalk.bold(`🎯 Next Feature: ${chalk.cyan(next.id)}`));
    console.log('─'.repeat(40));
    console.log(`描述: ${next.description}`);
    console.log(`优先级: ${next.priority}`);
    console.log(`类别: ${next.category}`);
    if (next.steps && next.steps.length > 0) {
      console.log('测试步骤:');
      next.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    }
    console.log();
  }
}

function getNextPendingFeature(features) {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const pending = features.filter(f => !f.passes);
  if (pending.length === 0) return null;

  // Sort by priority (critical first, then high, medium, low)
  pending.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 2;
    const pb = priorityOrder[b.priority] ?? 2;
    return pa - pb;
  });

  return pending[0];
}

/**
 * 标记完成
 */
export async function markDone(featureId, options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    process.exit(1);
  }

  const data = await readFeatures();
  const feature = data.features.find(f => f.id === featureId);

  if (!feature) {
    console.log(chalk.red(`❌ Feature ${featureId} not found`));
    process.exit(1);
  }

  feature.passes = true;
  feature.status = 'completed';
  feature.completed_at = new Date().toISOString();
  feature.attempts++;
  if (options.notes) {
    feature.notes = options.notes;
  }

  await writeFeatures(data);

  console.log(chalk.green(`✅ Feature ${featureId} marked as completed`));
  console.log(`📊 Progress: ${data.metadata.completed_features}/${data.metadata.total_features} (${data.metadata.completion_percentage}%)`);
}

/**
 * 提交进度
 */
export async function commitProgress(featureId, options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    process.exit(1);
  }

  // 检查 Git
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
  } catch {
    console.log(chalk.yellow('⚠️  Not a git repository'));
    return;
  }

  // 生成提交消息
  let message = options.message;
  if (!message && featureId) {
    const data = await readFeatures();
    const feature = data.features.find(f => f.id === featureId);
    if (feature) {
      message = `feat: ${feature.description}`;
    }
  }
  if (!message) {
    message = `chore: update progress`;
  }

  try {
    execSync('git add -A', { stdio: 'pipe' });
    execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
    console.log(chalk.green(`✅ Committed: ${message}`));

    // 显示进度
    const data = await readFeatures();
    console.log(`📊 Progress: ${data.metadata.completed_features}/${data.metadata.total_features} (${data.metadata.completion_percentage}%)`);
  } catch (error) {
    console.log(chalk.yellow('⚠️  Nothing to commit'));
  }
}

/**
 * 列出功能
 */
export async function listFeatures(options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    process.exit(1);
  }

  const data = await readFeatures();
  let features = data.features;

  // 过滤
  if (options.filter === 'pending') {
    features = features.filter(f => !f.passes);
  } else if (options.filter === 'done') {
    features = features.filter(f => f.passes);
  }

  if (options.priority) {
    features = features.filter(f => f.priority === options.priority);
  }

  console.log();
  console.log(chalk.bold(`📋 Features (${features.length})`));
  console.log('─'.repeat(60));

  for (const f of features) {
    const status = f.passes ? chalk.green('✅') : chalk.yellow('⏳');
    const priority = f.priority === 'critical' ? chalk.red('[CRIT]') :
                     f.priority === 'high' ? chalk.yellow('[HIGH]') :
                     f.priority === 'medium' ? chalk.blue('[MED]') : chalk.gray('[LOW]');
    console.log(`${status} ${chalk.cyan(f.id)} ${priority} ${f.description}`);
  }
  console.log();
}

/**
 * 导出项目
 */
export async function exportProject(options) {
  if (!await checkProject()) {
    console.log(chalk.red('❌ Not an LRA project'));
    process.exit(1);
  }

  const data = await readFeatures();
  const outputFile = options.output || `export-${Date.now()}.json`;

  await fs.writeFile(outputFile, JSON.stringify(data, null, 2));
  console.log(chalk.green(`✅ Exported to ${outputFile}`));
}

/**
 * 生成 init.sh
 */
function generateInitScript(projectType) {
  switch (projectType) {
    case 'web':
      return `#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 Setting up web development environment..."

if [ -f "package.json" ]; then
    npm install
    npm run dev
else
    echo "⚠️  No package.json found"
    echo "Please run: npm init -y"
fi
`;

    case 'api':
      return `#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 Setting up API development environment..."

if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    python main.py
elif [ -f "package.json" ]; then
    npm install
    npm run dev
else
    echo "⚠️  No package.json or requirements.txt found"
fi
`;

    default:
      return `#!/bin/bash
cd "$(dirname "$0")"

echo "🔧 Setting up development environment..."
echo "Please customize this script for your project."
`;
  }
}

/**
 * 生成 .claude/CLAUDE.md
 */
function generateClaudeMd(projectName) {
  return `# ${projectName} - Claude Code 项目指令

本文件指导 Claude Code 如何在这个长运行项目中工作。

## 每次会话开始时

**必须执行的检查：**

\`\`\`bash
# 1. 确认目录
pwd

# 2. 读取功能列表
cat .agent/features.json

# 3. 读取进度
cat .agent/progress.md

# 4. 查看最近提交
git log --oneline -5

# 5. 获取下一个功能
npx @dimples/lra next
\`\`\`

## 工作流程

### 1. 选择功能
- 使用 \`npx @dimples/lra next\` 获取下一个待处理功能
- 一次**只处理一个**功能

### 2. 实现功能
- 编写代码
- 本地测试
- 端到端测试（浏览器自动化）

### 3. 标记完成
\`\`\`bash
npx @dimples/lra done feat-xxx
\`\`\`

### 4. 提交进度
\`\`\`bash
npx @dimples/lra commit feat-xxx
\`\`\`

### 5. 查看状态
\`\`\`bash
npx @dimples/lra status
\`\`\`

## 核心规则

1. **功能列表不可变**
   - ❌ 不能删除功能
   - ❌ 不能修改功能描述
   - ✅ 只能通过 \`done\` 命令标记完成

2. **增量进展**
   - 每次会话完成 1-3 个功能
   - 完成后再处理下一个

3. **验证优先**
   - 会话开始：验证核心功能
   - 功能完成：端到端测试

4. **状态同步**
   - 代码变更 → git commit
   - 功能完成 → features.json

## 会话结束检查

- [ ] 当前功能已测试通过
- [ ] \`npx long-running-agent done\` 已执行
- [ ] \`npx long-running-agent commit\` 已执行
- [ ] \`git status\` 干净

## 相关链接

- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
`;
}
