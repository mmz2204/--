package model

import (
	"github.com/jinzhu/gorm"
)

// BrowseHistory 浏览历史记录
type BrowseHistory struct {
	gorm.Model
	UserID     uint   `gorm:"column:user_id;index;comment:用户ID"`              // 用户ID，未登录用户为0
	ToolID     uint   `gorm:"column:tool_id;comment:工具ID"`                    // 工具ID
	ToolName   string `gorm:"column:tool_name;size:100;comment:工具名称"`         // 工具名称
	ToolIcon   string `gorm:"column:tool_icon;size:50;comment:工具图标"`          // 工具图标
	SessionKey string `gorm:"column:session_key;size:100;index;comment:会话标识"` // 未登录用户的会话标识
}

// TableName 指定表名
func (BrowseHistory) TableName() string {
	return "browse_history"
}

// CreateHistory 创建浏览记录
func CreateHistory(db *gorm.DB, history *BrowseHistory) error {
	return db.Create(history).Error
}

// GetUserHistory 获取用户浏览历史
func GetUserHistory(db *gorm.DB, userID uint, sessionKey string, limit int) ([]BrowseHistory, error) {
	var histories []BrowseHistory
	var query *gorm.DB

	if userID > 0 {
		// 登录用户，按用户ID查询
		query = db.Where("user_id = ?", userID)
	} else if sessionKey != "" {
		// 未登录用户，按会话标识查询
		query = db.Where("session_key = ?", sessionKey)
	} else {
		return histories, nil
	}

	err := query.Order("created_at DESC").Limit(limit).Find(&histories).Error
	return histories, err
}

// ClearUserHistory 清空用户浏览历史
func ClearUserHistory(db *gorm.DB, userID uint, sessionKey string) error {
	var query *gorm.DB

	if userID > 0 {
		query = db.Where("user_id = ?", userID)
	} else if sessionKey != "" {
		query = db.Where("session_key = ?", sessionKey)
	} else {
		return nil
	}

	return query.Delete(&BrowseHistory{}).Error
}

// DeleteHistoryByID 删除单条浏览记录
func DeleteHistoryByID(db *gorm.DB, id uint) error {
	return db.Delete(&BrowseHistory{}, id).Error
}
