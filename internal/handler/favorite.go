package handler

import (
	"net/http"
	"strconv"
	"time"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/model"

	"github.com/gin-gonic/gin"
)

type CreateFavoriteRequest struct {
	ToolID uint `json:"tool_id" binding:"required"`
}

// GetFavorites 获取用户收藏列表（包含工具详情）
func GetFavorites(c *gin.Context) {
	userID := c.GetUint("admin_id")

	type FavoriteWithTool struct {
		model.Favorite
		Tool model.Tool `json:"tool"`
	}

	var favoriteIDs []uint
	if err := config.DB.Model(&model.Favorite{}).Where("user_id = ?", userID).Order("created_at DESC").Pluck("tool_id", &favoriteIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取收藏列表失败"})
		return
	}

	var tools []model.Tool
	if len(favoriteIDs) > 0 {
		if err := config.DB.Where("id IN (?)", favoriteIDs).Find(&tools).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取工具信息失败"})
			return
		}
	}

	toolMap := make(map[uint]model.Tool)
	for _, t := range tools {
		toolMap[t.ID] = t
	}

	var favorites []model.Favorite
	config.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&favorites)

	type Result struct {
		ID        uint      `json:"id"`
		ToolID    uint      `json:"tool_id"`
		CreatedAt time.Time `json:"created_at"`
		Tool      model.Tool `json:"tool"`
	}

	var results []Result
	for _, f := range favorites {
		if t, ok := toolMap[f.ToolID]; ok {
			results = append(results, Result{
				ID:        f.ID,
				ToolID:    f.ToolID,
				CreatedAt: f.CreatedAt,
				Tool:      t,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "获取成功",
		"data":    results,
	})
}

// AddFavorite 添加收藏
func AddFavorite(c *gin.Context) {
	userID := c.GetUint("admin_id")

	var req CreateFavoriteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求参数错误"})
		return
	}

	var existing model.Favorite
	err := config.DB.Where("user_id = ? AND tool_id = ?", userID, req.ToolID).First(&existing).Error
	if err == nil && existing.ID > 0 {
		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "已收藏",
		})
		return
	}

	favorite := &model.Favorite{
		UserID: userID,
		ToolID: req.ToolID,
	}

	if err := config.DB.Create(favorite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "添加收藏失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "添加成功",
		"data":    favorite,
	})
}

// RemoveFavorite 取消收藏
func RemoveFavorite(c *gin.Context) {
	userID := c.GetUint("admin_id")
	toolIDStr := c.Param("id")
	
	toolID, err := strconv.ParseUint(toolIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的工具ID"})
		return
	}

	if err := config.DB.Where("user_id = ? AND tool_id = ?", userID, toolID).Delete(&model.Favorite{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "取消收藏失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "已取消收藏",
	})
}