package model

import (
	"time"

	"github.com/jinzhu/gorm"
	"golang.org/x/crypto/bcrypt"
)

// Admin 管理员模型
type Admin struct {
	ID        uint      `gorm:"primary_key" json:"id"`                 // 管理员ID
	Username  string    `gorm:"size:50;unique;not null" json:"username"` // 用户名
	Password  string    `gorm:"size:255;not null" json:"-"`            // 密码（不返回）
	Email     string    `gorm:"size:100" json:"email"`                // 邮箱
	Status    int       `gorm:"default:1" json:"status"`              // 状态：0禁用，1启用
	CreatedAt time.Time `json:"created_at"`                           // 创建时间
	UpdatedAt time.Time `json:"updated_at"`                           // 更新时间
}

// TableName 指定表名
func (Admin) TableName() string {
	return "admins"
}

// SetPassword 设置密码（加密）
func (admin *Admin) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	admin.Password = string(hashedPassword)
	return nil
}

// CheckPassword 验证密码
func (admin *Admin) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(password))
	return err == nil
}

// CreateAdmin 创建管理员
func CreateAdmin(db *gorm.DB, admin *Admin) error {
	return db.Create(admin).Error
}

// GetAdminByUsername 根据用户名获取管理员
func GetAdminByUsername(db *gorm.DB, username string) (*Admin, error) {
	var admin Admin
	err := db.Where("username = ? AND status = ?", username, 1).First(&admin).Error
	return &admin, err
}

// GetAdminByID 根据ID获取管理员
func GetAdminByID(db *gorm.DB, id uint) (*Admin, error) {
	var admin Admin
	err := db.First(&admin, id).Error
	return &admin, err
}

// UpdateAdmin 更新管理员信息
func UpdateAdmin(db *gorm.DB, admin *Admin) error {
	return db.Save(admin).Error
}
