/**
 * E2E Testing Module for Long-Running Agent
 *
 * 这是一个通用的E2E测试框架，不包含任何业务逻辑。
 * 它读取features.json中的测试步骤，然后调用AI来理解和执行这些步骤。
 *
 * AI会根据 skills/agent-browser.md 文档来生成具体的agent-browser命令。
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

/**
 * 检查 agent-browser 是否已安装
 */
function checkAgentBrowserInstalled() {
  try {
    execSync('which agent-browser', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 确保 agent-browser 已安装
 */
export function ensureAgentBrowserInstalled() {
  if (checkAgentBrowserInstalled()) {
    console.log(chalk.green('✅ agent-browser is installed'));
    return true;
  }

  console.log(chalk.yellow('\n⚠️  agent-browser is not installed!'));
  console.log(chalk.yellow('\nInstalling agent-browser...'));
  console.log();

  try {
    execSync('npm install -g agent-browser', { stdio: 'inherit' });
    console.log();
    console.log(chalk.green('✅ agent-browser installed successfully!'));

    // 安装浏览器
    console.log(chalk.yellow('\nDownloading browser...'));
    execSync('agent-browser install', { stdio: 'inherit' });

    return true;
  } catch (error) {
    console.log(chalk.red('\n❌ Failed to install agent-browser'));
    console.log(chalk.gray('\nPlease install manually:'));
    console.log('   npm install -g agent-browser');
    console.log('   agent-browser install');
    console.log();
    return false;
  }
}

/**
 * 执行 agent-browser 命令
 */
function runAgentBrowserCommand(args, options = {}) {
  try {
    const result = execSync(`agent-browser ${args}`, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
      timeout: options.timeout || 30000,
      env: { ...process.env, ...options.env }
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

/**
 * 获取浏览器快照（JSON 格式）
 */
async function getSnapshot() {
  const result = runAgentBrowserCommand('snapshot -i --json', { silent: true, timeout: 10000 });
  if (result.success && result.output) {
    try {
      const parsed = JSON.parse(result.output);
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 获取 agent-browser skill 文档内容
 * 这个文档告诉AI如何使用agent-browser
 */
function getAgentBrowserSkillContent() {
  const skillPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'skills', 'agent-browser.md');
  try {
    return fs.readFileSync(skillPath, 'utf-8');
  } catch {
    return `
# Agent Browser 基本命令

- 打开URL: agent-browser open <url> [--headed]
- 截图: agent-browser screenshot <file.png>
- 关闭: agent-browser close
- 获取快照: agent-browser snapshot --json
- 获取URL: agent-browser url
- 获取文本: agent-browser get text body

## 元素操作
- 通过placeholder查找: agent-browser find placeholder <text> fill <value>
- 通过role查找按钮: agent-browser find role button click --name <name>
- 通过文本查找: agent-browser find text <text> click
`;
  }
}

/**
 * 运行单个功能的 E2E 测试
 *
 * 这个函数是通用的，不包含任何业务逻辑。
 * 它只是：
 * 1. 打开浏览器
 * 2. 返回测试步骤供AI理解和执行
 * 3. 关闭浏览器
 *
 * 具体的测试执行应该由AI根据agent-browser skill文档来完成。
 */
export async function runFeatureTest(feature, options = {}) {
  const baseUrl = options.baseUrl || 'http://localhost:3000';
  // 默认使用有界面模式（headed），这样用户可以看到浏览器操作
  const headless = options.headless === true;

  console.log(chalk.bold(`\n🧪 Testing: ${chalk.cyan(feature.id)} - ${feature.description}`));
  console.log(chalk.gray(`   Base URL: ${baseUrl}`));
  console.log(chalk.gray(`   Headless: ${headless}`));
  console.log();

  // 检查 agent-browser
  if (!checkAgentBrowserInstalled()) {
    if (!ensureAgentBrowserInstalled()) {
      return {
        featureId: feature.id,
        description: feature.description,
        steps: [],
        passed: false,
        error: 'agent-browser is not installed',
        screenshots: []
      };
    }
  }

  const results = {
    featureId: feature.id,
    description: feature.description,
    steps: feature.steps || [],
    passed: false,
    error: null,
    screenshots: [],
    // 返回执行测试所需的信息，供AI使用
    testInfo: {
      baseUrl,
      headless,
      feature,
      agentBrowserSkill: getAgentBrowserSkillContent()
    }
  };

  try {
    // 打开浏览器
    console.log(chalk.gray('   Opening browser...'));
    const headedFlag = headless ? '' : '--headed';
    let openResult = runAgentBrowserCommand(`open ${baseUrl} ${headedFlag}`, { timeout: 15000 });

    if (!openResult.success) {
      // 如果失败，可能是之前的会话没有关闭
      runAgentBrowserCommand('close', { silent: true });
      openResult = runAgentBrowserCommand(`open ${baseUrl} ${headedFlag}`, { timeout: 15000 });
    }

    if (!openResult.success) {
      throw new Error(`Failed to open browser: ${openResult.error}`);
    }

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 返回测试信息，让AI来执行具体步骤
    console.log(chalk.cyan('\n📋 Test steps to execute:'));
    if (feature.steps && feature.steps.length > 0) {
      feature.steps.forEach((step, i) => {
        console.log(chalk.gray(`   ${i + 1}. ${step}`));
      });
    } else {
      console.log(chalk.yellow('   No test steps defined'));
    }

    console.log(chalk.cyan('\n📖 Agent-browser skill documentation is available in results.testInfo.agentBrowserSkill'));
    console.log(chalk.cyan('💡 AI should use this documentation to generate and execute agent-browser commands'));

    // 注意：这里我们返回了测试信息，但没有实际执行测试步骤
    // 实际的测试执行应该由调用方（AI）来完成
    // AI会：
    // 1. 读取 feature.steps
    // 2. 理解每个步骤的语义
    // 3. 根据 agentBrowserSkill 文档生成 agent-browser 命令
    // 4. 执行这些命令
    // 5. 验证结果

    results.passed = null; // null 表示需要AI来执行和判断
    results.message = 'Browser opened. AI should execute test steps using agent-browser commands.';

  } catch (error) {
    results.passed = false;
    results.error = error.message;
    console.log(chalk.red(`   ❌ Error: ${error.message}`));
  }

  // 注意：不在这里关闭浏览器，让AI完成测试后再关闭
  // runAgentBrowserCommand('close', { silent: true });

  return results;
}

/**
 * 关闭浏览器
 */
export function closeBrowser() {
  runAgentBrowserCommand('close', { silent: true });
}

/**
 * 执行单个 agent-browser 命令（供AI调用）
 */
export function execAgentBrowser(args, options = {}) {
  return runAgentBrowserCommand(args, options);
}

/**
 * 获取当前页面URL
 */
export async function getCurrentUrl() {
  const result = runAgentBrowserCommand('url', { silent: true, timeout: 5000 });
  return result.success ? result.output.trim() : null;
}

/**
 * 获取页面文本内容
 */
export async function getPageText() {
  const result = runAgentBrowserCommand('get text body', { silent: true, timeout: 5000 });
  return result.success ? result.output : null;
}

/**
 * 检查页面是否包含指定文本
 */
export async function pageContains(text) {
  const pageText = await getPageText();
  if (!pageText) return false;

  // 也检查快照
  const snapshot = await getSnapshot();
  const snapshotText = snapshot ? JSON.stringify(snapshot) : '';

  return pageText.includes(text) || snapshotText.includes(text);
}

/**
 * 截图
 */
export async function takeScreenshot(filePath) {
  const result = runAgentBrowserCommand(`screenshot ${filePath}`, { timeout: 10000 });
  return result.success;
}

/**
 * 等待指定毫秒
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 运行所有功能的测试
 */
export async function runAllTests(features, options = {}) {
  console.log(chalk.bold('\n🧪 Running E2E Tests for All Features\n'));
  console.log(chalk.gray('='.repeat(50)));

  // 确保 agent-browser 已安装
  if (!ensureAgentBrowserInstalled()) {
    return {
      total: features.length,
      passed: 0,
      failed: features.length,
      results: [],
      error: 'agent-browser is not installed'
    };
  }

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const feature of features) {
    if (feature.passes || options.testAll) {
      const result = await runFeatureTest(feature, options);
      results.push(result);

      if (result.passed === true) {
        passed++;
      } else if (result.passed === false) {
        failed++;
      }
      // result.passed === null 表示需要AI执行

      console.log();
    }
  }

  // 关闭浏览器
  closeBrowser();

  // 汇总
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.bold('\n📊 Test Results Summary\n'));
  console.log(`   ${chalk.green('✅ Passed:')} ${passed}`);
  console.log(`   ${chalk.red('❌ Failed:')} ${failed}`);
  console.log(`   ${chalk.blue('📋 Need AI execution:')} ${results.filter(r => r.passed === null).length}`);
  console.log(`   ${chalk.blue('📋 Total:')} ${passed + failed}`);
  console.log();

  return {
    total: passed + failed,
    passed,
    failed,
    results
  };
}

/**
 * 验证功能（测试 + 标记完成）
 */
export async function verifyFeatureE2E(feature, options = {}) {
  console.log(chalk.cyan(`\n🔍 Verifying: ${feature.id} - ${feature.description}`));

  const result = await runFeatureTest(feature, options);

  if (result.passed === true) {
    console.log(chalk.green(`\n✅ Feature ${feature.id} verified successfully!`));
    return { verified: true, result };
  } else if (result.passed === false) {
    console.log(chalk.red(`\n❌ Feature ${feature.id} verification failed!`));
    if (result.error) {
      console.log(chalk.red(`   Error: ${result.error}`));
    }
    return { verified: false, result };
  } else {
    console.log(chalk.yellow(`\n⏳ Feature ${feature.id} needs AI to execute test steps`));
    return { verified: null, result, message: 'AI should execute test steps' };
  }
}
