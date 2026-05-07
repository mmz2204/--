package handler

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skip2/go-qrcode"
)

type QRCodeRequest struct {
	Content string `form:"content" json:"content" binding:"required"`
	Size    int    `form:"size" json:"size"`
	BgColor string `form:"bgcolor" json:"bgcolor"`
	FgColor string `form:"color" json:"color"`
	Level   string `form:"level" json:"level"`
}

func GenerateQRCode(c *gin.Context) {
	var req QRCodeRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": -1, "message": "参数错误: " + err.Error()})
		return
	}

	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": -1, "message": "内容不能为空"})
		return
	}

	size := req.Size
	if size <= 0 || size > 1000 {
		size = 256
	}

	// 解析前景色
	fgColor, err := parseColor(req.FgColor)
	if err != nil {
		fgColor = color.Black
	}

	// 解析背景色
	bgColor, err := parseColor(req.BgColor)
	if err != nil {
		bgColor = color.White
	}

	level := qrcode.Medium
	switch req.Level {
	case "L":
		level = qrcode.Low
	case "M":
		level = qrcode.Medium
	case "Q":
		level = qrcode.High
	case "H":
		level = qrcode.Highest
	}

	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	qr, err := qrcode.New(req.Content, level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "生成二维码失败: " + err.Error()})
		return
	}

	// 生成二维码图片
	img := qr.Image(size)

	// 如果指定了自定义颜色，重新绘制
	if fgColor != color.Black || bgColor != color.White {
		img = applyCustomColors(img, fgColor, bgColor, size)
	}

	err = png.Encode(c.Writer, img)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "输出图片失败: " + err.Error()})
		return
	}
}

func parseColor(hex string) (color.Color, error) {
	if hex == "" {
		return nil, fmt.Errorf("颜色为空")
	}

	// 移除可能的#前缀
	if len(hex) > 0 && hex[0] == '#' {
		hex = hex[1:]
	}

	if len(hex) != 6 {
		return nil, fmt.Errorf("无效的颜色格式")
	}

	r, err := strconv.ParseUint(hex[0:2], 16, 8)
	if err != nil {
		return nil, err
	}
	g, err := strconv.ParseUint(hex[2:4], 16, 8)
	if err != nil {
		return nil, err
	}
	b, err := strconv.ParseUint(hex[4:6], 16, 8)
	if err != nil {
		return nil, err
	}

	return color.RGBA{R: uint8(r), G: uint8(g), B: uint8(b), A: 255}, nil
}

func applyCustomColors(img image.Image, fgColor, bgColor color.Color, size int) image.Image {
	result := image.NewRGBA(image.Rect(0, 0, size, size))

	// 填充背景色
	draw.Draw(result, result.Bounds(), &image.Uniform{C: bgColor}, image.Point{}, draw.Src)

	// 绘制前景色（二维码像素）- 只替换黑色像素
	bounds := img.Bounds()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			// 检查是否是黑色像素（二维码的实际内容）
			if r < 5000 && g < 5000 && b < 5000 {
				result.Set(x, y, fgColor)
			}
		}
	}

	return result
}

func GenerateQRCodeWithLogo(c *gin.Context) {
	var req QRCodeRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"code": -1, "message": "参数错误: " + err.Error()})
		return
	}

	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": -1, "message": "内容不能为空"})
		return
	}

	size := req.Size
	if size <= 0 || size > 1000 {
		size = 256
	}

	level := qrcode.Medium
	switch req.Level {
	case "L":
		level = qrcode.Low
	case "M":
		level = qrcode.Medium
	case "Q":
		level = qrcode.High
	case "H":
		level = qrcode.Highest
	}

	qr, err := qrcode.New(req.Content, level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "生成二维码失败: " + err.Error()})
		return
	}

	img := qr.Image(size)

	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	err = png.Encode(c.Writer, img)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": -1, "message": "输出图片失败: " + err.Error()})
		return
	}
}
