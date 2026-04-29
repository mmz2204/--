# 极简工具盒 - Tools Jinbox

一个基于 Go + Gin + GORM + JWT 构建的工具类网站后端服务。

## 项目特性

- **技术栈**: Go 1.22 + Gin + GORM + MySQL + JWT
- **功能模块**: 工具管理、分类管理、管理员认证
- **RESTful API**: 提供完整的增删改查接口
- **JWT 认证**: 安全的身份验证机制

## 项目结构

```
├── cmd/                    # 命令入口
│   └── server/            # 服务启动入口
├── config/                # 配置文件
├── internal/              # 内部模块
│   ├── handler/          # HTTP 处理器
│   ├── middleware/       # 中间件
│   ├── model/            # 数据库模型
│   ├── repository/       # 数据访问层
│   └── service/          # 业务逻辑层
├── pkg/                  # 公共工具包
├── migrations/           # 数据库迁移脚本
├── .env                  # 环境变量配置
├── go.mod                # Go 模块依赖
└── README.md             # 项目说明
```

## 快速开始

### 1. 环境要求

- Go 1.22+
- MySQL 5.7+

### 2. 配置环境变量

复制 `.env` 文件并修改数据库配置：

```env
APP_ENV=development
APP_PORT=8080
JWT_SECRET=your-256-bit-secret-key-here-must-be-long-enough
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tools_jinbox
```

### 3. 初始化数据库

执行迁移脚本：

```bash
mysql -u root -p < migrations/init.sql
```

### 4. 安装依赖

```bash
go mod download
```

### 5. 启动服务

```bash
go run cmd/server/main.go
```

服务将在 `http://localhost:8080` 启动。

## API 接口

### 公共接口（无需登录）

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/login | 管理员登录 |
| GET | /api/tools | 获取工具列表 |
| GET | /api/tools/hot | 获取火热工具 |
| GET | /api/tools/:id | 获取单个工具 |
| POST | /api/tools/:id/use | 记录工具使用 |
| GET | /api/categories | 获取分类列表 |
| GET | /api/categories/:id | 获取单个分类 |
| GET | /api/categories/tools | 获取分类及工具 |

### 管理员接口（需 JWT）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/admin/profile | 获取当前管理员信息 |
| POST | /api/admin/tools | 创建工具 |
| PUT | /api/admin/tools/:id | 更新工具 |
| DELETE | /api/admin/tools/:id | 删除工具 |
| POST | /api/admin/categories | 创建分类 |
| PUT | /api/admin/categories/:id | 更新分类 |
| DELETE | /api/admin/categories/:id | 删除分类 |
| POST | /api/admin/admins | 创建管理员 |

## 使用示例

### 登录获取 Token

```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### 获取工具列表

```bash
curl http://localhost:8080/api/tools
```

### 创建工具（需认证）

```bash
curl -X POST http://localhost:8080/api/admin/tools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "色彩取色器",
    "description": "获取任意颜色的 HEX/RGB/HSL 值",
    "icon": "🎨",
    "url": "/tools/color-picker",
    "category_id": 3,
    "is_hot": true,
    "sort_order": 100
  }'
```

## 默认管理员

- 用户名: `admin`
- 密码: `admin123`

## Logo 设计

网站名称：极简工具盒
域名：tools.jinbox.cn

Logo 建议设计方向：
- 简洁现代的图标风格
- 包含工具元素（如扳手、齿轮）
- 配色方案：科技蓝/渐变紫

## License

MIT
