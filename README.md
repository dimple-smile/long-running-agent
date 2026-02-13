# @dimples/lra

<div align="center">

**Long-Running Agent CLI**

*Manage complex AI projects across multiple sessions*

[![npm version](https://img.shields.io/npm/v/@dimples/lra.svg)](https://www.npmjs.com/package/@dimples/lra)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@dimples/lra.svg)](https://nodejs.org)

[English](#overview) · [中文](#概述)

</div>

---

## Overview

A CLI tool for managing long-running AI agent projects. When building complex applications with AI assistants like Claude Code, context windows can fill up before the project is complete. **LRA** provides structured state management so AI agents can seamlessly continue work across multiple sessions.

**Key Features:**
- 📋 **Feature Tracking** - Maintain a structured list of features with priorities
- 📊 **Progress Management** - Track completion status across sessions
- 🔄 **State Persistence** - JSON-based state that survives context resets
- 🤝 **AI Integration** - Generates `.claude/CLAUDE.md` for seamless Claude Code integration
- 📝 **Git Integration** - Automatic commits with progress tracking

## Installation

```bash
# Quick use (recommended)
npx @dimples/lra init my-project

# Or install globally
npm install -g @dimples/lra
lra init my-project
```

## Quick Start

```bash
# 1. Initialize a new project
npx @dimples/lra init my-app --type web
cd my-app

# 2. Add features to track
npx @dimples/lra add "User authentication" --priority critical
npx @dimples/lra add "Dashboard view" --priority high
npx @dimples/lra add "Settings page" --priority medium

# 3. Check status
npx @dimples/lra status

# 4. Get next feature to work on
npx @dimples/lra next

# 5. After AI completes a feature
npx @dimples/lra done feat-001
npx @dimples/lra commit feat-001
```

## Commands

| Command | Description |
|---------|-------------|
| `init [name]` | Initialize a new LRA project |
| `status` | Show project progress and statistics |
| `add <description>` | Add a new feature |
| `next` | Get the next pending feature (by priority) |
| `done <feature-id>` | Mark a feature as completed |
| `commit [feature-id]` | Commit progress to git |
| `list` | List all features |
| `export` | Export project state |

### `init [name]`

```bash
npx @dimples/lra init my-project --type web
```

Options:
- `-t, --type <type>` - Project type: `web`, `api`, `cli`, `library` (default: `web`)
- `-d, --dir <directory>` - Target directory (default: `.`)

### `add <description>`

```bash
npx @dimples/lra add "User login" --priority critical --steps "Open login page" "Enter credentials" "Submit"
```

Options:
- `-p, --priority <priority>` - `critical`, `high`, `medium`, `low` (default: `medium`)
- `-c, --category <category>` - `functional`, `style`, `performance`, `security`
- `-s, --steps <steps...>` - Test steps for verification

### `status`

```bash
npx @dimples/lra status
npx @dimples/lra status --json  # Machine-readable output
```

### `next`

Returns the highest-priority pending feature.

```bash
npx @dimples/lra next
npx @dimples/lra next --json  # Machine-readable output
```

## Project Structure

```
my-project/
├── .agent/
│   ├── features.json      # Feature list (the "memory")
│   ├── progress.md        # Session history
│   └── sessions/          # Detailed session logs
├── .claude/
│   └── CLAUDE.md          # Instructions for Claude Code
├── init.sh                # Development environment script
├── app_spec.txt           # Application specification
└── [your project files]
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Workflow                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Session 1          Session 2          Session 3            │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │   AI     │      │   AI     │      │   AI     │          │
│  │ (fresh)  │      │ (fresh)  │      │ (fresh)  │          │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘          │
│       │                 │                 │                 │
│       ▼                 ▼                 ▼                 │
│  ┌─────────────────────────────────────────────────┐       │
│  │              .agent/features.json                │       │
│  │           (Persistent State/Memory)              │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Each session:                                              │
│  1. Read features.json → Know current state                 │
│  2. Work on features → Implement code                       │
│  3. Mark done → Update state                                │
│  4. Commit → Persist to git                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Integration with Claude Code

When you run `lra init`, it automatically creates `.claude/CLAUDE.md` with instructions for Claude Code. Every session, Claude will:

1. Read `.agent/features.json` to understand project state
2. Read `.agent/progress.md` to see session history
3. Call `lra next` to get the next feature
4. Implement and test the feature
5. Call `lra done` and `lra commit` to save progress

## Core Principles

1. **Immutable Feature List** - Features can only be marked done, never removed
2. **Incremental Progress** - One feature per session
3. **Verification First** - Test before marking done
4. **State Synchronization** - Always commit after changes

## Why LRA?

When building complex applications with AI:

| Problem | Solution |
|---------|----------|
| Context window fills up | Features tracked in JSON file |
| AI "forgets" previous work | Progress persisted across sessions |
| AI declares done too early | Structured feature list prevents this |
| AI tries to do too much at once | One feature at a time |

## Related

- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - The inspiration for this tool
- [Claude Code](https://claude.ai/code) - AI coding assistant

## License

MIT © [dimple-smile](https://github.com/dimple-smile)

---

<div align="center">

**概述**

*跨多个会话管理复杂的 AI 项目*

</div>

## 概述

一个用于管理长运行 AI Agent 项目的 CLI 工具。当使用 Claude Code 等 AI 助手构建复杂应用时，上下文窗口可能在项目完成前就被填满。**LRA** 提供结构化的状态管理，让 AI Agent 可以在多个会话中无缝继续工作。

**核心功能：**
- 📋 **功能追踪** - 维护带有优先级的结构化功能列表
- 📊 **进度管理** - 跨会话追踪完成状态
- 🔄 **状态持久化** - 基于 JSON 的状态，不受上下文重置影响
- 🤝 **AI 集成** - 自动生成 `.claude/CLAUDE.md` 与 Claude Code 无缝集成
- 📝 **Git 集成** - 自动提交并追踪进度

## 安装

```bash
# 快速使用（推荐）
npx @dimples/lra init my-project

# 或全局安装
npm install -g @dimples/lra
lra init my-project
```

## 快速开始

```bash
# 1. 初始化新项目
npx @dimples/lra init my-app --type web
cd my-app

# 2. 添加要追踪的功能
npx @dimples/lra add "用户认证" --priority critical
npx @dimples/lra add "仪表盘视图" --priority high
npx @dimples/lra add "设置页面" --priority medium

# 3. 查看状态
npx @dimples/lra status

# 4. 获取下一个要工作的功能
npx @dimples/lra next

# 5. AI 完成功能后
npx @dimples/lra done feat-001
npx @dimples/lra commit feat-001
```

## 许可证

MIT © [dimple-smile](https://github.com/dimple-smile)
