package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/handler"
	"tools.jinbox.cn/internal/middleware"
)

func main() {
	// 初始化数据库
	config.InitDB()

	// 创建Gin引擎
	r := gin.Default()

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

	// 公共路由
	public := r.Group("/api")
	{
		// 登录接口
		public.POST("/login", handler.Login)

		// 反馈接口
		public.POST("/feedback", handler.SubmitFeedback)

		// 获取工具列表（无需登录）
		public.GET("/tools", handler.ListTools)
		public.GET("/tools/hot", handler.GetHotTools)
		public.GET("/tools/:id", handler.GetTool)
		public.POST("/tools/:id/use", handler.UseTool)

		// 获取分类列表（无需登录）
		public.GET("/categories", handler.ListCategories)
		public.GET("/categories/:id", handler.GetCategory)
		public.GET("/categories/tools", handler.GetCategoriesWithTools)
	}

	// 私有路由（需要JWT认证）
	private := r.Group("/api/admin")
	private.Use(middleware.JWTAuthenticate())
	{
		// 获取当前用户信息
		private.GET("/profile", handler.GetProfile)

		// 工具管理
		private.POST("/tools", handler.CreateTool)
		private.PUT("/tools/:id", handler.UpdateTool)
		private.DELETE("/tools/:id", handler.DeleteTool)

		// 分类管理
		private.POST("/categories", handler.CreateCategory)
		private.PUT("/categories/:id", handler.UpdateCategory)
		private.DELETE("/categories/:id", handler.DeleteCategory)

		// 创建管理员（初始化用）
		private.POST("/admins", handler.CreateAdmin)
	}

	// 获取端口
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}

	// 启动服务
	log.Printf("服务启动成功，监听端口: %s", port)
	log.Fatal(r.Run(":" + port))
}
