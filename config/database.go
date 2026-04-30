package config

import (
	"encoding/csv"
	"fmt"
	"os"
	"strconv"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
	"github.com/joho/godotenv"
	"tools.jinbox.cn/internal/model"
	"tools.jinbox.cn/pkg/logger"
)

// DB 数据库连接实例
var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {
	// 加载环境变量
	err := godotenv.Load()
	if err != nil {
		logger.Warning("加载 .env 文件失败: %v (将使用环境变量)", err)
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
		logger.Fatal("数据库连接失败: %v", err)
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
		logger.Fatal("数据库连接失败: %v", err)
	}

	// 设置日志模式
	DB.LogMode(true)

	// 测试连接
	if err := DB.DB().Ping(); err != nil {
		logger.Fatal("数据库连接测试失败: %v", err)
	}

	// 自动迁移表结构
	err = DB.AutoMigrate(
		&model.Admin{},
		&model.Category{},
		&model.Tool{},
		&model.Favorite{},
		&model.Feedback{},
	).Error
	if err != nil {
		logger.Fatal("数据库迁移失败: %v", err)
	}

	// 设置admins表自增起始值为10008475
	DB.Exec("ALTER TABLE admins AUTO_INCREMENT = 10008475")

	logger.Info("数据库连接成功，表结构已自动迁移")

	// 创建默认管理员账号（如果不存在）
	createDefaultAdmin()

	// 从CSV文件加载分类和工具数据
	loadDataFromCSV()
}

// createDefaultAdmin 创建默认管理员账号
func createDefaultAdmin() {
	adminUsername := os.Getenv("ADMIN_USERNAME")
	adminPassword := os.Getenv("ADMIN_PASSWORD")

	if adminUsername == "" || adminPassword == "" {
		logger.Warning("未配置管理员账号密码 (ADMIN_USERNAME, ADMIN_PASSWORD)，将无法登录管理后台")
		return
	}

	// 检查管理员是否已存在
	var existingAdmin model.Admin
	err := DB.Where("username = ?", adminUsername).First(&existingAdmin).Error
	if err == nil && existingAdmin.ID > 0 {
		// 管理员已存在
		if existingAdmin.IsAdmin {
			logger.Info("管理员账号已存在: %s", adminUsername)
		}
		return
	}

	// 创建管理员账号
	admin := &model.Admin{
		Username: adminUsername,
		Email:    "admin@localhost",
		IsAdmin:  true,
	}
	admin.SetPassword(adminPassword)

	if err := DB.Create(admin).Error; err != nil {
		logger.Error("创建管理员账号失败: %v", err)
		return
	}

	logger.Info("默认管理员账号创建成功: %s", adminUsername)
}

// loadDataFromCSV 从CSV文件加载数据
func loadDataFromCSV() {
	// 检查是否强制重新初始化
	forceInit := os.Getenv("FORCE_INIT") == "true"

	// 获取CSV文件路径
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	// 检查CSV文件是否存在
	toolsFile := dataDir + "/tools.csv"
	categoriesFile := dataDir + "/categories.csv"

	_, toolsExist := os.Stat(toolsFile)
	_, categoriesExist := os.Stat(categoriesFile)

	if toolsExist != nil && categoriesExist != nil {
		logger.Info("CSV文件不存在，跳过加载")
		return
	}

	// 检查是否已有分类数据
	var categoryCount int
	DB.Model(&model.Category{}).Count(&categoryCount)

	// 如果有CSV文件但数据库为空，或者强制初始化，则加载数据
	if categoryCount == 0 || forceInit {
		// 如果强制初始化，清空现有数据
		if forceInit && categoryCount > 0 {
			logger.Info("强制初始化，清空现有数据...")
			DB.Delete(&model.Tool{})
			DB.Delete(&model.Category{})
		}

		logger.Info("正在从CSV文件加载数据...")

		// 加载分类数据
		if categoriesExist == nil {
			loadCategoriesFromCSV(categoriesFile)
		}

		// 加载工具数据
		if toolsExist == nil {
			loadToolsFromCSV(toolsFile)
		}

		logger.Info("CSV数据加载完成！")
	} else {
		logger.Info("数据已存在，跳过从CSV加载")
	}
}

// ForceReloadFromCSV 强制从CSV重新加载数据
func ForceReloadFromCSV() {
	// 清空现有数据
	logger.Info("强制从CSV重新加载数据...")
	DB.Delete(&model.Tool{})
	DB.Delete(&model.Category{})

	// 获取CSV文件路径
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "./data"
	}

	// 加载分类数据
	categoriesFile := dataDir + "/categories.csv"
	if _, err := os.Stat(categoriesFile); err == nil {
		loadCategoriesFromCSV(categoriesFile)
	}

	// 加载工具数据
	toolsFile := dataDir + "/tools.csv"
	if _, err := os.Stat(toolsFile); err == nil {
		loadToolsFromCSV(toolsFile)
	}

	logger.Info("CSV数据强制重新加载完成！")
}

// loadCategoriesFromCSV 从CSV文件加载分类
func loadCategoriesFromCSV(filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		logger.Error("打开分类CSV文件失败: %v", err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		logger.Error("读取分类CSV文件失败: %v", err)
		return
	}

	// 跳过标题行
	for i, record := range records {
		if i == 0 {
			continue // 跳过标题
		}
		if len(record) < 5 {
			continue
		}

		id, _ := strconv.ParseUint(record[0], 10, 32)
		sortOrder, _ := strconv.Atoi(record[3])
		status, _ := strconv.Atoi(record[4])

		category := model.Category{
			Name:      record[1],
			Icon:      record[2],
			SortOrder: sortOrder,
			Status:    status,
		}

		// 如果CSV中指定了ID，使用该ID
		if id > 0 {
			category.ID = uint(id)
			// 尝试插入或更新
			DB.FirstOrCreate(&category, model.Category{ID: category.ID})
		} else {
			DB.Create(&category)
		}

		logger.Debug("加载分类: %s", category.Name)
	}
}

// loadToolsFromCSV 从CSV文件加载工具
func loadToolsFromCSV(filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		logger.Error("打开工具CSV文件失败: %v", err)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		logger.Error("读取工具CSV文件失败: %v", err)
		return
	}

	// 跳过标题行
	for i, record := range records {
		if i == 0 {
			continue // 跳过标题
		}
		if len(record) < 11 {
			continue
		}

		// 解析字段
		// name,icon,description,detailed_description,url,type,category_id,is_hot,is_foreign,sort_order,status
		name := record[0]
		icon := record[1]
		description := record[2]
		detailedDescription := record[3]
		url := record[4]
		toolType, _ := strconv.Atoi(record[5])
		categoryID, _ := strconv.ParseUint(record[6], 10, 32)
		isHot := record[7] == "1"
		isForeign := record[8] == "1"
		sortOrder, _ := strconv.Atoi(record[9])
		status, _ := strconv.Atoi(record[10])

		// 工具类型默认为1（外部链接）
		if toolType == 0 {
			toolType = 1
		}

		tool := model.Tool{
			Name:                name,
			Icon:                icon,
			Description:         description,
			DetailedDescription: detailedDescription,
			URL:                 url,
			Type:                toolType,
			CategoryID:          uint(categoryID),
			IsHot:               isHot,
			IsForeign:           isForeign,
			SortOrder:           sortOrder,
			Status:              status,
		}

		DB.Create(&tool)
		logger.Debug("加载工具: %s", tool.Name)
	}
}
