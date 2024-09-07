package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"httponws/frame"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"google.golang.org/protobuf/proto"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
var logger = slog.New(slog.NewTextHandler(os.Stderr, nil))

type httpServer interface {
	ServeHTTP(http.ResponseWriter, *http.Request)
}

func wsHttpHandler(r httpServer) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			logger.Warn("upgrade websocket request failed", "error", err)
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		h := NewHttpChannel(c, conn, r)
		go h.ReadLoop()
		go h.Handle()
	}
}

type httpWriter struct {
	header     http.Header
	body       bytes.Buffer
	statusCode int
}

func NewMemHttpWriter() *httpWriter {
	return &httpWriter{
		header: make(http.Header),
	}
}

func (m *httpWriter) ToHeaders() []string {
	var out = make([]string, 0)
	for k, v := range m.header {
		out = append(out, fmt.Sprintf("%s: %s", k, strings.Join(v, ",")))
	}
	return out
}

func (m *httpWriter) Header() http.Header {
	return m.header
}

func (m *httpWriter) Write(b []byte) (int, error) {
	return m.body.Write(b)
}

func (m *httpWriter) WriteHeader(statusCode int) {
	m.statusCode = statusCode
}

type wsReadWrapper struct {
	*websocket.Conn
	// 读取缓存 由于websocket消息按帧发送 可能应用层只需要1字节，但实际上收到了100字节
	// 需要处理这种场景 所以将多余收到的数据缓存起来
	readCache []byte
}

func (m *wsReadWrapper) Write(p []byte) (int, error) {
	err := m.Conn.WriteMessage(websocket.BinaryMessage, p)
	return len(p), err
}

func (m *wsReadWrapper) Close() error {
	return m.Conn.Close()
}

// 应用层获取，只从缓存中拿 如缓存不够 就从ws获取
func (m *wsReadWrapper) Read(p []byte) (int, error) {
	for {
		if len(m.readCache) >= len(p) {
			break
		}

		err := m.readFromLink()
		if err != nil {
			return 0, fmt.Errorf("read from link failed %w", err)
		}
	}

	return m.readFromCache(p)
}

func (m *wsReadWrapper) readFromCache(p []byte) (int, error) {
	appLength := len(p)
	if len(m.readCache) < appLength {
		panic("cache data is not enough")
	}
	// copy 时，长度以 参数中更小的那个 为准
	copy(p, m.readCache)
	m.readCache = m.readCache[appLength:]
	return appLength, nil
}

func (m *wsReadWrapper) readFromLink() error {
	msgType, buf, err := m.Conn.ReadMessage()
	if err != nil {
		return fmt.Errorf("read websocket message failed %w", err)
	}
	if msgType == websocket.TextMessage {
		return fmt.Errorf("unsupport text message now")
	}

	m.readCache = append(m.readCache, buf...)
	return nil
}

type HttpChannel struct {
	conn   io.ReadWriteCloser
	ctx    context.Context
	cancel context.CancelFunc
	chIn   chan *frame.Message
	chOut  chan *frame.Message
	server httpServer

	// request
	response Map[uint64, chan *frame.Response]
}

func NewHttpChannel(ctx context.Context, conn *websocket.Conn, server httpServer) *HttpChannel {
	ctx, cancel := context.WithCancel(ctx)
	return &HttpChannel{
		conn: &wsReadWrapper{
			Conn: conn,
		},
		ctx:    ctx,
		cancel: cancel,
		chIn:   make(chan *frame.Message),
		chOut:  make(chan *frame.Message),
		server: server,
	}
}

// 简化协议，6字节报头, 其中前4字节为大端序 内容为 后续包体部分长度 不包括这6字节
// 剩下两字节为协议编号 考虑到后期，部分设备可能不方便运行 protobuf 预留 暂时必须为01
func (m *HttpChannel) ReadLoop() {
	defer m.Close()
	var err error
	for {
		var head = make([]byte, 6)
		_, err = io.ReadFull(m.conn, head)
		if err != nil {
			logger.Warn("读取报头失败", "error", err)
			return
		}

		left := binary.BigEndian.Uint32(head[:4])
		const maxBodyLength = 128 * 1024 * 1024
		if left > maxBodyLength {
			logger.Warn("太长的数据报 暂无法处理", "length", left)
			return
		}
		protoID := binary.BigEndian.Uint16(head[4:6])
		if protoID != 0x01 {
			logger.Warn("协议号不匹配", "protocol-ver", protoID)
			return
		}

		var body = make([]byte, left)
		_, err = io.ReadFull(m.conn, body)
		if err != nil {
			logger.Warn("读取内容失败", "error", err)
			return
		}

		var f frame.Message
		err = proto.Unmarshal(body, &f)
		if err != nil {
			logger.Warn("反序列化失败", "error", err)
			return
		}
		m.chIn <- &f
	}
}

/*
关闭
@param: closeConn 是否关闭原始链接
*/
func (m *HttpChannel) Close() {
	err := m.conn.Close()
	if err != nil {
		logger.Warn("关闭连接出错", "error", err)
	}

	m.cancel()
}

