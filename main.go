package main

import (
	"os"
	"runtime"

	"github.com/gin-gonic/gin"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/handler"
	"tools.jinbox.cn/internal/middleware"
	"tools.jinbox.cn/pkg/logger"
)

var (
	version   = "dev"
	branch    = "unknown"
	commit    = "unknown"
	goVersion = runtime.Version()
)

func main() {
	// 初始化日志系统
	if err := logger.InitLogger("./logs", logger.INFO); err != nil {
		panic("日志系统初始化失败: " + err.Error())
	}

	// 输出版本信息
	logger.Info("========================================")
	logger.Info("服务启动 | 版本:%s | 分支:%s | Commit:%s | Go版本:%s", version, branch, commit, goVersion)
	logger.Info("========================================")

	// 初始化数据库
	config.InitDB()

	// 自动生成静态数据文件
	if err := handler.AutoGenerateStaticData(); err != nil {
		logger.Warning("自动生成静态数据失败: %v", err)
	}

	// 创建Gin引擎（使用自定义日志中间件）
	r := gin.New()
	r.Use(logger.GinLoggerMiddleware(), logger.GinRecoveryMiddleware())

	// 配置CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// 提供静态文件服务（前端页面）
	r.StaticFile("/", "./frontend/index.html")
	r.Static("/css", "./frontend/css")
	r.Static("/js", "./frontend/js")
	r.Static("/assets", "./frontend/assets")
	r.Static("/uploads", "./uploads")
	r.StaticFile("/data.json", "./frontend/data.json")

	// 公共路由
	public := r.Group("/api")
	{
		// 登录接口
		public.POST("/login", handler.Login)

		// 注册接口
		public.POST("/register", handler.Register)

		// 获取工具列表（无需登录）
		public.GET("/tools", handler.ListTools)
		public.GET("/tools/hot", handler.GetHotTools)
		public.GET("/tools/:id", handler.GetTool)
		public.POST("/tools/:id/use", handler.UseTool)

		// 获取分类列表（无需登录）
		public.GET("/categories", handler.ListCategories)
		public.GET("/categories/:id", handler.GetCategory)
		public.GET("/categories/tools", handler.GetCategoriesWithTools)

		// 浏览历史
		public.POST("/history", handler.SaveHistory)
		public.GET("/history", handler.GetHistory)
		public.DELETE("/history", handler.ClearHistory)

		// 二维码生成API
		public.GET("/qrcode/generate", handler.GenerateQRCode)
		public.POST("/qrcode/generate", handler.GenerateQRCode)
		public.GET("/qrcode/logo", handler.GenerateQRCode)
		public.POST("/qrcode/logo", handler.GenerateQRCode)
	}

	// 私有路由（需要JWT认证）
	authRoutes := r.Group("/api")
	authRoutes.Use(middleware.JWTAuthenticate())
	{
		// 反馈接口（需要登录）
		authRoutes.POST("/feedback", handler.SubmitFeedback)
		authRoutes.GET("/feedback/remaining", handler.GetFeedbackRemaining)
	}

	// 工具详情页面路由 - 支持多种格式
	r.GET("/tool", func(c *gin.Context) {
		c.File("./frontend/tool.html")
	})
	r.GET("/tool/:id", func(c *gin.Context) {
		c.File("./frontend/tool.html")
	})
	r.GET("/tool/:id/:slug", func(c *gin.Context) {
		c.File("./frontend/tool.html")
	})

	// 分类页面路由
	r.GET("/category/:id", func(c *gin.Context) {
		c.File("./frontend/index.html")
	})
	r.GET("/category/:id/:name", func(c *gin.Context) {
		c.File("./frontend/index.html")
	})

	// Sitemap
	r.GET("/sitemap.xml", handler.GenerateSitemap)

	// 二维码工具页面路由 - 支持独立路径用于SEO
	r.GET("/qrcode", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})
	r.GET("/qrcode/text", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})
	r.GET("/qrcode/url", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})
	r.GET("/qrcode/wifi", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})
	r.GET("/qrcode/contact", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})
	r.GET("/qrcode/phone", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})
	r.GET("/qrcode/email", func(c *gin.Context) {
		c.File("./frontend/qrcode.html")
	})

	// JSON工具页面路由 - 支持独立路径用于SEO
	r.GET("/json", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/format", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/parse", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/compress", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/view", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/color", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/xml", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/entity", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/compare", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/editor", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/excel", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/tutorial", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})
	r.GET("/json/csv", func(c *gin.Context) {
		c.File("./frontend/json.html")
	})

	// 管理员后台页面路由
	r.GET("/admin", func(c *gin.Context) {
		c.File("./frontend/admin.html")
	})

	// 私有路由（需要JWT认证）
	private := r.Group("/api/admin")
	private.Use(middleware.JWTAuthenticate())
	{
		// 管理后台需要管理员权限
		adminRoutes := private.Group("")
		adminRoutes.Use(middleware.RequireAdmin())
		{
			// 个人信息
			adminRoutes.GET("/profile", handler.GetProfile)
			adminRoutes.PUT("/password", handler.UpdatePassword)

			// 收藏夹管理
			adminRoutes.GET("/favorites", handler.GetFavorites)
			adminRoutes.POST("/favorites", handler.AddFavorite)
			adminRoutes.DELETE("/favorites/:id", handler.RemoveFavorite)

			// 工具管理
			adminRoutes.POST("/tools", handler.CreateTool)
			adminRoutes.PUT("/tools/:id", handler.UpdateTool)
			adminRoutes.DELETE("/tools/:id", handler.DeleteTool)

			// 分类管理
			adminRoutes.POST("/categories", handler.CreateCategory)
			adminRoutes.PUT("/categories/:id", handler.UpdateCategory)
			adminRoutes.DELETE("/categories/:id", handler.DeleteCategory)

			// 创建管理员
			adminRoutes.POST("/admins", handler.CreateAdmin)

			// 导出数据
			adminRoutes.GET("/export", handler.ExportData)
			// 生成静态数据文件
			adminRoutes.POST("/generate-static-data", handler.GenerateStaticData)
			// 重新从CSV加载数据
			adminRoutes.POST("/reload-csv", func(c *gin.Context) {
				if err := handler.ReloadDataFromCSV(); err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				c.JSON(200, gin.H{"message": "CSV数据重新加载成功"})
			})
			// 上传CSV文件
			adminRoutes.POST("/upload-csv", handler.UploadCSV)
			// 反馈管理
			adminRoutes.GET("/feedbacks", handler.GetFeedbacks)
			adminRoutes.DELETE("/feedbacks/:id", handler.DeleteFeedback)

			// 用户管理
			adminRoutes.GET("/admins", handler.GetAllAdmins)
			adminRoutes.PUT("/admins/:id/password", handler.ResetAdminPassword)
			adminRoutes.PUT("/admins/:id/status", handler.UpdateAdminStatus)
			adminRoutes.DELETE("/admins/:id", handler.DeleteAdmin)
		}
	}

	// 获取端口
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	// 启动服务
	logger.Info("服务启动成功，监听端口: %s", port)
	logger.Fatal("服务运行失败: %v", r.Run(":"+port))
}
