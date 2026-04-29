package config

import (
	"fmt"
	"log"
	"os"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
	"github.com/joho/godotenv"
	"tools.jinbox.cn/internal/model"
)

// DB 数据库连接实例
var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {
	// 加载环境变量
	err := godotenv.Load()
	if err != nil {
		log.Fatal("加载 .env 文件失败:", err)
	}

	// 获取数据库名称
	dbName := os.Getenv("DB_NAME")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")

	// 先连接不带数据库的 MySQL，用于创建数据库
	dsnWithoutDB := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port,
	)

	dbWithoutName, err := gorm.Open("mysql", dsnWithoutDB)
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 创建数据库（如果不存在）
	dbWithoutName.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", dbName))

	// 关闭临时连接
	sqlDB := dbWithoutName.DB()
	sqlDB.Close()

	// 连接带数据库的 MySQL
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		user, password, host, port, dbName,
	)

	DB, err = gorm.Open("mysql", dsn)
	if err != nil {
		log.Fatal("数据库连接失败:", err)
	}

	// 设置日志模式
	DB.LogMode(true)

	// 测试连接
	if err := DB.DB().Ping(); err != nil {
		log.Fatal("数据库连接测试失败:", err)
	}

	// 自动迁移表结构
	err = DB.AutoMigrate(
		&model.Admin{},
		&model.Category{},
		&model.Tool{},
	).Error
	if err != nil {
		log.Fatal("数据库迁移失败:", err)
	}

	log.Println("数据库连接成功，表结构已自动迁移")
}
