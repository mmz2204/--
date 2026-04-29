package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/model"
)

// CreateCategoryRequest 创建分类请求结构体
type CreateCategoryRequest struct {
	Name      string `json:"name" binding:"required"` // 分类名称
	Icon      string `json:"icon"`                    // 分类图标
	SortOrder int    `json:"sort_order"`              // 排序
}

// CreateCategory 创建分类
func CreateCategory(c *gin.Context) {
	var req CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	category := &model.Category{
		Name:      req.Name,
		Icon:      req.Icon,
		SortOrder: req.SortOrder,
		Status:    1,
	}

	if err := model.CreateCategory(config.DB, category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建分类失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "创建成功", "data": category})
}

// UpdateCategoryRequest 更新分类请求结构体
type UpdateCategoryRequest struct {
	Name      string `json:"name"`       // 分类名称
	Icon      string `json:"icon"`       // 分类图标
	SortOrder int    `json:"sort_order"` // 排序
	Status    int    `json:"status"`     // 状态
}

// UpdateCategory 更新分类
func UpdateCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的分类ID"})
		return
	}

	category, err := model.GetCategoryByID(config.DB, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "分类不存在"})
		return
	}

	var req UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	// 更新字段
	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Icon != "" {
		category.Icon = req.Icon
	}
	category.SortOrder = req.SortOrder
	category.Status = req.Status

	if err := model.UpdateCategory(config.DB, category); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新分类失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "更新成功", "data": category})
}

// DeleteCategory 删除分类
func DeleteCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的分类ID"})
		return
	}

	if err := model.DeleteCategory(config.DB, uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除分类失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// GetCategory 获取单个分类
func GetCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的分类ID"})
		return
	}

	category, err := model.GetCategoryByID(config.DB, uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "分类不存在"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": category})
}

// ListCategories 获取分类列表
func ListCategories(c *gin.Context) {
	categories, err := model.GetAllCategories(config.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取分类列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": categories})
}

// GetCategoriesWithTools 获取分类及下属工具
func GetCategoriesWithTools(c *gin.Context) {
	categories, err := model.GetCategoryWithTools(config.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取分类列表失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": categories})
}
