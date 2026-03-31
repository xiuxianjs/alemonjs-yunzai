# 阿柠檬-Yunzai翻译器

这是一个 AlemonJS 到插件包，它可以加载 Yunzai 风格的插件（不依赖完整的 Miao-Yunzai 运行时）

什么人适合用这个仓库？

- 立即快速兼容的开发者。

- 追求功能简洁性的朋友。

## 安装说明

### alemongo/alemondesk

- 地址

```sh
https://github.com/xiuxianjs/alemonjs-load-yunzai.git
```

- branch

```sh
release
```

### 对于其他插件

branch 选择 `main` 或 `master`，而不是 `release`, 对于一般的Yunzai插件来说

## 管理指令

所有管理指令⚠️`仅限主人使用`，前缀支持 `#yzp` 或 `#云崽p`（同时支持 `!` `/` `！` `＃`）。

| 指令           | 说明                     |
| -------------- | ------------------------ |
| `#yzp状态`     | 查看已加载的插件及优先级 |
| `#yzp重载`     | 重新扫描并加载所有插件   |
| `#yzp插件列表` | 查看已加载的插件名称     |
| `#yzp帮助`     | 查看帮助信息             |

- alemon.config.yaml 新增 master_key

```yaml
# https://alemonjs.com/docs/config
# 可发指令后观察控制台 [UserKey:abcdefg] 后得到
# 不配置将无法正常获得主人权限
master_key:
  - abcdefg
```

## 对于开发者

```ts
import { YunzaiPlugin, segment, loader, createYunzaiEvent } from 'alemonjs-yunzai';
```

可用导出：

| 导出                | 说明                                        |
| ------------------- | ------------------------------------------- |
| `YunzaiPlugin`      | 插件基类，等同于 Yunzai 的 `plugin`         |
| `segment`           | 消息构建工具（text / image / at / face 等） |
| `loader`            | 全局插件加载器单例                          |
| `createYunzaiEvent` | AlemonJS 事件 → Yunzai `e` 对象适配器       |
| `PluginLoader`      | 加载器类（通常使用 `loader` 单例即可）      |

## 免责声明

- 勿用于以盈利为目的的场景

- 代码开放，无需征得特殊同意，可任意使用。能备注来源最好，但不强求

- 图片与其他素材均来自于网络，仅供交流学习使用，如有侵权请联系，会立即删除
