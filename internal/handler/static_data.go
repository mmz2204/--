package handler

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"tools.jinbox.cn/config"
	"tools.jinbox.cn/internal/model"
)

// GenerateStaticData 生成静态数据文件
func GenerateStaticData(c *gin.Context) {
	// 1. 获取分类和工具数据
	categories, err := model.GetAllCategories(config.DB)
	if err != nil {
		c.JSON(500, gin.H{"error": "获取分类失败"})
		return
	}

	tools, err := model.GetAllTools(config.DB)
	if err != nil {
		c.JSON(500, gin.H{"error": "获取工具失败"})
		return
	}

	hotTools, err := model.GetHotTools(config.DB)
	if err != nil {
		c.JSON(500, gin.H{"error": "获取热门工具失败"})
		return
	}

	// 2. 构建导出数据结构
	data := map[string]interface{}{
		"categories": categories,
		"tools":      tools,
		"hotTools":   hotTools,
	}

	// 3. 确保目录存在
	frontendDir := "frontend"
	if err := os.MkdirAll(frontendDir, 0755); err != nil {
		c.JSON(500, gin.H{"error": "创建目录失败"})
		return
	}

	// 4. 序列化并写入文件（确保UTF-8编码）
	dataFile := filepath.Join(frontendDir, "data.json")
	file, err := os.Create(dataFile)
	if err != nil {
		c.JSON(500, gin.H{"error": "创建文件失败"})
		return
	}
	defer file.Close()

	// 写入BOM以确保Windows正确识别UTF-8编码
	file.WriteString("\xef\xbb\xbf")
	
	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		c.JSON(500, gin.H{"error": "写入数据失败"})
		return
	}

	c.JSON(200, gin.H{
		"message": "数据导出成功",
		"file":    dataFile,
	})
}

// AutoGenerateStaticData 如果静态文件不存在则自动生成
func AutoGenerateStaticData() error {
	dataFile := "frontend/data.json"
	if _, err := os.Stat(dataFile); err == nil {
		// 文件已存在，无需生成
		return nil
	}

	fmt.Println("静态数据文件不存在，正在自动生成...")

	// 1. 获取数据
	categories, err := model.GetAllCategories(config.DB)
	if err != nil {
		return fmt.Errorf("获取分类失败: %v", err)
	}

	tools, err := model.GetAllTools(config.DB)
	if err != nil {
		return fmt.Errorf("获取工具失败: %v", err)
	}

	hotTools, err := model.GetHotTools(config.DB)
	if err != nil {
		return fmt.Errorf("获取热门工具失败: %v", err)
	}

	// 2. 构建数据结构
	data := map[string]interface{}{
		"categories": categories,
		"tools":      tools,
		"hotTools":   hotTools,
	}

	// 3. 确保目录存在
	if err := os.MkdirAll("frontend", 0755); err != nil {
		return err
	}

	// 4. 写入文件
	file, err := os.Create(dataFile)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return err
	}

	fmt.Println("静态数据文件生成成功:", dataFile)
	return nil
}

// ReloadDataFromCSV 重新从CSV加载数据并生成静态文件
func ReloadDataFromCSV() error {
	// 1. 强制从CSV重新加载
	config.ForceReloadFromCSV()

	// 2. 获取最新数据
	categories, err := model.GetAllCategories(config.DB)
	if err != nil {
		return fmt.Errorf("获取分类失败: %v", err)
	}

	tools, err := model.GetAllTools(config.DB)
	if err != nil {
		return fmt.Errorf("获取工具失败: %v", err)
	}

	hotTools, err := model.GetHotTools(config.DB)
	if err != nil {
		return fmt.Errorf("获取热门工具失败: %v", err)
	}

	// 3. 构建数据结构
	data := map[string]interface{}{
		"categories": categories,
		"tools":      tools,
		"hotTools":   hotTools,
	}

	// 4. 确保目录存在
	if err := os.MkdirAll("frontend", 0755); err != nil {
		return err
	}

	// 5. 写入文件
	dataFile := "frontend/data.json"
	file, err := os.Create(dataFile)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return err
	}

	fmt.Println("CSV数据重新加载并生成静态文件成功:", dataFile)
	return nil
}