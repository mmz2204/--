package handler

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

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

// GenerateSitemap 生成站点地图
func GenerateSitemap(c *gin.Context) {
	tools, err := model.GetAllTools(config.DB)
	if err != nil {
		c.JSON(500, gin.H{"error": "获取工具数据失败"})
		return
	}

	categories, err := model.GetAllCategories(config.DB)
	if err != nil {
		c.JSON(500, gin.H{"error": "获取分类数据失败"})
		return
	}

	baseURL := "https://tools.jinbox.cn"
	now := time.Now().Format("2006-01-02")

	var sitemap strings.Builder
	sitemap.WriteString(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`)

	// 首页
	sitemap.WriteString(fmt.Sprintf(`  <url>
    <loc>%s/</loc>
    <lastmod>%s</lastmod>
    <priority>1.0</priority>
  </url>
`, baseURL, now))

	// 分类页
	for _, cat := range categories {
		sitemap.WriteString(fmt.Sprintf(`  <url>
    <loc>%s/category/%d</loc>
    <lastmod>%s</lastmod>
    <priority>0.8</priority>
  </url>
`, baseURL, cat.ID, now))
	}

	// 工具详情页
	for _, tool := range tools {
		url := fmt.Sprintf("%s/tool/%d", baseURL, tool.ID)
		sitemap.WriteString(fmt.Sprintf(`  <url>
    <loc>%s</loc>
    <lastmod>%s</lastmod>
    <priority>0.9</priority>
  </url>
`, url, now))
	}

	// JSON工具页面
	jsonPages := []string{"json", "json/format", "json/parse", "json/compress", "json/view", "json/color", "json/xml", "json/entity", "json/compare", "json/editor", "json/excel", "json/csv"}
	for _, page := range jsonPages {
		sitemap.WriteString(fmt.Sprintf(`  <url>
    <loc>%s/%s</loc>
    <lastmod>%s</lastmod>
    <priority>0.85</priority>
  </url>
`, baseURL, page, now))
	}

	sitemap.WriteString("</urlset>")

	// 写入文件
	sitemapFile := "frontend/sitemap.xml"
	if err := os.WriteFile(sitemapFile, []byte(sitemap.String()), 0644); err != nil {
		c.JSON(500, gin.H{"error": "生成sitemap失败"})
		return
	}

	c.Header("Content-Type", "application/xml")
	c.String(200, sitemap.String())
}

// 生成工具的SEO友好URL
func generateToolSlug(name string) string {
	// 移除特殊字符，转换为小写
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "　", "-") // 全角空格
	slug = strings.ReplaceAll(slug, "_", "-")
	// 移除其他特殊字符
	slug = strings.ReplaceAll(slug, "(", "")
	slug = strings.ReplaceAll(slug, ")", "")
	slug = strings.ReplaceAll(slug, "[", "")
	slug = strings.ReplaceAll(slug, "]", "")
	slug = strings.ReplaceAll(slug, "{", "")
	slug = strings.ReplaceAll(slug, "}", "")
	slug = strings.ReplaceAll(slug, "，", "")
	slug = strings.ReplaceAll(slug, "。", "")
	slug = strings.ReplaceAll(slug, "、", "")
	slug = strings.ReplaceAll(slug, "；", "")
	slug = strings.ReplaceAll(slug, "：", "")
	return slug
}
