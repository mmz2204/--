package model

import (
	"time"

	"github.com/jinzhu/gorm"
)

// Tool 工具模型
type Tool struct {
	ID                  uint      `gorm:"primary_key" json:"id"`                 // 工具ID
	Name                string    `gorm:"size:100;not null" json:"name"`         // 工具名称
	Description         string    `gorm:"size:500" json:"description"`           // 工具描述
	DetailedDescription string    `gorm:"size:1000" json:"detailed_description"` // 详细描述（约100字）
	Icon                string    `gorm:"size:255" json:"icon"`                  // 工具图标URL
	URL                 string    `gorm:"size:500" json:"url"`                   // 工具访问地址（空表示本站工具）
	CategoryID          uint      `gorm:"not null" json:"category_id"`           // 所属分类ID
	IsHot               bool      `gorm:"default:false" json:"is_hot"`           // 是否火热工具
	IsForeign           bool      `gorm:"default:false" json:"is_foreign"`       // 是否国外工具
	UsageCount          int       `gorm:"default:0" json:"usage_count"`          // 使用次数
	SortOrder           int       `gorm:"default:0" json:"sort_order"`           // 排序顺序
	Status              int       `gorm:"default:1" json:"status"`               // 状态：0禁用，1启用
	CreatedAt           time.Time `json:"created_at"`                            // 创建时间
	UpdatedAt           time.Time `json:"updated_at"`                            // 更新时间
}

// TableName 指定表名
func (Tool) TableName() string {
	return "tools"
}

// CreateTool 创建工具
func CreateTool(db *gorm.DB, tool *Tool) error {
	return db.Create(tool).Error
}

// GetToolByID 根据ID获取工具
func GetToolByID(db *gorm.DB, id uint) (*Tool, error) {
	var tool Tool
	err := db.First(&tool, id).Error
	return &tool, err
}

// GetAllTools 获取所有工具
func GetAllTools(db *gorm.DB) ([]Tool, error) {
	var tools []Tool
	err := db.Where("status = ?", 1).Order("sort_order DESC, created_at DESC").Find(&tools).Error
	return tools, err
}

// GetToolsByCategory 根据分类获取工具
func GetToolsByCategory(db *gorm.DB, categoryID uint) ([]Tool, error) {
	var tools []Tool
	err := db.Where("category_id = ? AND status = ?", categoryID, 1).Order("sort_order DESC").Find(&tools).Error
	return tools, err
}

// GetHotTools 获取火热工具（按 sort_order 排序）
func GetHotTools(db *gorm.DB) ([]Tool, error) {
	var tools []Tool
	err := db.Where("is_hot = ? AND status = ?", true, 1).Order("sort_order DESC").Find(&tools).Error
	return tools, err
}

// UpdateTool 更新工具
func UpdateTool(db *gorm.DB, tool *Tool) error {
	return db.Save(tool).Error
}

// DeleteTool 删除工具（软删除）
func DeleteTool(db *gorm.DB, id uint) error {
	return db.Model(&Tool{}).Where("id = ?", id).Update("status", 0).Error
}

// IncreaseUsageCount 增加使用次数
func IncreaseUsageCount(db *gorm.DB, id uint) error {
	return db.Model(&Tool{}).Where("id = ?", id).UpdateColumn("usage_count", gorm.Expr("usage_count + ?", 1)).Error
}
