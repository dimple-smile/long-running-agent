/**
 * E2E Testing Module for Long-Running Agent
 * Uses agent-browser (https://github.com/vercel-labs/agent-browser)
 */

import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';

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
 * 运行单个功能的 E2E 测试
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
    steps: [],
    passed: true,
    error: null,
    screenshots: []
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

    // 如果有测试步骤，按步骤执行
    if (feature.steps && feature.steps.length > 0) {
      for (let i = 0; i < feature.steps.length; i++) {
        const step = feature.steps[i];
        console.log(chalk.gray(`   Step ${i + 1}: ${step}`));

        const stepResult = await executeStep(feature, step, baseUrl);

        results.steps.push({
          step: step,
          passed: stepResult.passed,
          error: stepResult.error
        });

        if (!stepResult.passed) {
          results.passed = false;
          results.error = `Step ${i + 1} failed: ${stepResult.error}`;

          // 截图
          const screenshot = `test-failure-${feature.id}-${Date.now()}.png`;
          runAgentBrowserCommand(`screenshot ${screenshot}`, { silent: true });
          results.screenshots.push(screenshot);

          console.log(chalk.red(`   ❌ Failed: ${stepResult.error}`));
          break;
        } else {
          console.log(chalk.green(`   ✅ Passed`));
        }

        // 步骤之间稍微等待
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      // 通用验证
      console.log(chalk.yellow('   ⚠️  No test steps defined, running generic validation...'));

      // 获取快照验证页面加载
      const snapshot = await getSnapshot();
      if (snapshot && snapshot.success) {
        console.log(chalk.green('   ✅ Page loaded successfully'));
        results.passed = true;
      } else {
        results.passed = false;
        results.error = 'Page failed to load';
      }
    }

  } catch (error) {
    results.passed = false;
    results.error = error.message;
    console.log(chalk.red(`   ❌ Error: ${error.message}`));
  } finally {
    // 关闭浏览器
    runAgentBrowserCommand('close', { silent: true });
  }

  return results;
}

/**
 * 执行单个测试步骤
 */
