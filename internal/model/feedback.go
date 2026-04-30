package model

import (
	"time"

	"github.com/jinzhu/gorm"
)

// Feedback 反馈模型
type Feedback struct {
	ID        uint      `gorm:"primary_key" json:"id"`                           // 反馈ID
	UserID    uint      `gorm:"not null;index" json:"user_id"`                   // 用户ID
	Username  string    `gorm:"size:50" json:"username"`                          // 用户名
	Content   string    `gorm:"type:text;not null" json:"content"`                // 反馈内容
	Image1    string    `gorm:"size:255" json:"image1,omitempty"`                 // 图片1路径
	Image2    string    `gorm:"size:255" json:"image2,omitempty"`                 // 图片2路径
	CreatedAt time.Time `json:"created_at"`                                       // 创建时间
}

// TableName 指定表名
func (Feedback) TableName() string {
	return "feedbacks"
}

// CreateFeedback 创建反馈
func CreateFeedback(db *gorm.DB, feedback *Feedback) error {
	return db.Create(feedback).Error
}

// GetFeedbacks 获取所有反馈
func GetFeedbacks(db *gorm.DB) ([]Feedback, error) {
	var feedbacks []Feedback
	err := db.Order("created_at DESC").Find(&feedbacks).Error
	return feedbacks, err
}

// GetUserTodayFeedbackCount 获取用户今日反馈次数
func GetUserTodayFeedbackCount(db *gorm.DB, userID uint) (int, error) {
	today := time.Now().Format("2006-01-02")
	var count int
	err := db.Model(&Feedback{}).Where("user_id = ? AND DATE(created_at) = ?", userID, today).Count(&count).Error
	return count, err
}
