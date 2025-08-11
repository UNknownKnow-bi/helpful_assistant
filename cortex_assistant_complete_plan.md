# 智时助手 (Cortex Assistant) 完整开发方案

## 1. 产品概述

### 1.1 核心价值主张
为长时间在电脑前工作的知识工作者提供与工作流无缝集成的AI时间管理助手。通过浏览器扩展无感捕获信息，AI自动整理任务、规划日程并提供决策支持。

### 1.2 目标用户
互联网从业者：产品经理、程序员、运营、设计师等，日常处理大量多渠道信息，追求高效工作流。

## 2. MVP功能设计

### 2.1 功能一：任务管理 (Task Management)

#### 用户故事
- **浏览器划词创建**：在任何网页选中文字，右键菜单一键创建任务，AI自动识别内容、DDL和提出人
- **应用内粘贴创建**：从微信PC版等应用复制文本，粘贴到输入框，AI解析并填充任务卡片
- **任务编辑与状态管理**：编辑任务内容，标记完成状态

#### 技术实现要点
- 浏览器扩展Context Menus API集成
- 文本解析和NLP处理
- 实时任务状态同步

### 2.2 功能二：时间安排 (Time Arrangement)

#### 用户故事
- **Onboarding偏好设置**：首次使用时设置工作风格（紧凑/宽松）和精力时段
- **AI智能排序**：基于DDL、精力时段和预设规则的任务执行顺序推荐
- **可视化日程调整**：时间轴视图，拖拽调整任务安排，预留弹性时间

#### 技术实现要点
- 调度算法设计和优化
- 拖拽交互组件开发
- 时间轴可视化实现

### 2.3 功能三：任务助手 (Task Assistant)

#### 用户故事
- **通用方案建议**：常见任务（如写周报）自动提供SOP或模板建议
- **社会化情境提醒**：基于历史数据的智慧提醒，辅助决策

#### 技术实现要点
- AI内容生成和模板推荐
- 用户行为数据分析
- 智能提醒系统

## 3. 技术架构设计

### 3.1 系统整体架构

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│   浏览器扩展         │────▶│   Web应用           │◀───▶│   数据库            │
│   (Browser Ext.)    │    │   (Next.js)         │    │   (MongoDB)         │
│                     │    │                     │    │                     │
└─────────────────────┘    └──────────┬──────────┘    └─────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │                     │
                           │   AI模型 API        │
                           │   (Google Gemini)   │
                           │                     │
                           └─────────────────────┘
