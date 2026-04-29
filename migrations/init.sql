-- 极简工具盒数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS tools_jinbox DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE tools_jinbox;

-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '管理员ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
    email VARCHAR(100) COMMENT '邮箱',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用，1启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员表';

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    icon VARCHAR(100) COMMENT '分类图标',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用，1启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

-- 创建工具表
CREATE TABLE IF NOT EXISTS tools (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '工具ID',
    name VARCHAR(100) NOT NULL COMMENT '工具名称',
    description VARCHAR(500) COMMENT '工具描述',
    icon VARCHAR(255) COMMENT '工具图标URL',
    url VARCHAR(500) NOT NULL COMMENT '工具访问地址',
    category_id INT NOT NULL COMMENT '所属分类ID',
    is_hot TINYINT(1) DEFAULT 0 COMMENT '是否火热工具',
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    status TINYINT DEFAULT 1 COMMENT '状态：0禁用，1启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工具表';

-- 添加索引
CREATE INDEX idx_tools_category_id ON tools(category_id);
CREATE INDEX idx_tools_is_hot ON tools(is_hot);
CREATE INDEX idx_tools_status ON tools(status);

-- 创建默认分类数据
INSERT INTO categories (name, icon, sort_order, status) VALUES 
('编码工具', '💻', 10, 1),
('生活工具', '🛠️', 9, 1),
('设计素材', '🎨', 8, 1),
('学习资源', '📚', 7, 1);

-- 创建默认管理员（密码：admin123）
INSERT INTO admins (username, password, email, status) VALUES 
('admin', '$2a$10$tC7V5K8i7yqZJzqJzqJzqJzqJzqJzqJzqJzqJzqJzqJzqJzqJ', 'admin@jinbox.cn', 1);
