package model

import (
	"time"

	"github.com/jinzhu/gorm"
)

// Category 导航分类模型
type Category struct {
	ID         uint      `gorm:"primary_key" json:"id"`                    // 分类ID
	Name       string    `gorm:"size:50;not null" json:"name"`            // 分类名称
	Icon       string    `gorm:"size:100" json:"icon"`                    // 分类图标
	SortOrder  int       `gorm:"default:0" json:"sort_order"`             // 排序顺序
	Status     int       `gorm:"default:1" json:"status"`                 // 状态：0禁用，1启用
	CreatedAt  time.Time `json:"created_at"`                              // 创建时间
	UpdatedAt  time.Time `json:"updated_at"`                              // 更新时间
}

// TableName 指定表名
func (Category) TableName() string {
	return "categories"
}

// CreateCategory 创建分类
func CreateCategory(db *gorm.DB, category *Category) error {
	return db.Create(category).Error
}

// GetCategoryByID 根据ID获取分类
func GetCategoryByID(db *gorm.DB, id uint) (*Category, error) {
	var category Category
	err := db.First(&category, id).Error
	return &category, err
}

// GetAllCategories 获取所有分类
func GetAllCategories(db *gorm.DB) ([]Category, error) {
	var categories []Category
	err := db.Where("status = ?", 1).Order("sort_order DESC").Find(&categories).Error
	return categories, err
}

// UpdateCategory 更新分类
func UpdateCategory(db *gorm.DB, category *Category) error {
	return db.Save(category).Error
}

// DeleteCategory 删除分类（软删除）
func DeleteCategory(db *gorm.DB, id uint) error {
	return db.Model(&Category{}).Where("id = ?", id).Update("status", 0).Error
}

// GetCategoryWithTools 获取分类及下属工具
func GetCategoryWithTools(db *gorm.DB) ([]Category, error) {
	var categories []Category
	err := db.Where("status = ?", 1).Order("sort_order DESC").Preload("Tools", "status = ?", 1).Find(&categories).Error
	return categories, err
}
