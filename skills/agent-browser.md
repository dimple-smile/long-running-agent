# Agent Browser E2E Testing Skill

使用 [agent-browser](https://github.com/vercel-labs/agent-browser) 进行端到端测试。

## 安装

```bash
npm install -g agent-browser
agent-browser install  # 下载浏览器
```

## 基本命令

### 打开浏览器

```bash
# 打开URL（headless模式）
agent-browser open https://example.com

# 打开URL（有界面模式）
agent-browser open https://example.com --headed
```

### 页面操作

```bash
# 截图
agent-browser screenshot screenshot.png

# 全页面截图
agent-browser screenshot screenshot.png --full

# 获取页面快照（JSON格式，包含页面结构）
agent-browser snapshot --json

# 获取页面快照（带元素引用）
agent-browser snapshot -i --json

# 获取当前URL
agent-browser url

# 获取页面文本
agent-browser get text body

# 关闭浏览器
agent-browser close
```

### 元素查找与操作

```bash
# 通过placeholder查找输入框并填写
agent-browser find placeholder 用户名 fill myusername
agent-browser find placeholder 密码 fill mypassword
agent-browser find placeholder 学号 fill 2021001

# 通过role查找按钮并点击
agent-browser find role button click --name 登录
agent-browser find role button click --name 提交

# 通过文本查找并点击
agent-browser find text "选课" click

# 通过CSS选择器操作
agent-browser click "#submit-button"
agent-browser fill "[placeholder*='搜索']" "搜索内容"
```

### 导航

```bash
# 打开新URL
agent-browser open https://example.com/page2

# 后退
agent-browser back

# 前进
agent-browser forward
```

## 常见测试场景

### 登录流程测试

```bash
# 1. 打开登录页
agent-browser open https://example.com/login --headed

# 2. 填写表单
agent-browser find placeholder 学号 fill 2021001
agent-browser find placeholder 密码 fill 123456

# 3. 点击登录
agent-browser find role button click --name 登录

# 4. 验证跳转
agent-browser url  # 应该显示登录后的URL

# 5. 关闭
agent-browser close
```

### 表单填写测试

```bash
# 多个输入框
agent-browser find placeholder 姓名 fill 张三
agent-browser find placeholder 邮箱 fill test@example.com
agent-browser find placeholder 电话 fill 13800138000

# 提交表单
agent-browser find role button click --name 提交
```

### 页面内容验证

```bash
# 获取页面快照验证内容
agent-browser snapshot -i --json

# 或获取页面文本
agent-browser get text body
```

## 重要注意事项

1. **等待时间**: 页面加载和操作之间需要适当等待（通常1-2秒）
2. **选择器优先级**:
   - `find role button click --name xxx` 最可靠（通过ARIA角色）
   - `find placeholder xxx fill value` 适合输入框
   - `find text xxx click` 可能歧义，慎用
3. **关闭浏览器**: 测试完成后务必 `agent-browser close`
4. **有界面模式**: 开发调试时使用 `--headed`，CI环境使用headless

## 错误处理

```bash
# 如果命令失败，检查：
# 1. 浏览器是否已安装 (agent-browser install)
# 2. 选择器是否正确
# 3. 页面是否已完全加载（可能需要等待）
# 4. 之前的会话是否已关闭
```

## 与LRA集成

在 LRA 项目中，E2E测试步骤应该描述清晰的操作：

```json
{
  "steps": [
    "打开 /login",
    "输入学号和密码",
    "点击登录",
    "验证课程列表"
  ]
}
```

AI会根据这些步骤，使用agent-browser命令来执行实际操作。
