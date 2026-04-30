package config

import (
	"fmt"
	"log"
	"os"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
	"github.com/joho/godotenv"
	"tools.jinbox.cn/internal/model"
)

// DB 数据库连接实例
var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {
	// 加载环境变量
	err := godotenv.Load()
	if err != nil {
		log.Fatal("加载 .env 文件失败:", err)
	}

	// 获取数据库名称
	dbName := os.Getenv("DB_NAME")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")

	// 先连接不带数据库的 MySQL，用于创建数据库
	dsnWithoutDB := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port,
	)

	dbWithoutName, err := gorm.Open("mysql", dsnWithoutDB)
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 创建数据库（如果不存在）
	dbWithoutName.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", dbName))

	// 关闭临时连接
	sqlDB := dbWithoutName.DB()
	sqlDB.Close()

	// 连接带数据库的 MySQL
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbName,
	)

	DB, err = gorm.Open("mysql", dsn)
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 设置日志模式
	DB.LogMode(true)

	// 测试连接
	if err := DB.DB().Ping(); err != nil {
		log.Fatal("数据库连接测试失败:", err)
	}

	// 自动迁移表结构
	err = DB.AutoMigrate(
		&model.Admin{},
		&model.Category{},
		&model.Tool{},
		&model.Favorite{},
	).Error
	if err != nil {
		log.Fatal("数据库迁移失败:", err)
	}

	log.Println("数据库连接成功，表结构已自动迁移")

	// 创建默认管理员账号（如果不存在）
	createDefaultAdmin()

	// 创建默认分类和工具数据
	createDefaultCategoriesAndTools()
}

// createDefaultAdmin 创建默认管理员账号
func createDefaultAdmin() {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminUsername == "" || adminPassword == "" {
		log.Println("警告: 未配置管理员账号密码 (ADMIN_USERNAME, ADMIN_PASSWORD)，将无法登录管理后台")
		return
	}

	// 检查管理员是否已存在
	var existingAdmin model.Admin
	err := DB.Where("username = ?", adminUsername).First(&existingAdmin).Error
	if err == nil && existingAdmin.ID > 0 {
		// 管理员已存在
		if existingAdmin.IsAdmin {
			log.Printf("管理员账号已存在: %s", adminUsername)
		}
		return
	}

	// 创建管理员账号
	admin := &model.Admin{
		Username: adminUsername,
		Email:    "admin@localhost",
		IsAdmin:  true,
	}
	admin.SetPassword(adminPassword)

	if err := DB.Create(admin).Error; err != nil {
		log.Printf("创建管理员账号失败: %v", err)
		return
	}

	log.Printf("默认管理员账号创建成功: %s", adminUsername)
}

