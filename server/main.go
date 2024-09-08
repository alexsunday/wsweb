package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	serveWeb(r)
	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	r.GET("/", func(c *gin.Context) {
		loader, err := findLoader("dist/loader")
		if err != nil {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}

		w := c.Writer
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "text/html")
		home := fmt.Sprintf(`<!DOCTYPE html><html lang="zh"><head>
			<link rel="icon" href="data:;base64,=">
			<script src="/web/loader/%s"></script>
			</head></html>`, loader)
		home = strings.ReplaceAll(home, "\n", "")
		home = strings.ReplaceAll(home, "\t", "")
		w.WriteString(home)
	})
	r.GET("/websocket", wsHttpHandler(r))

	r.Run(":8080")
}

func findLoader(baseDir string) (string, error) {
	files, err := readDir(baseDir)
	if err != nil {
		return "", fmt.Errorf("查找加载器文件夹时 失败 %w", err)
	}
	for _, file := range files {
		fName := file.Name()
		if strings.HasPrefix(fName, "app-") && strings.HasSuffix(fName, ".js") {
			return fName, nil
		}
	}
	return "", fmt.Errorf("在 %s 中未找到目标文件", baseDir)
}

//go:generate .\protoc.exe  --go_out=. ws.proto
