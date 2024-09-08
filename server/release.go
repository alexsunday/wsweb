//go:build release

package main

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed dist
var webStatic embed.FS

func readDir(name string) ([]fs.DirEntry, error) {
	return webStatic.ReadDir(name)
}

func serveWeb(r *gin.Engine) {
	distFs, err := fs.Sub(webStatic, "dist")
	if err != nil {
		logger.Warn("embed not found dist sub dir")
		return
	}
	r.StaticFS("/web", http.FS(distFs))
}
