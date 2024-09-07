# ALL in WebSocket

# 功能介绍
整个网站几乎不使用任何标准HTTP请求，不信？可以使用 F12 打开浏览器的开发者工具，切换到 Network 网络标签，再刷新页面，应该可以看到3个请求：
1. 首页 HTML 请求，内容就只有一行 `<script>` 标签
2. 由首页加载的 javascript 加载器，里面有密密麻麻的代码
3. /websocket 请求，这将是整个网站的最后一个请求，后续所有的网络交互，均在此请求内发生


# 优劣
几乎全是劣势：
1. 无任何 SEO 当然，使用 AW 并不意味着与SEO 的决裂，只是目前为追求极致效果，舍弃了SEO 而已
2. 加载更慢了 明显使用C++实现的浏览器，基础性能肯定好过JS写的加载器
3. 调试不便，舍弃更便捷的 Network 面板而自造轮子，无异于缘木求鱼 买椟还珠！
4. 失去了浏览器内置的缓存支持 如果使用 Cache API 重新实现缓存机制 将有不小的工作量

可能的优势
1. 