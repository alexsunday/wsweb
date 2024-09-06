package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

/*
需要考虑 客户端掉线后，重连，是否允许将之前的数据响应给新的ws 连接
即是否允许跨会话
*/

func main() {
	r := gin.Default()

	r.GET("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})
	r.GET("/websocket", wsHttpHandler(r))
	r.Static("/static", "./web/blog/dist")

	r.Run(":8080")
}

//go:generate .\protoc.exe  --go_out=. ws.proto
