package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
)

// LogLevel 日志级别
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARNING
	ERROR
	FATAL
)

// Logger 日志接口
type Logger struct {
	fileLogger *log.Logger
	consoleLogger *log.Logger
	logLevel   LogLevel
	logDir     string
}

var (
	defaultLogger *Logger
)

// InitLogger 初始化日志系统
func InitLogger(logDir string, level LogLevel) error {
	// 创建日志目录
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("创建日志目录失败: %v", err)
	}

	// 获取当前日期作为日志文件名
	logFileName := time.Now().Format("2006-01-02") + ".log"
	logFilePath := filepath.Join(logDir, logFileName)

	// 打开日志文件（追加模式）
	logFile, err := os.OpenFile(logFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("打开日志文件失败: %v", err)
	}

	// 创建日志实例
	defaultLogger = &Logger{
		fileLogger:    log.New(logFile, "", log.LstdFlags),
		consoleLogger: log.New(os.Stdout, "", log.LstdFlags),
		logLevel:      level,
		logDir:        logDir,
	}

	Info("日志系统初始化完成")
	return nil
}

// getLogLevelString 获取日志级别字符串
func getLogLevelString(level LogLevel) string {
	switch level {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARNING:
		return "WARNING"
	case ERROR:
		return "ERROR"
	case FATAL:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// shouldLog 判断是否应该记录该级别的日志
func (l *Logger) shouldLog(level LogLevel) bool {
	return level >= l.logLevel
}

// log 记录日志
func (l *Logger) log(level LogLevel, format string, v ...interface{}) {
	if !l.shouldLog(level) {
		return
	}

	msg := fmt.Sprintf("[%s] %s", getLogLevelString(level), fmt.Sprintf(format, v...))
	
	// 输出到文件
	l.fileLogger.Println(msg)
	
	// 输出到控制台（生产环境可关闭）
	if level >= INFO {
		l.consoleLogger.Println(msg)
	}
}

// Debug 调试日志
func Debug(format string, v ...interface{}) {
	if defaultLogger != nil {
		defaultLogger.log(DEBUG, format, v...)
	}
}

// Info 信息日志
func Info(format string, v ...interface{}) {
	if defaultLogger != nil {
		defaultLogger.log(INFO, format, v...)
	}
}

// Warning 警告日志
func Warning(format string, v ...interface{}) {
	if defaultLogger != nil {
		defaultLogger.log(WARNING, format, v...)
	}
}

// Error 错误日志
func Error(format string, v ...interface{}) {
	if defaultLogger != nil {
		defaultLogger.log(ERROR, format, v...)
	}
}

// Fatal 致命日志（会退出程序）
func Fatal(format string, v ...interface{}) {
	if defaultLogger != nil {
		defaultLogger.log(FATAL, format, v...)
	}
	log.Fatalf(format, v...)
}

// GinLoggerMiddleware Gin日志中间件
func GinLoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// 处理请求
		c.Next()

		// 计算耗时
		duration := time.Since(startTime)

		// 记录访问日志
		Info("Request | Method:%s | Path:%s | Status:%d | Duration:%s | IP:%s",
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			duration,
			c.ClientIP(),
		)
	}
}

// GinRecoveryMiddleware Gin异常恢复中间件
func GinRecoveryMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				Error("panic恢复 | 错误:%v | 路径:%s", err, c.Request.URL.Path)
				c.AbortWithStatus(500)
			}
		}()
		c.Next()
	}
}

// Close 关闭日志系统
func Close() {
	Info("日志系统已关闭")
}
