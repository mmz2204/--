package handler

import (
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"time"

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

// 生成随机字符串
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// 确保上传目录存在
func ensureUploadDir() string {
	uploadDir := "./uploads/feedback"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}
	return uploadDir
}

// 保存图片文件，返回相对路径
func saveImageFile(file io.Reader, filename string) (string, error) {
	uploadDir := ensureUploadDir()
	ext := filepath.Ext(filename)
	newFilename := fmt.Sprintf("feedback_%d_%s%s", time.Now().UnixNano(), generateRandomString(8), ext)
	filepath := filepath.Join(uploadDir, newFilename)

	dst, err := os.Create(filepath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	_, err = io.Copy(dst, file)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("/uploads/feedback/%s", newFilename), nil
}

// SubmitFeedback 提交反馈
func SubmitFeedback(c *gin.Context) {
	// 解析多部分表单
	err := c.Request.ParseMultipartForm(5 << 20) // 5MB
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "解析表单失败"})
		return
	}

	// 从JWT获取用户信息
	userID, exists := c.Get("admin_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	uid := userID.(uint)

	// 检查今日反馈次数
	todayCount, err := model.GetUserTodayFeedbackCount(config.DB, uid)
	if err != nil {
		log.Printf("查询今日反馈次数失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器错误"})
		return
	}
	if todayCount >= 5 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "今日反馈次数已达上限（5次），请明天再试"})
		return
	}

	// 获取反馈内容
	content := c.Request.FormValue("content")
	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入反馈内容"})
		return
	}

	// 获取用户信息
	var user model.Admin
	err = config.DB.First(&user, uid).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	// 创建反馈
	feedback := &model.Feedback{
		UserID:   uid,
		Username: user.Username,
		Content:  content,
	}

	// 处理图片1
	if file, header, err := c.Request.FormFile("image1"); err == nil {
		defer file.Close()
		// 检查大小不超过5MB
		if header.Size > 5*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "图片1大小不能超过5MB"})
			return
		}
		imgPath, err := saveImageFile(file, header.Filename)
		if err == nil {
			feedback.Image1 = imgPath
		}
	}

	// 处理图片2
	if file, header, err := c.Request.FormFile("image2"); err == nil {
		defer file.Close()
		// 检查大小不超过5MB
		if header.Size > 5*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "图片2大小不能超过5MB"})
			return
		}
		imgPath, err := saveImageFile(file, header.Filename)
		if err == nil {
			feedback.Image2 = imgPath
		}
	}

	// 保存到数据库
	err = model.CreateFeedback(config.DB, feedback)
	if err != nil {
		log.Printf("保存反馈失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "反馈提交成功",
		"remaining": 5 - todayCount - 1,
	})
}

// GetFeedbackRemaining 获取用户今日剩余反馈次数
func GetFeedbackRemaining(c *gin.Context) {
	userID, exists := c.Get("admin_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "请先登录"})
		return
	}

	uid := userID.(uint)
	todayCount, err := model.GetUserTodayFeedbackCount(config.DB, uid)
	if err != nil {
		log.Printf("查询今日反馈次数失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器错误"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"remaining": 5 - todayCount,
	})
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

// GetFeedbacks 获取所有反馈列表
func GetFeedbacks(c *gin.Context) {
	feedbacks, err := model.GetFeedbacks(config.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取反馈列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "获取成功",
		"data":    feedbacks,
	})
}

// DeleteFeedback 删除反馈
func DeleteFeedback(c *gin.Context) {
	id := c.Param("id")

	if err := config.DB.Delete(&model.Feedback{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除反馈失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}

// AdminResponse 管理员响应结构体（不包含密码）
type AdminResponse struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	IsAdmin   bool      `json:"is_admin"`
	Status    int       `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GetAllAdmins 获取所有管理员列表
func GetAllAdmins(c *gin.Context) {
	admins, err := model.GetAllAdmins(config.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取管理员列表失败"})
		return
	}

	// 构建响应数据（不包含密码）
	var response []AdminResponse
	for _, admin := range admins {
		response = append(response, AdminResponse{
			ID:        admin.ID,
			Username:  admin.Username,
			Email:     admin.Email,
			IsAdmin:   admin.IsAdmin,
			Status:    admin.Status,
			CreatedAt: admin.CreatedAt,
			UpdatedAt: admin.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "获取成功",
		"data":    response,
	})
}

// ResetPasswordRequest 重置密码请求结构体
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password" binding:"required"`
}

// StatusRequest 更新状态请求结构体
type StatusRequest struct {
	Status int `json:"status" binding:"required"`
}

// ResetAdminPassword 重置管理员密码
func ResetAdminPassword(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	var admin model.Admin
	if err := config.DB.First(&admin, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
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
		"message": "密码重置成功",
	})
}

// UpdateAdminStatus 更新管理员状态
func UpdateAdminStatus(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	var req StatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 参数验证：状态值只能是0或1
	if req.Status != 0 && req.Status != 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "状态值只能为0(禁用)或1(启用)"})
		return
	}

	var admin model.Admin
	if err := config.DB.First(&admin, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		return
	}

	admin.Status = req.Status
	if err := config.DB.Save(&admin).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新状态失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "状态更新成功",
	})
}

// DeleteAdmin 删除管理员
func DeleteAdmin(c *gin.Context) {
	idStr := c.Param("id")
	var id uint
	if _, err := fmt.Sscanf(idStr, "%d", &id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的ID"})
		return
	}

	// 不能删除自己
	currentID := c.GetUint("admin_id")
	if currentID == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不能删除自己"})
		return
	}

	if err := model.DeleteAdmin(config.DB, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除管理员失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "删除成功",
	})
}
