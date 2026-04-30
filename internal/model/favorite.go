package model

import (
	"time"
)

// Favorite 收藏夹模型
type Favorite struct {
	ID        uint      `gorm:"primary_key" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	ToolID    uint      `gorm:"not null" json:"tool_id"`
	CreatedAt time.Time `json:"created_at"`
}