func (m *HttpChannel) Handle() {
	var err error
	for {
		select {
		case chIn, ok := <-m.chIn:
			{
				if !ok {
					logger.Warn("输入数据错误")
					return
				}
				err = m.handleFrame(chIn)
				if err != nil {
					logger.Warn("处理输入数据出错", "error", err)
					return
				}
			}
		case chOut, ok := <-m.chOut:
			{
				if !ok {
					logger.Warn("输出数据错误")
					return
				}
				_, err = m.writeFrame(chOut)
				if err != nil {
					logger.Warn("写入数据数错", "error", err)
					return
				}
			}
		case <-m.ctx.Done():
			{
				logger.Warn("完成!")
				return
			}
		}
	}
}

func (m *HttpChannel) handleFrame(f *frame.Message) error {
	req := f.GetRequest()
	rsp := f.GetResponse()
	if req != nil && rsp != nil {
		return fmt.Errorf("request and response all valued")
	}
	if f.Type == frame.Message_REQUEST {
		// 开新goroutine处理http请求
		// TODO 换成线程池？
		go func() {
			err := m.handleRequest(f.GetRequest())
			if err != nil {
				logger.Warn("handle http request failed", "error", err)
			}
		}()
		return nil
	}

	if f.Type == frame.Message_RESPONSE {
		m.handleResponse(f.GetResponse())
		return nil
	}

	return fmt.Errorf("unknown message type")
}

/*
客户端上送了一个 http request 假设ID被正确设置了
1. 构造一个 http.Request
2. 将 responseWriter 带上 本 channel，送入 gin 处理
3. 将获取的输出构造为响应，写入
*/
func (m *HttpChannel) handleRequest(req *frame.Request) error {
	if req.Id == 0 {
		return fmt.Errorf("ID empty")
	}

	body := bytes.NewBuffer(req.Body)
	method := strings.ToUpper(req.Verb)
	reqUrl := fmt.Sprintf("http://localhost%s", req.Path)
	httpReq, err := http.NewRequestWithContext(m.ctx, method, reqUrl, body)
	if err != nil {
		return fmt.Errorf("new http request failed %w", err)
	}

	writer := NewMemHttpWriter()
	m.server.ServeHTTP(writer, httpReq)

	rsp := &frame.Response{
		Id:      req.Id,
		Status:  uint32(writer.statusCode),
		Message: http.StatusText(writer.statusCode),
		Headers: writer.ToHeaders(),
		Body:    writer.body.Bytes(),
	}
	rs := &frame.Message{
		Type:     frame.Message_RESPONSE,
		Response: rsp,
	}
	m.chOut <- rs
	return nil
}

/*
客户端上送了一个 http response 作为服务端主动向客户端发起请求的响应
1. 取出其ID 查找是否有匹配
2. 若找到匹配，激活channel
3. 找不到时 发出警告
*/
func (m *HttpChannel) handleResponse(rsp *frame.Response) {
	f, ok := m.response.Load(rsp.Id)
	if !ok {
		logger.Warn("响应数据将被丢弃", "id", rsp.Id)
	}

	f <- rsp
}

/*
使用该通道，主动发起请求； 假设数据ID已被正确设置
2. 生成一个 channel，并将 ID值与该 channel 置入缓存
1. 将数据丢入发送通道 // 或者先直接发出去？
3. 等待该channel被唤醒
4. 返回
*/
func (m *HttpChannel) Request(req *frame.Request, timeoutMs int) (*frame.Response, error) {
	var id = req.Id
	if id == 0 {
		return nil, fmt.Errorf("id empty")
	}

	var ch = make(chan *frame.Response)
	m.response.Store(id, ch)

	var f = &frame.Message{
		Type:    frame.Message_REQUEST,
		Request: req,
	}
	m.chOut <- f

	select {
	case v, ok := <-ch:
		m.response.Delete(id)
		if !ok {
			logger.Warn("接收数据错误", "id", id)
			return nil, fmt.Errorf("request %d channel recv failed", id)
		}
		if v.Id != req.Id {
			logger.Warn("ID 不匹配", "id", id, "rsp", v.Id)
			return nil, fmt.Errorf("request %d id not match", id)
		}
		return v, nil
	case <-m.ctx.Done():
		logger.Warn("已结束 请求失败", "id", id)
		m.response.Delete(id)
		return nil, fmt.Errorf("request %d context done", id)
	case <-time.After(time.Millisecond * time.Duration(timeoutMs)):
		logger.Warn("请求超时", "id", id)
		m.response.Delete(id)
		return nil, fmt.Errorf("request %d timeout", id)
	}
}

func (m *HttpChannel) writeFrame(f *frame.Message) (int, error) {
	content, err := proto.Marshal(f)
	if err != nil {
		return 0, fmt.Errorf("序列化输出数据报错误 %w", err)
	}
	var out = make([]byte, len(content)+6)
	binary.BigEndian.PutUint32(out[:4], uint32(len(content)))
	binary.BigEndian.PutUint16(out[4:6], 0x01)
	copy(out[6:], content)
	return m.conn.Write(out)
}
