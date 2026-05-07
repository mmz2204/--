
FROM golang:1.25-alpine AS builder
# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制 .env.docker 到构建阶段
COPY .env.docker .env

# 复制源代码
COPY . .

# 构建可执行文件，注入版本信息
ARG VERSION="dev"
ARG BRANCH="unknown"
ARG COMMIT="unknown"
RUN git fetch --tags && \
    VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "dev") && \
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown") && \
    COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown") && \
    go build -ldflags "-X main.version=${VERSION} -X main.branch=${BRANCH} -X main.commit=${COMMIT}" -o main .

FROM alpine:latest

# 设置工作目录
WORKDIR /app

# 安装必要依赖
RUN apk --no-cache add ca-certificates tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# 从构建阶段复制可执行文件
COPY --from=builder /app/main .
COPY --from=builder /app/.env.docker .env

# 复制静态文件和数据
COPY frontend ./frontend
COPY data ./data
COPY migrations ./migrations

# 创建日志目录
RUN mkdir -p logs uploads

# 暴露端口
EXPOSE 8080

# 启动命令
CMD ["./main"]