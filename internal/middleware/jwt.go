package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Claims JWT声明
type Claims struct {
	ID       uint   `json:"id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// JWTAuthenticate JWT认证中间件
func JWTAuthenticate() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取Authorization头
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "未提供token"})
			c.Abort()
			return
		}

		// 检查Bearer前缀
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token格式错误"})
			c.Abort()
			return
		}

		// 提取token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		// 解析token
		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token无效"})
			c.Abort()
			return
		}

		// 验证token
		if claims, ok := token.Claims.(*Claims); ok && token.Valid {
			// 将用户信息存入上下文
			c.Set("admin_id", claims.ID)
			c.Set("admin_username", claims.Username)
			c.Next()
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "token验证失败"})
			c.Abort()
			return
		}
	}
}