```

### 3.2 架构组件职责

- **浏览器扩展**：信息捕获，通过API发送任务到后端
- **Web应用**：核心业务逻辑，前端UI交互，后端API服务
- **数据库**：用户信息、任务数据、偏好设置持久化存储
- **AI模型API**：NLP处理、内容生成、智能推荐

## 4. 技术栈选型

### 4.1 前端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| Next.js | 14+ | 全栈框架 | App Router，优秀性能和SEO |
| React | 18+ | UI框架 | 生态成熟，组件化开发 |
| TypeScript | 5+ | 类型系统 | 代码安全性和可维护性 |
| Tailwind CSS | 3+ | CSS框架 | 快速UI开发，现代设计系统 |
| shadcn/ui | Latest | UI组件库 | 高质量组件，可定制性强 |

### 4.2 后端技术栈

| 技术 | 版本 | 用途 | 选择理由 |
|------|------|------|----------|
| Node.js | 18+ | 运行时 | Next.js内置，语言统一 |
| NextAuth.js | 4+ | 身份认证 | 多平台登录集成 |
| MongoDB | 6+ | 数据库 | 灵活文档模型，快速迭代 |
| Mongoose | 8+ | ODM | 数据建模和验证 |

### 4.3 集成服务

| 服务 | 用途 | 备选方案 |
|------|------|----------|
| Google Gemini API | AI文本处理 | OpenAI GPT-4, Claude |
| Vercel | 部署托管 | AWS, Railway |
| MongoDB Atlas | 数据库托管 | 自建MongoDB |

### 4.4 开发工具

| 工具 | 用途 |
|------|------|
| pnpm | 包管理器 |
| ESLint + Prettier | 代码规范 |
| GitHub Actions | CI/CD |
| VS Code | IDE |

## 5. 数据库设计

### 5.1 用户表 (users)
```javascript
{
  "_id": "ObjectId",
  "name": "String",
  "email": "String (unique)",
  "image": "String (URL)",
  "createdAt": "Date",
  "preferences": {
    "scheduleStyle": "Enum('compact', 'relaxed')",
    "energySlots": [
      { "type": "focus", "start": "HH:MM", "end": "HH:MM" },
      { "type": "communication", "start": "HH:MM", "end": "HH:MM" }
    ]
  }
}
```

### 5.2 任务表 (tasks)
```javascript
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users)",
  "content": "String",
  "dueDate": "Date",
  "source": "String", // 'extension', 'paste'
  "proposer": "String", // 任务提出人
  "status": "Enum('todo', 'done')",
  "priority": "Enum('high', 'medium', 'low')",
  "estimatedTime": "Number (minutes)",
  "tags": ["String"],
  "assistantSuggestion": {
    "type": "Enum('sop', 'reminder')",
    "text": "String"
  },
  "createdAt": "Date"
}
```

## 6. API设计

### 6.1 核心API端点

| 方法 | 端点 | 功能 | 参数 |
|------|------|------|------|
| POST | `/api/tasks` | 创建任务 | content, dueDate, source |
| GET | `/api/tasks` | 获取任务列表 | status, limit, offset |
| PUT | `/api/tasks/:id` | 更新任务 | 任务字段 |
| DELETE | `/api/tasks/:id` | 删除任务 | - |
| POST | `/api/tasks/parse-text` | 解析文本 | text |
| GET | `/api/user/preferences` | 获取偏好 | - |
| PUT | `/api/user/preferences` | 更新偏好 | preferences |

### 6.2 API响应格式
```javascript
// 成功响应
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": "error_code",
  "message": "错误描述"
}
```

## 7. 项目结构

```
zhishi-assistant/
├── packages/
│   ├── webapp/                    # 主Web应用
│   │   ├── src/
│   │   │   ├── app/              # Next.js App Router
│   │   │   │   ├── (auth)/       # 认证页面
│   │   │   │   ├── (main)/       # 主应用
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── tasks/
│   │   │   │   │   └── settings/
│   │   │   │   ├── api/          # API路由
│   │   │   │   │   ├── tasks/
│   │   │   │   │   ├── user/
│   │   │   │   │   └── auth/
│   │   │   │   └── layout.tsx
│   │   │   ├── components/       # UI组件
│   │   │   │   ├── ui/          # shadcn/ui
│   │   │   │   ├── auth/
│   │   │   │   ├── dashboard/
│   │   │   │   └── tasks/
│   │   │   ├── lib/             # 工具函数
│   │   │   │   ├── db.ts
│   │   │   │   ├── ai.ts
│   │   │   │   └── utils.ts
│   │   │   └── types/           # 类型定义
│   │   └── package.json
│   │
│   └── extension/                # 浏览器扩展
│       ├── icons/
│       ├── background.js
│       ├── content.js
│       └── manifest.json
│
├── pnpm-workspace.yaml
└── package.json
```

## 8. 开发计划

### 8.1 第一阶段 (Week 1-2)：基础架构
- [ ] Next.js项目初始化
- [ ] 数据库连接和模型设计
- [ ] 用户认证系统搭建
- [ ] 基础UI组件开发

### 8.2 第二阶段 (Week 3-4)：核心功能
- [ ] 任务CRUD功能实现
- [ ] 浏览器扩展开发
- [ ] AI文本解析集成
- [ ] 任务列表和详情页面

### 8.3 第三阶段 (Week 5-6)：智能功能
- [ ] 时间安排算法开发
- [ ] 可视化时间轴组件
- [ ] AI助手建议功能
- [ ] 用户偏好设置

### 8.4 第四阶段 (Week 7-8)：优化上线
- [ ] 性能优化和测试
- [ ] UI/UX改进
- [ ] 部署和CI/CD配置
- [ ] 用户测试和反馈收集

## 9. 技术风险评估

### 9.1 低风险项
- Next.js基础功能开发
- MongoDB数据操作
- 基础UI组件实现

### 9.2 中风险项
- AI文本解析准确性
- 时间安排算法效果
- 浏览器扩展兼容性

### 9.3 高风险项
- 跨浏览器扩展兼容
- AI API成本控制
- 大量任务的性能优化

## 10. 成功指标

### 10.1 技术指标
- 页面加载时间 < 2s
- API响应时间 < 500ms
- 扩展安装成功率 > 95%

### 10.2 产品指标
- 用户注册转化率 > 20%
- 日活跃用户留存 > 40%
- 任务创建成功率 > 90%

## 11. 预算估算

### 11.1 开发成本
- 开发人员：3-4人 × 2个月
- 设计师：1人 × 0.5个月

### 11.2 运营成本（月）
- Vercel Pro: $20
- MongoDB Atlas: $25
- Google Gemini API: $50-100
- 总计：~$100/月

这个方案兼顾了功能完整性和开发效率，适合小团队快速迭代MVP产品。