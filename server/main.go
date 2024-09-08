package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

//go:embed dist
var webStatic embed.FS

func main() {
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})

	// r.Static("/web", "dist")
	distFs, err := fs.Sub(webStatic, "dist")
	if err != nil {
		logger.Warn("embed not found dist sub dir")
		return
	}
	r.StaticFS("/web", http.FS(distFs))

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
	files, err := webStatic.ReadDir(baseDir)
	// files, err := os.ReadDir(baseDir)
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
