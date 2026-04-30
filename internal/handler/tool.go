package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/model"
)

// CreateToolRequest 创建工具请求结构体
type CreateToolRequest struct {
	Name                string `json:"name" binding:"required"`        // 工具名称
	Description         string `json:"description"`                    // 工具描述
	DetailedDescription string `json:"detailed_description"`           // 详细描述
	Icon                string `json:"icon"`                           // 工具图标
	URL                 string `json:"url"`                            // 工具地址
	Type                int    `json:"type" default:"1"`               // 工具类型：1外部链接，2本站工具，3本站链接
	CategoryID          uint   `json:"category_id" binding:"required"` // 分类ID
	IsHot               bool   `json:"is_hot"`                         // 是否火热
	IsForeign           bool   `json:"is_foreign"`                     // 是否国外工具
	SortOrder           int    `json:"sort_order"`                     // 排序
}

// CreateTool 创建工具
func CreateTool(c *gin.Context) {
	var req CreateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 默认类型为1
	if req.Type == 0 {
		req.Type = 1
	}

	tool := &model.Tool{
		Name:                req.Name,
		Description:         req.Description,
		DetailedDescription: req.DetailedDescription,
		Icon:                req.Icon,
		URL:                 req.URL,
		Type:                req.Type,
		CategoryID:          req.CategoryID,
		IsHot:               req.IsHot,
		IsForeign:           req.IsForeign,
		SortOrder:           req.SortOrder,
		Status:              1,
	}

	if err := model.CreateTool(config.DB, tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建工具失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "创建成功", "data": tool})
}

// UpdateToolRequest 更新工具请求结构体
type UpdateToolRequest struct {
	Name                string `json:"name"`                 // 工具名称
	Description         string `json:"description"`          // 工具描述
	DetailedDescription string `json:"detailed_description"` // 详细描述
	Icon                string `json:"icon"`                 // 工具图标
	URL                 string `json:"url"`                  // 工具地址
	Type                int    `json:"type"`                 // 工具类型
	CategoryID          uint   `json:"category_id"`          // 分类ID
	IsHot               bool   `json:"is_hot"`               // 是否火热
	IsForeign           bool   `json:"is_foreign"`           // 是否国外工具
	SortOrder           int    `json:"sort_order"`           // 排序
	Status              int    `json:"status"`               // 状态
}

// UpdateTool 更新工具
func UpdateTool(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的工具ID"})
		return
	}

	tool, err := model.GetToolByID(config.DB, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "工具不存在"})
		return
	}

	var req UpdateToolRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 更新字段
	if req.Name != "" {
		tool.Name = req.Name
	}
	if req.Description != "" {
		tool.Description = req.Description
	}
	if req.DetailedDescription != "" {
		tool.DetailedDescription = req.DetailedDescription
	}
	if req.Icon != "" {
		tool.Icon = req.Icon
	}
	if req.URL != "" {
		tool.URL = req.URL
	}
	if req.Type != 0 {
		tool.Type = req.Type
	}
	if req.CategoryID != 0 {
		tool.CategoryID = req.CategoryID
	}
	tool.IsHot = req.IsHot
	tool.IsForeign = req.IsForeign
	tool.SortOrder = req.SortOrder
	tool.Status = req.Status

	if err := model.UpdateTool(config.DB, tool); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新工具失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功", "data": tool})
}

// DeleteTool 删除工具
func DeleteTool(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的工具ID"})
		return
	}

	if err := model.DeleteTool(config.DB, uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除工具失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// GetTool 获取单个工具
func GetTool(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的工具ID"})
		return
	}

	tool, err := model.GetToolByID(config.DB, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "工具不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tool})
}

// ListTools 获取工具列表
func ListTools(c *gin.Context) {
	categoryIDStr := c.Query("category_id")
	if categoryIDStr != "" {
		categoryID, err := strconv.ParseUint(categoryIDStr, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的分类ID"})
			return
		}
		tools, err := model.GetToolsByCategory(config.DB, uint(categoryID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取工具列表失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": tools})
		return
	}

	tools, err := model.GetAllTools(config.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取工具列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tools})
}

// GetHotTools 获取火热工具
func GetHotTools(c *gin.Context) {
	tools, err := model.GetHotTools(config.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取火热工具失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tools})
}

// UseTool 记录工具使用
func UseTool(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的工具ID"})
		return
	}

	if err := model.IncreaseUsageCount(config.DB, uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "记录使用失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "记录成功"})
}
