//go:build !release

package main

import (
	"io/fs"
	"os"

	"github.com/gin-gonic/gin"
)

func readDir(name string) ([]fs.DirEntry, error) {
	return os.ReadDir(name)
}

func serveWeb(r *gin.Engine) {
	r.Static("/web", "dist")
}
