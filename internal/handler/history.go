package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jinzhu/gorm"

	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/model"
)

// SaveHistoryRequest 保存浏览记录请求
type SaveHistoryRequest struct {
	ToolID   uint   `json:"tool_id" binding:"required"`
	ToolName string `json:"tool_name" binding:"required"`
	ToolIcon string `json:"tool_icon"`
}

// SaveHistory 保存浏览记录
func SaveHistory(c *gin.Context) {
	var req SaveHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": -1, "message": "请求参数错误"})
		return
	}

	// 获取用户信息
	userID := c.GetUint("admin_id")
	sessionKey := c.GetHeader("X-Session-Key")

	// 检查是否已经存在相同的浏览记录（最近5分钟内）
	var existing model.BrowseHistory
	var query *gorm.DB
	if userID > 0 {
		query = config.DB.Where("user_id = ? AND tool_id = ?", userID, req.ToolID)
	} else if sessionKey != "" {
		query = config.DB.Where("session_key = ? AND tool_id = ?", sessionKey, req.ToolID)
	}

	if query != nil {
		query.First(&existing)
		if existing.ID > 0 {
			// 更新时间戳，不重复记录
			config.DB.Model(&existing).Update("created_at", gorm.Expr("NOW()"))
			c.JSON(http.StatusOK, gin.H{"code": 0, "message": "更新成功"})
			return
		}
	}

	// 创建新记录
	history := &model.BrowseHistory{
		UserID:     userID,
		ToolID:     req.ToolID,
		ToolName:   req.ToolName,
		ToolIcon:   req.ToolIcon,
		SessionKey: sessionKey,
	}

	if err := model.CreateHistory(config.DB, history); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "保存失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "保存成功"})
}

// GetHistory 获取浏览历史
func GetHistory(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit > 50 {
		limit = 50
	}

	userID := c.GetUint("admin_id")
	sessionKey := c.GetHeader("X-Session-Key")

	histories, err := model.GetUserHistory(config.DB, userID, sessionKey, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "获取失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "data": histories})
}

// ClearHistory 清空浏览历史
func ClearHistory(c *gin.Context) {
	userID := c.GetUint("admin_id")
	sessionKey := c.GetHeader("X-Session-Key")

	if err := model.ClearUserHistory(config.DB, userID, sessionKey); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "清空失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": 0, "message": "清空成功"})
}
