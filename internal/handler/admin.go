package handler

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/model"
	"tools.jinbox.cn/pkg/utils"
)

// LoginRequest 登录请求结构体
type LoginRequest struct {
	Username string `json:"username" binding:"required"` // 用户名
	Password string `json:"password" binding:"required"` // 密码
}

// Login 管理员登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 根据用户名查找管理员
	admin, err := model.GetAdminByUsername(config.DB, req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	// 验证密码
	if !admin.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户名或密码错误"})
		return
	}

	// 生成JWT token
	token, err := utils.GenerateToken(admin.ID, admin.Username, admin.IsAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成token失败"})
		return
	}

	// 获取用户收藏夹
	var favorites []model.Favorite
	config.DB.Where("user_id = ?", admin.ID).Order("created_at DESC").Find(&favorites)

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "登录成功",
		"data": gin.H{
			"id":        admin.ID,
			"username":  admin.Username,
			"email":     admin.Email,
			"is_admin":  admin.IsAdmin,
			"token":     token,
			"favorites": favorites,
		},
	})
}

// GetProfile 获取当前管理员信息
func GetProfile(c *gin.Context) {
	id := c.GetUint("admin_id")

	var admin model.Admin
	if err := config.DB.First(&admin, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	var favorites []model.Favorite
	config.DB.Where("user_id = ?", id).Order("created_at DESC").Find(&favorites)

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"id":        admin.ID,
			"username":  admin.Username,
			"email":     admin.Email,
			"is_admin":  admin.IsAdmin,
			"favorites": favorites,
		},
	})
}

// Register 注册新用户
func Register(c *gin.Context) {
	var req CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 检查用户名是否已存在
	existingAdmin, err := model.GetAdminByUsername(config.DB, req.Username)
	if err == nil && existingAdmin.ID > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名已存在"})
		return
	}

	// 创建新用户（普通用户，is_admin=false）
	admin := &model.Admin{
		Username: req.Username,
		Email:    req.Email,
		IsAdmin:  false,
	}
	admin.SetPassword(req.Password)

	if err := model.CreateAdmin(config.DB, admin); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建用户失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "注册成功",
	})
}

// CreateAdminRequest 创建管理员请求结构体
type CreateAdminRequest struct {
	Username string `json:"username" binding:"required"` // 用户名
	Password string `json:"password" binding:"required"` // 密码
	Email    string `json:"email"`                       // 邮箱
}

// FeedbackRequest 反馈请求结构体
type FeedbackRequest struct {
	Content string `json:"content" binding:"required"` // 反馈内容
}

// UpdatePasswordRequest 修改密码请求结构体
type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"` // 当前密码
	NewPassword string `json:"new_password" binding:"required"` // 新密码
}

// UpdatePassword 修改密码
func UpdatePassword(c *gin.Context) {
	id := c.GetUint("admin_id")

	var req UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	var admin model.Admin
	if err := config.DB.First(&admin, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	if !admin.CheckPassword(req.OldPassword) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "当前密码错误"})
		return
	}

	if err := admin.SetPassword(req.NewPassword); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "密码加密失败"})
		return
	}

	if err := config.DB.Save(&admin).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存密码失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "密码修改成功",
	})
}

// SubmitFeedback 提交反馈
func SubmitFeedback(c *gin.Context) {
	var req FeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入反馈内容"})
		return
	}

	log.Printf("收到用户反馈: %s", req.Content)

	c.JSON(http.StatusOK, gin.H{"message": "反馈已提交，感谢您的意见！"})
}

// CreateAdmin 创建管理员（用于初始化）
func CreateAdmin(c *gin.Context) {
	var req CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 创建管理员
	admin := &model.Admin{
		Username: req.Username,
		Email:    req.Email,
	}

	// 设置密码（加密）
	if err := admin.SetPassword(req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "设置密码失败"})
		return
	}

	// 保存到数据库
	if err := model.CreateAdmin(config.DB, admin); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建管理员失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "创建成功", "data": admin})
}

// ExportData 导出分类和工具数据（JSON格式）
func ExportData(c *gin.Context) {
	// 获取所有启用的分类
	var categories []model.Category
	if err := config.DB.Where("status = ?", 1).Order("sort_order DESC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取分类数据失败"})
		return
	}

	// 获取所有启用的工具
	var tools []model.Tool
	if err := config.DB.Where("status = ?", 1).Order("sort_order DESC").Find(&tools).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取工具数据失败"})
		return
	}

	// 构建导出数据结构
	type ExportTool struct {
		ID          uint   `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Icon        string `json:"icon"`
		URL         string `json:"url"`
		CategoryID  uint   `json:"category_id"`
		IsHot       bool   `json:"is_hot"`
		SortOrder   int    `json:"sort_order"`
	}

	type ExportCategory struct {
		ID        uint         `json:"id"`
		Name      string       `json:"name"`
		Icon      string       `json:"icon"`
		SortOrder int          `json:"sort_order"`
		Tools     []ExportTool `json:"tools"`
	}

	// 组织数据
	var exportData []ExportCategory
	for _, cat := range categories {
		ec := ExportCategory{
			ID:        cat.ID,
			Name:      cat.Name,
			Icon:      cat.Icon,
			SortOrder: cat.SortOrder,
		}
		// 找出属于这个分类的工具
		for _, tool := range tools {
			if tool.CategoryID == cat.ID {
				ec.Tools = append(ec.Tools, ExportTool{
					ID:          tool.ID,
					Name:        tool.Name,
					Description: tool.Description,
					Icon:        tool.Icon,
					URL:         tool.URL,
					CategoryID:  tool.CategoryID,
					IsHot:       tool.IsHot,
					SortOrder:   tool.SortOrder,
				})
			}
		}
		exportData = append(exportData, ec)
	}

	// 设置响应头
	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", "attachment; filename=tools_data.json")
	c.JSON(http.StatusOK, exportData)
}

// UploadCSV 上传CSV文件
func UploadCSV(c *gin.Context) {
	// 创建数据目录（如果不存在）
	dataDir := "./data"
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建目录失败"})
		return
	}

	// 处理分类CSV文件
	categoriesFile, err := c.FormFile("categories")
	if err == nil {
		// 检查文件类型
		ext := filepath.Ext(categoriesFile.Filename)
		if ext != ".csv" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "categories文件必须是CSV格式"})
			return
		}

		// 保存文件
		categoriesPath := filepath.Join(dataDir, "categories.csv")
		if err := c.SaveUploadedFile(categoriesFile, categoriesPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存categories文件失败"})
			return
		}
	}

	// 处理工具CSV文件
	toolsFile, err := c.FormFile("tools")
	if err == nil {
		// 检查文件类型
		ext := filepath.Ext(toolsFile.Filename)
		if ext != ".csv" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tools文件必须是CSV格式"})
			return
		}

		// 保存文件
		toolsPath := filepath.Join(dataDir, "tools.csv")
		if err := c.SaveUploadedFile(toolsFile, toolsPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存tools文件失败"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "CSV文件上传成功"})
}

// ReloadCSV 重新加载CSV数据
func ReloadCSV(c *gin.Context) {
	// 使用现有的重新加载函数
	if err := ReloadDataFromCSV(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "CSV数据重新加载成功"})
}
