package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})
	r.GET("/", func(c *gin.Context) {
		loader, err := findLoader("../web/dist/loader")
		if err != nil {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}

		w := c.Writer
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "text/html")
		w.WriteString(fmt.Sprintf(`<script src="/static/loader/%s"></script>`, loader))
	})
	r.GET("/websocket", wsHttpHandler(r))
	r.Static("/static", "../web/dist")

	r.Run(":8080")
}

func findLoader(baseDir string) (string, error) {
	files, err := os.ReadDir(baseDir)
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
