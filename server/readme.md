# http on ws
目标，建立一个正常的网站，其 index.html 即首页，应该就一行 代码 `<script src="./app-${hash}.js"></script>` 完成后浏览器请求该文件，或者将 js 内容嵌入在该首页文件`script`标签里，但由于缓存原因，不推荐这种用法；浏览器请求完js文件后，与服务端建立websocket请求，后续所有请求与交互，都将在该 websocket 请求中进行。

所以，在浏览器的开发者工具看来，该网站总共就3个请求，1个首页HTML，1个脚本JS，1个WS