// createDefaultCategoriesAndTools 创建默认的分类和工具
func createDefaultCategoriesAndTools() {
	// 检查是否强制重新初始化
	forceInit := os.Getenv("FORCE_INIT") == "true"

	// 检查是否已有分类数据
	var categoryCount int
	DB.Model(&model.Category{}).Count(&categoryCount)
	if !forceInit && categoryCount > 0 {
		log.Println("分类数据已存在，跳过初始化")
		return
	}

	// 如果强制初始化，清空现有数据
	if forceInit && categoryCount > 0 {
		log.Println("强制初始化，清空现有数据...")
		DB.Delete(&model.Tool{})
		DB.Delete(&model.Category{})
	}

	log.Println("正在初始化默认分类和工具数据...")

	// 1. 创建分类
	categories := []model.Category{
		{Name: "AI工具", Icon: "🤖", SortOrder: 110, Status: 1},
		{Name: "开发工具", Icon: "💻", SortOrder: 100, Status: 1},
		{Name: "设计工具", Icon: "🎨", SortOrder: 90, Status: 1},
		{Name: "办公工具", Icon: "📊", SortOrder: 80, Status: 1},
		{Name: "SEO工具", Icon: "�", SortOrder: 70, Status: 1},
		{Name: "实用工具", Icon: "✨", SortOrder: 60, Status: 1},
	}

	for i := range categories {
		if err := DB.Create(&categories[i]).Error; err != nil {
			log.Printf("创建分类失败: %v", err)
		}
	}

	// 2. 创建工具
	tools := []model.Tool{
		// ========== AI工具 ==========
		// 国外链接
		{Name: "ChatGPT", Description: "OpenAI推出的革命性AI对话模型，支持智能聊天、创意写作、代码生成、数学计算等多种场景。采用GPT-4架构，理解能力强，响应自然流畅，是目前最受欢迎的AI助手之一。", Icon: "🤖", URL: "https://chat.openai.com/", CategoryID: categories[0].ID, IsHot: true, IsForeign: true, SortOrder: 100, Status: 1},
		{Name: "Claude", Description: "Anthropic公司开发的AI助手，以处理超长文本著称，支持10万token上下文窗口。在法律文档分析、技术文档理解、长篇创作等方面表现出色，安全性和可靠性较高。", Icon: "💬", URL: "https://claude.ai/", CategoryID: categories[0].ID, IsHot: true, IsForeign: true, SortOrder: 95, Status: 1},
		{Name: "Gemini", Description: "Google推出的新一代多模态AI模型，支持文本、图像、音频、视频等多种输入方式。具有强大的逻辑推理能力和多语言支持，在数学和编程任务上表现优秀。", Icon: "🌟", URL: "https://gemini.google.com/", CategoryID: categories[0].ID, IsHot: true, IsForeign: true, SortOrder: 90, Status: 1},
		{Name: "Perplexity", Description: "新一代AI搜索引擎，将实时网络搜索与AI技术相结合。能够提供最新的信息和数据，支持引用来源追踪，回答准确可靠，是获取实时资讯的最佳AI工具之一。", Icon: "🔍", URL: "https://www.perplexity.ai/", CategoryID: categories[0].ID, IsForeign: true, SortOrder: 85, Status: 1},
		{Name: "Midjourney", Description: "顶尖的AI图像生成工具，以超高画质和艺术风格著称。通过简单的文字描述即可生成令人惊叹的图像，支持多种艺术风格，是设计师和创意人士的首选工具。", Icon: "🎨", URL: "https://www.midjourney.com/", CategoryID: categories[0].ID, IsForeign: true, SortOrder: 80, Status: 1},
		{Name: "Stable Diffusion", Description: "开源的AI图像生成模型，可在本地部署使用。完全免费且高度可定制，支持自定义模型训练和插件扩展，是技术爱好者和开发者的理想选择。", Icon: "🖼️", URL: "https://stablediffusionweb.com/", CategoryID: categories[0].ID, IsForeign: true, SortOrder: 75, Status: 1},
		// 国内链接
		{Name: "文心一言", Description: "百度自主研发的生成式AI大模型，具备多轮对话、创意写作、代码理解等能力。深度整合百度搜索引擎能力，在中文理解和传统文化方面表现出色，是国内最受欢迎的AI助手之一。", Icon: "💡", URL: "https://yiyan.baidu.com/", CategoryID: categories[0].ID, IsHot: true, SortOrder: 70, Status: 1},
		{Name: "通义千问", Description: "阿里云推出的AI大模型，支持多种场景的智能对话和内容生成。具备强大的逻辑推理和数学能力，与阿里云生态深度集成，适合企业级应用和开发者使用。", Icon: "🌌", URL: "https://qianwen.aliyun.com/", CategoryID: categories[0].ID, IsHot: true, SortOrder: 65, Status: 1},
		{Name: "讯飞星火", Description: "科大讯飞研发的认知智能大模型，在语音交互和多模态能力方面独具优势。支持语音输入输出，在教育、办公等领域有广泛应用，是国内AI领域的重要力量。", Icon: "🔥", URL: "https://xinghuo.xfyun.cn/", CategoryID: categories[0].ID, SortOrder: 60, Status: 1},
		{Name: "Kimi (Moonshot)", Description: "Moonshot AI推出的智能助手，以支持超长文本处理为特色，可处理百万级token的上下文。在文档理解、代码分析、长篇创作等场景表现卓越，深受专业人士喜爱。", Icon: "🌙", URL: "https://kimi.moonshot.cn/", CategoryID: categories[0].ID, SortOrder: 55, Status: 1},

		// ========== 开发工具 ==========
		// 本站实现
		{Name: "JSON格式化", Description: "在线格式化 JSON 数据，提高可读性", Icon: "📄", URL: "", CategoryID: categories[1].ID, IsHot: true, SortOrder: 100, Status: 1},
		{Name: "Base64编码解码", Description: "字符串与 Base64 互转", Icon: "🔐", URL: "", CategoryID: categories[1].ID, IsHot: true, SortOrder: 95, Status: 1},
		{Name: "URL编码解码", Description: "URL 编码与解码工具", Icon: "🔗", URL: "", CategoryID: categories[1].ID, SortOrder: 90, Status: 1},
		{Name: "MD5加密", Description: "计算字符串的 MD5 哈希值", Icon: "🔒", URL: "", CategoryID: categories[1].ID, SortOrder: 85, Status: 1},
		{Name: "时间戳转换", Description: "快速转换 Unix 时间戳与标准时间", Icon: "⏰", URL: "", CategoryID: categories[1].ID, IsHot: true, SortOrder: 80, Status: 1},
		{Name: "正则表达式测试", Description: "在线测试和调试正则表达式", Icon: "⌨️", URL: "", CategoryID: categories[1].ID, SortOrder: 75, Status: 1},
		{Name: "UUID生成器", Description: "生成 UUID/GUID", Icon: "🔑", URL: "", CategoryID: categories[1].ID, SortOrder: 70, Status: 1},
		{Name: "SQL格式化", Description: "格式化 SQL 语句，提高可读性", Icon: "�️", URL: "", CategoryID: categories[1].ID, SortOrder: 65, Status: 1},
		// 外部链接
		{Name: "Postman", Description: "全球最流行的API开发和测试工具，提供完整的API生命周期管理。支持多种协议，内置Mock服务器，团队协作功能强大，是开发者必备的工具之一。", Icon: "🚀", URL: "https://www.postman.com/", CategoryID: categories[1].ID, IsForeign: true, SortOrder: 60, Status: 1},
		{Name: "Apifox", Description: "国产API开发协作平台，集成API设计、开发、测试、文档等全流程功能。界面友好，支持自动生成测试用例和文档，深受国内开发者喜爱。", Icon: "🦊", URL: "https://apifox.com/", CategoryID: categories[1].ID, IsHot: true, SortOrder: 55, Status: 1},

		// ========== 设计工具 ==========
		// 国外链接
		{Name: "Canva", Description: "全球知名的在线设计平台，提供海量模板和素材。无需专业设计技能即可创作出精美海报、社交媒体图片、演示文稿等，适合个人和企业使用。", Icon: "🎨", URL: "https://www.canva.com/", CategoryID: categories[2].ID, IsHot: true, IsForeign: true, SortOrder: 100, Status: 1},
		{Name: "Figma", Description: "流行的在线UI/UX设计工具，支持实时协作和版本控制。拥有强大的设计系统和插件生态，是设计师和产品团队的首选工具。", Icon: "✏️", URL: "https://www.figma.com/", CategoryID: categories[2].ID, IsHot: true, IsForeign: true, SortOrder: 95, Status: 1},
		// 国内链接
		{Name: "即时设计", Description: "国产在线UI设计工具，兼容Figma文件格式。提供丰富的组件库和设计资源，支持团队协作，是设计师的高效设计利器。", Icon: "🎯", URL: "https://js.design/", CategoryID: categories[2].ID, IsHot: true, SortOrder: 90, Status: 1},
		// 本站实现
		{Name: "图片压缩", Description: "在线压缩图片，减小体积", Icon: "🖼️", URL: "", CategoryID: categories[2].ID, SortOrder: 85, Status: 1},
		{Name: "图片裁剪", Description: "在线裁剪图片尺寸", Icon: "✂️", URL: "", CategoryID: categories[2].ID, SortOrder: 80, Status: 1},
		{Name: "图片格式转换", Description: "图片格式互转（JPG、PNG、WebP等）", Icon: "🔄", URL: "", CategoryID: categories[2].ID, SortOrder: 75, Status: 1},
		{Name: "在线抠图", Description: "AI 智能抠图工具", Icon: "✨", URL: "", CategoryID: categories[2].ID, SortOrder: 70, Status: 1},
		{Name: "Logo生成器", Description: "快速生成 Logo 设计", Icon: "🏷️", URL: "", CategoryID: categories[2].ID, SortOrder: 65, Status: 1},
		{Name: "配色生成器", Description: "生成和谐的配色方案", Icon: "🌈", URL: "", CategoryID: categories[2].ID, SortOrder: 60, Status: 1},
		{Name: "favicon生成器", Description: "生成网站图标", Icon: "🔹", URL: "", CategoryID: categories[2].ID, SortOrder: 55, Status: 1},

		// ========== 办公工具 ==========
		// 本站实现
		{Name: "PDF转Word", Description: "PDF 转 Word 文档", Icon: "�", URL: "", CategoryID: categories[3].ID, IsHot: true, SortOrder: 100, Status: 1},
		{Name: "Word转PDF", Description: "Word 转 PDF 文档", Icon: "📑", URL: "", CategoryID: categories[3].ID, IsHot: true, SortOrder: 95, Status: 1},
		{Name: "PDF合并", Description: "合并多个 PDF 文件", Icon: "📚", URL: "", CategoryID: categories[3].ID, SortOrder: 90, Status: 1},
		{Name: "PDF压缩", Description: "压缩 PDF 文件大小", Icon: "🗜️", URL: "", CategoryID: categories[3].ID, SortOrder: 85, Status: 1},
		{Name: "OCR文字识别", Description: "图片文字识别", Icon: "🔍", URL: "", CategoryID: categories[3].ID, SortOrder: 80, Status: 1},
		{Name: "简历生成器", Description: "快速生成专业简历", Icon: "💼", URL: "", CategoryID: categories[3].ID, SortOrder: 75, Status: 1},
		{Name: "在线记事本", Description: "在线记录和编辑文字", Icon: "📝", URL: "", CategoryID: categories[3].ID, SortOrder: 70, Status: 1},
		{Name: "待办清单", Description: "管理日常待办事项", Icon: "✅", URL: "", CategoryID: categories[3].ID, SortOrder: 65, Status: 1},
		// 外部链接
		{Name: "腾讯文档", Description: "腾讯推出的在线协作文档工具，支持多人实时协作编辑。提供文档、表格、幻灯片等多种格式，与微信深度集成，是团队协作的最佳选择之一。", Icon: "📝", URL: "https://docs.qq.com/", CategoryID: categories[3].ID, IsHot: true, SortOrder: 60, Status: 1},
		{Name: "Notion", Description: "一站式生产力工具，集笔记、任务管理、知识库于一体。支持丰富的块类型和数据库功能，可自定义工作流程，是高效工作的神器。", Icon: "📒", URL: "https://www.notion.so/", CategoryID: categories[3].ID, IsForeign: true, SortOrder: 55, Status: 1},

		// ========== SEO工具 ==========
		// 本站实现
		{Name: "关键词密度检测", Description: "检测文章关键词密度", Icon: "📊", URL: "", CategoryID: categories[4].ID, SortOrder: 100, Status: 1},
		{Name: "Meta标签生成", Description: "生成 SEO 友好的 Meta 标签", Icon: "🏷️", URL: "", CategoryID: categories[4].ID, SortOrder: 95, Status: 1},
		{Name: "Sitemap生成器", Description: "生成网站地图", Icon: "🗺️", URL: "", CategoryID: categories[4].ID, SortOrder: 90, Status: 1},
		{Name: "Robots生成器", Description: "生成 Robots.txt 文件", Icon: "�", URL: "", CategoryID: categories[4].ID, SortOrder: 85, Status: 1},
		{Name: "SEO标题检测", Description: "检测标题 SEO 优化程度", Icon: "🔍", URL: "", CategoryID: categories[4].ID, SortOrder: 80, Status: 1},
		// 外部链接
		{Name: "站长之家", Description: "国内知名的站长工具平台，提供域名查询、SEO检测、网站测速等丰富工具。界面简洁实用，数据准确，是站长日常工作的必备利器。", Icon: "🏠", URL: "https://tool.chinaz.com/", CategoryID: categories[4].ID, IsHot: true, SortOrder: 75, Status: 1},
		{Name: "爱站网", Description: "专业的SEO查询工具，提供网站排名查询、关键词分析、外链检测等功能。数据全面，分析深入，助力网站优化和流量提升。", Icon: "❤️", URL: "https://www.aizhan.com/", CategoryID: categories[4].ID, SortOrder: 70, Status: 1},
		{Name: "Ahrefs", Description: "全球领先的SEO分析工具，提供全面的关键词研究、竞争分析和外链分析。数据强大，功能专业，是SEO专家的首选工具。", Icon: "📈", URL: "https://ahrefs.com/", CategoryID: categories[4].ID, IsForeign: true, SortOrder: 65, Status: 1},
		{Name: "Semrush", Description: "一站式SEO和内容营销平台，集成关键词研究、内容优化、广告分析等功能。界面友好，报告详尽，适合各类规模的企业使用。", Icon: "💹", URL: "https://www.semrush.com/", CategoryID: categories[4].ID, IsForeign: true, SortOrder: 60, Status: 1},
		{Name: "Google Search Console", Description: "Google官方的网站管理工具，提供网站收录状态、搜索流量分析、索引问题检测等功能。帮助站长了解网站在搜索结果中的表现。", Icon: "🔷", URL: "https://search.google.com/search-console/", CategoryID: categories[4].ID, IsForeign: true, SortOrder: 55, Status: 1},

		// ========== 实用工具 ==========
		// 本站实现
		{Name: "单位换算", Description: "各种单位之间的换算", Icon: "📏", URL: "", CategoryID: categories[5].ID, SortOrder: 100, Status: 1},
		{Name: "汇率换算", Description: "实时汇率查询和换算", Icon: "💱", URL: "", CategoryID: categories[5].ID, IsHot: true, SortOrder: 95, Status: 1},
		{Name: "日期计算器", Description: "计算日期差和工作日", Icon: "📅", URL: "", CategoryID: categories[5].ID, SortOrder: 90, Status: 1},
		{Name: "年龄计算器", Description: "计算年龄和生肖", Icon: "🎂", URL: "", CategoryID: categories[5].ID, SortOrder: 85, Status: 1},
		{Name: "随机密码生成", Description: "生成安全的随机密码", Icon: "🛡️", URL: "", CategoryID: categories[5].ID, IsHot: true, SortOrder: 80, Status: 1},
		{Name: "二维码生成", Description: "生成二维码", Icon: "📱", URL: "", CategoryID: categories[5].ID, SortOrder: 75, Status: 1},
		{Name: "短链接生成", Description: "生成短链接", Icon: "🔗", URL: "", CategoryID: categories[5].ID, SortOrder: 70, Status: 1},
		{Name: "IP查询", Description: "查询 IP 地址信息", Icon: "🌐", URL: "", CategoryID: categories[5].ID, SortOrder: 65, Status: 1},
		{Name: "天气查询", Description: "查询实时天气和预报", Icon: "🌤️", URL: "", CategoryID: categories[5].ID, IsHot: true, SortOrder: 60, Status: 1},
		{Name: "在线计算器", Description: "在线科学计算器", Icon: "🧮", URL: "", CategoryID: categories[5].ID, SortOrder: 55, Status: 1},
	}

	for i := range tools {
		if err := DB.Create(&tools[i]).Error; err != nil {
			log.Printf("创建工具失败: %v", err)
		}
	}

	log.Println("默认分类和工具数据初始化完成！")
}
