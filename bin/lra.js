#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import {
  initProject,
  showStatus,
  addFeature,
  getNextFeature,
  markDone,
  commitProgress,
  listFeatures,
  exportProject,
  runTest,
  verifyFeature
} from '../src/commands.js';

program
  .name('lra')
  .description('Long-Running Agent CLI - Manage complex projects across multiple AI sessions')
  .version('1.0.0');

// init - 初始化项目
program
  .command('init [name]')
  .description('Initialize a new long-running agent project')
  .option('-t, --type <type>', 'Project type (web, api, cli, library)', 'web')
  .option('-d, --dir <directory>', 'Target directory', '.')
  .action(async (name, options) => {
    await initProject(name, options);
  });

// status - 显示状态
program
  .command('status')
  .description('Show project status and progress')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    await showStatus(options);
  });

// add - 添加功能
program
  .command('add <description>')
  .description('Add a new feature to the project')
  .option('-p, --priority <priority>', 'Priority (critical, high, medium, low)', 'medium')
  .option('-c, --category <category>', 'Category (functional, style, performance, security)', 'functional')
  .option('-s, --steps <steps...>', 'Test steps')
  .action(async (description, options) => {
    await addFeature(description, options);
  });

// next - 获取下一个功能
program
  .command('next')
  .description('Get the next pending feature to work on')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    await getNextFeature(options);
  });

// done - 标记完成
program
  .command('done <feature-id>')
  .description('Mark a feature as completed')
  .option('-n, --notes <notes>', 'Notes about the completion')
  .action(async (featureId, options) => {
    await markDone(featureId, options);
  });

// commit - 提交进度
program
  .command('commit [feature-id]')
  .description('Commit progress to git')
  .option('-m, --message <message>', 'Commit message')
  .action(async (featureId, options) => {
    await commitProgress(featureId, options);
  });

// list - 列出功能
program
  .command('list')
  .description('List all features')
  .option('-f, --filter <filter>', 'Filter by status (pending, done, all)', 'all')
  .option('-p, --priority <priority>', 'Filter by priority')
  .action(async (options) => {
    await listFeatures(options);
  });

// export - 导出
program
  .command('export')
  .description('Export project state')
  .option('-o, --output <file>', 'Output file')
  .action(async (options) => {
    await exportProject(options);
  });

// test - 运行 E2E 测试
program
  .command('test [feature-id]')
  .description('Run E2E tests using Playwright')
  .option('-a, --all', 'Test all completed features')
  .option('-b, --base-url <url>', 'Base URL for testing', 'http://localhost:3000')
  .option('--no-headless', 'Run browser in visible mode')
  .action(async (featureId, options) => {
    const passed = await runTest(featureId, options);
    process.exit(passed ? 0 : 1);
  });

// verify - 验证功能（测试 + 标记完成）
program
  .command('verify <feature-id>')
  .description('Verify a feature with E2E test and mark as completed if passed')
  .option('-b, --base-url <url>', 'Base URL for testing', 'http://localhost:3000')
  .option('--no-headless', 'Run browser in visible mode')
  .option('-n, --notes <notes>', 'Notes about the completion')
  .action(async (featureId, options) => {
    const passed = await verifyFeature(featureId, options);
    process.exit(passed ? 0 : 1);
  });

// ui-review - UI 美学审查
program
  .command('ui-review')
  .description('Run UI aesthetics review with AI vision capabilities')
  .option('-b, --base-url <url>', 'Base URL for the application', 'http://localhost:3000')
  .option('-o, --output <dir>', 'Output directory for screenshots and report', './ui-review')
  .action(async (options) => {
    const { runUIReview } = await import('../src/ui-review.js');
    const result = await runUIReview(options.baseUrl, { outputDir: options.output });
    if (result.success) {
      console.log(chalk.green('\n✅ UI Review screenshots captured!'));
      console.log(chalk.gray(`   Output: ${result.outputDir}`));
    }
    process.exit(result.success ? 0 : 1);
  });

program.parse();