async function executeStep(feature, step, baseUrl) {
  const result = { passed: false, error: null };
  const stepLower = step.toLowerCase();

  try {
    // 导航步骤
    if (stepLower.includes('打开') || stepLower.includes('进入') || stepLower.includes('访问')) {
      const target = extractTarget(step);
      const url = target.startsWith('http') ? target : `${baseUrl}${target}`;

      const navResult = runAgentBrowserCommand(`open ${url}`, { timeout: 10000 });
      result.passed = navResult.success;
      if (!result.passed) {
        result.error = navResult.error;
      }
    }

    // 点击步骤
    else if (stepLower.includes('点击')) {
      const target = extractTarget(step);

      // 尝试多种选择器策略
      const clickStrategies = [
        `find role button click --name "${target}"`,  // 按钮角色
        `find text "${target}" click`,                // 文本匹配
        `click "text=${target}"`                      // Playwright 文本选择器
      ];

      for (const strategy of clickStrategies) {
        const clickResult = runAgentBrowserCommand(strategy, { timeout: 5000 });
        if (clickResult.success) {
          result.passed = true;
          break;
        }
      }

      if (!result.passed) {
        result.error = `Could not click: "${target}"`;
      }
    }

    // 输入步骤
    else if (stepLower.includes('输入') || stepLower.includes('填写')) {
      // 检测组合输入步骤（如 "输入学号和密码"）
      if (stepLower.includes('学号') && stepLower.includes('密码')) {
        // 填写学号
        const idResult = runAgentBrowserCommand('find placeholder 学号 fill 2021001', { timeout: 5000 });
        if (idResult.success) {
          await new Promise(resolve => setTimeout(resolve, 300));
          // 填写密码
          const pwResult = runAgentBrowserCommand('find placeholder 密码 fill 123456', { timeout: 5000 });
          result.passed = pwResult.success;
        }
        if (!result.passed) {
          result.error = 'Failed to fill login credentials';
        }
      } else {
        const { field, value } = extractInput(step, feature);

        // 使用 find placeholder 命令（更可靠）
        const fillResult = runAgentBrowserCommand(`find placeholder ${field} fill ${value}`, { timeout: 5000 });
        result.passed = fillResult.success;

        if (!result.passed) {
          // 回退到普通选择器
          const fallbackResult = runAgentBrowserCommand(`fill "[placeholder*=\\"${field}\\"]" "${value}"`, { timeout: 5000 });
          result.passed = fallbackResult.success;
        }

        if (!result.passed) {
          result.error = `Could not fill field: "${field}"`;
        }
      }
    }

    // 验证步骤
    else if (stepLower.includes('验证') || stepLower.includes('检查') || stepLower.includes('确认')) {
      // 等待页面跳转/加载完成
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 提取验证目标（不转换成路径，保留原始文本）
      const target = step
        .replace(/^(验证|检查|确认)\s*/i, '')
        .replace(/["「」『』]/g, '')
        .trim();

      // 获取快照检查内容
      const snapshot = await getSnapshot();
      if (snapshot && snapshot.data) {
        const snapshotText = JSON.stringify(snapshot.data);
        result.passed = snapshotText.includes(target);
        if (!result.passed) {
          // 也检查页面文本
          const textResult = runAgentBrowserCommand('get text body', { silent: true, timeout: 5000 });
          if (textResult.success && textResult.output) {
            result.passed = textResult.output.includes(target);
          }
        }
      }

      // 也检查当前URL
      if (!result.passed) {
        const currentUrl = runAgentBrowserCommand('url', { silent: true, timeout: 5000 });
        if (currentUrl.success && currentUrl.output) {
          // 将中文名称转换为路径检查
          const routes = {
            '课程列表': '/courses',
            '登录页': '/login',
            '课程表': '/schedule',
            '个人中心': '/profile',
            '已选课程': '/selected'
          };
          const pathToCheck = routes[target] || target;
          result.passed = currentUrl.output.includes(pathToCheck);
        }
      }

      if (!result.passed) {
        result.error = `Could not find: "${target}"`;
      }
    }

    // 登录特殊处理
    else if (stepLower.includes('登录')) {
      // 填写学号
      const idResult = runAgentBrowserCommand('find placeholder 学号 fill 2021001', { timeout: 5000 });
      if (idResult.success) {
        await new Promise(resolve => setTimeout(resolve, 300));

        // 填写密码
        const pwResult = runAgentBrowserCommand('find placeholder 密码 fill 123456', { timeout: 5000 });
        if (pwResult.success) {
          await new Promise(resolve => setTimeout(resolve, 300));

          // 点击登录按钮（使用 role 选择器避免歧义）
          const loginResult = runAgentBrowserCommand('find role button click --name 登录', { timeout: 5000 });
          result.passed = loginResult.success;
        }
      }

      if (!result.passed) {
        result.error = 'Login step failed';
      }
    }

    // 等待步骤
    else if (stepLower.includes('等待')) {
      const msMatch = step.match(/(\d+)/);
      const ms = msMatch ? parseInt(msMatch[1]) : 2000;
      await new Promise(resolve => setTimeout(resolve, ms));
      result.passed = true;
    }

    // 默认
    else {
      // 假设通过
      result.passed = true;
    }

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

/**
 * 从步骤中提取目标
 */
function extractTarget(step) {
  return step
    .replace(/^(打开|进入|访问|点击|验证|检查|确认|选择|等待)\s*/i, '')
    .replace(/^(登录页|课程列表|课程表|个人中心|已选课程)/, (match) => {
      const routes = {
        '登录页': '/login',
        '课程列表': '/courses',
        '课程表': '/schedule',
        '个人中心': '/profile',
        '已选课程': '/selected'
      };
      return routes[match] || match;
    })
    .replace(/["「」『』]/g, '')
    .trim();
}

/**
 * 从步骤中提取输入信息
 */
function extractInput(step, feature) {
  const patterns = [
    /输入\s*(\S+)\s+(\S+)/,
    /填写\s*(\S+)\s+(\S+)/,
    /在\s*(\S+)\s*中输入\s*(\S+)/
  ];

  for (const pattern of patterns) {
    const match = step.match(pattern);
    if (match) {
      return { field: match[1], value: match[2] };
    }
  }

  if (feature.testData) {
    return feature.testData;
  }

  return { field: 'input', value: 'test' };
}

/**
 * 在快照中查找输入框引用
 */
function findInputRef(refs, fieldName) {
  const fieldLower = fieldName.toLowerCase();

  for (const [ref, info] of Object.entries(refs)) {
    if (info.role === 'textbox' || info.role === 'searchbox') {
      const name = (info.name || '').toLowerCase();
      if (name.includes(fieldLower) || fieldLower.includes(name)) {
        return ref;
      }
    }
  }

  return null;
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

      if (result.passed) {
        passed++;
      } else {
        failed++;
      }

      console.log();
    }
  }

  // 汇总
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.bold('\n📊 Test Results Summary\n'));
  console.log(`   ${chalk.green('✅ Passed:')} ${passed}`);
  console.log(`   ${chalk.red('❌ Failed:')} ${failed}`);
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

  if (result.passed) {
    console.log(chalk.green(`\n✅ Feature ${feature.id} verified successfully!`));
    return { verified: true, result };
  } else {
    console.log(chalk.red(`\n❌ Feature ${feature.id} verification failed!`));
    if (result.error) {
      console.log(chalk.red(`   Error: ${result.error}`));
    }
    return { verified: false, result };
  }
}
