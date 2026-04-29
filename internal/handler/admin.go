package handler

import (
	"log"
	"net/http"

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
	token, err := utils.GenerateToken(admin.ID, admin.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成token失败"})
		return
	}

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"message": "登录成功",
		"data": gin.H{
			"id":       admin.ID,
			"username": admin.Username,
			"email":    admin.Email,
			"token":    token,
		},
	})
}

// GetProfile 获取当前管理员信息
func GetProfile(c *gin.Context) {
	// 从上下文获取管理员信息
	id := c.GetUint("admin_id")
	username := c.GetString("admin_username")

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":       id,
			"username": username,
		},
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

// SubmitFeedback 提交反馈
func SubmitFeedback(c *gin.Context) {
	var req FeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入反馈内容"})
		return
	}

	// 这里可以将反馈保存到数据库或发送邮件
	// 目前只是模拟成功
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
