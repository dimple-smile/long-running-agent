/**
 * UI Review Module for Long-Running Agent
 * Uses AI vision capabilities to analyze UI aesthetics
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

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
 * 截取页面截图
 */
async function captureScreenshots(baseUrl, outputDir) {
  const screenshots = [];
  const pages = [
    { name: 'login', url: `${baseUrl}/login`, label: '登录页' },
    { name: 'courses', url: `${baseUrl}/courses`, label: '课程列表页', requiresAuth: true },
    { name: 'selected', url: `${baseUrl}/selected`, label: '已选课程页', requiresAuth: true },
    { name: 'schedule', url: `${baseUrl}/schedule`, label: '课表页', requiresAuth: true },
    { name: 'profile', url: `${baseUrl}/profile`, label: '个人中心页', requiresAuth: true },
  ];

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let isLoggedIn = false;

  for (const page of pages) {
    console.log(chalk.gray(`   Capturing: ${page.label}...`));

    // 如果需要登录且尚未登录
    if (page.requiresAuth && !isLoggedIn) {
      console.log(chalk.gray(`   Logging in first...`));
      runAgentBrowserCommand(`open ${baseUrl}/login`, { silent: true });

      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 执行登录
      runAgentBrowserCommand('find placeholder 学号 fill 2021001', { silent: true });
      await new Promise(resolve => setTimeout(resolve, 300));
      runAgentBrowserCommand('find placeholder 密码 fill 123456', { silent: true });
      await new Promise(resolve => setTimeout(resolve, 300));
      runAgentBrowserCommand('find role button click --name 登录', { silent: true });
      await new Promise(resolve => setTimeout(resolve, 2000));

      isLoggedIn = true;
    }

    // 打开页面
    runAgentBrowserCommand(`open ${page.url}`, { silent: true });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 截图
    const screenshotPath = path.join(outputDir, `${page.name}.png`);
    runAgentBrowserCommand(`screenshot ${screenshotPath} --full`, { silent: true });

    if (fs.existsSync(screenshotPath)) {
      screenshots.push({
        name: page.name,
        label: page.label,
        path: screenshotPath
      });
      console.log(chalk.green(`   ✓ ${page.label} -> ${screenshotPath}`));
    } else {
      console.log(chalk.yellow(`   ⚠ Failed to capture ${page.label}`));
    }
  }

  // 关闭浏览器
  runAgentBrowserCommand('close', { silent: true });

  return screenshots;
}

/**
 * 生成 UI 审查报告
 */
function generateReviewReport(screenshots, reviews) {
  const reportDir = path.dirname(screenshots[0]?.path || '.');
  const reportPath = path.join(reportDir, 'ui-review-report.md');

  let report = `# UI 美学审查报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 审查概览

| 页面 | 评分 | 主要问题 |
|------|------|----------|
`;

  for (const review of reviews) {
    const screenshot = screenshots.find(s => s.name === review.name);
    const score = review.score || 'N/A';
    const issues = review.issues?.slice(0, 2).join(', ') || '无';
    report += `| ${screenshot?.label || review.name} | ${score}/10 | ${issues} |\n`;
  }

  report += `
## 详细审查

`;

  for (const review of reviews) {
    const screenshot = screenshots.find(s => s.name === review.name);
    report += `### ${screenshot?.label || review.name}

![${screenshot?.label}](${path.basename(review.screenshotPath)})

#### 评分: ${review.score || 'N/A'}/10

`;

    if (review.strengths?.length > 0) {
      report += `#### ✅ 优点
`;
      for (const s of review.strengths) {
        report += `- ${s}\n`;
      }
      report += '\n';
    }

    if (review.issues?.length > 0) {
      report += `#### ⚠️ 问题
`;
      for (const issue of review.issues) {
        report += `- ${issue}\n`;
      }
      report += '\n';
    }

    if (review.suggestions?.length > 0) {
      report += `#### 💡 建议
`;
      for (const suggestion of review.suggestions) {
        report += `- ${suggestion}\n`;
      }
      report += '\n';
    }

    report += '---\n\n';
  }

  // 汇总建议
  report += `## 总体建议

基于以上审查，建议关注以下方面：

1. **边距一致性**: 确保所有卡片和组件使用统一的 padding 和 margin
2. **颜色规范**: 建立统一的颜色变量系统，避免硬编码颜色值
3. **排版层级**: 确保标题、正文、辅助文字有明确的层级区分
4. **响应式**: 在移动端视图下检查布局是否合理

---
*此报告由 LRA UI Review 自动生成*
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  return reportPath;
}

/**
 * UI 审查主函数
 */
export async function runUIReview(baseUrl, options = {}) {
  console.log(chalk.bold('\n🎨 UI 美学审查\n'));
  console.log(chalk.gray('='.repeat(50)));

  const outputDir = options.outputDir || './ui-review';

  // 1. 截取截图
  console.log(chalk.bold('\n📸 步骤 1: 截取页面截图\n'));

  let screenshots = [];
  try {
    screenshots = await captureScreenshots(baseUrl, outputDir);
  } catch (error) {
    console.log(chalk.red(`❌ 截图失败: ${error.message}`));
    return { success: false, error: error.message };
  }

  if (screenshots.length === 0) {
    console.log(chalk.red('❌ 没有成功截取任何截图'));
    return { success: false, error: 'No screenshots captured' };
  }

  console.log(chalk.green(`\n✅ 成功截取 ${screenshots.length} 张截图\n`));

  // 2. 提示用户使用 AI 视觉能力分析
  console.log(chalk.bold('\n🔍 步骤 2: AI 视觉分析\n'));
  console.log(chalk.yellow('请使用 AI 视觉能力分析以下截图：'));
  console.log();

  for (const screenshot of screenshots) {
    console.log(chalk.gray(`   - ${screenshot.path}`));
  }

  console.log();
  console.log(chalk.cyan('审查要点：'));
  console.log('   1. 边距和间距是否一致（检查 padding, margin）');
  console.log('   2. 颜色搭配是否协调（检查主色、辅色、强调色）');
  console.log('   3. 排版是否规范（检查字体大小、行高、字重）');
  console.log('   4. 组件对齐是否正确');
  console.log('   5. 视觉层级是否清晰');
  console.log();

  // 3. 返回截图路径供 AI 分析
  return {
    success: true,
    screenshots,
    outputDir,
    message: '请使用 AI 视觉能力分析截图并生成审查报告'
  };
}

/**
 * 保存 UI 审查结果
 */
export function saveUIReviewResults(results, outputDir) {
  const reportPath = path.join(outputDir, 'ui-review-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  return reportPath;
}
