package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"tools.jinbox.cn/internal/middleware"
)

// GenerateToken 生成JWT token
func GenerateToken(id uint, username string) (string, error) {
	// 设置token过期时间（7天）
	expTime := time.Now().Add(7 * 24 * time.Hour)

	// 创建声明
	claims := &middleware.Claims{
		ID:       id,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	// 使用HS256算法签名
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 签名并获取完整的token字符串
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
