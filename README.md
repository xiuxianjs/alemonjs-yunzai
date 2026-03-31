# 阿柠檬-Yunzai翻译器

这是一个 AlemonJS 中间件，它可以加载 Yunzai 风格的插件（不依赖完整的 Miao-Yunzai 运行时），让开发者最快利用 AlemonJS 而无需过多改动代码。

## 安装方式1: Git

### alemongo/alemondesk

- 地址

```sh
https://github.com/xiuxianjs/alemonjs-load-yunzai.git
```

- branch

```sh
release
```

## 安装方式2: npm

```sh
yarn add alemonjs-yunzai -W
```

- alemon.config.yaml

```yaml
apps:
  alemonjs-yunzai: true # 启动扩展
```

## 管理指令

所有管理指令⚠️`仅限主人使用`，前缀支持 `#yzp` 或 `#云崽p`（同时支持 `!` `/` `！` `＃`），使用 `#yzp帮助`、`#yzp插件帮助` 和 `#yzp插件说明<别名>` 了解基本使用。

- alemon.config.yaml 新增 master_key

```yaml
# https://alemonjs.com/docs/config
# 可发指令后观察控制台 [UserKey:abcdefg] 后得到
# 不配置将无法正常获得主人权限
master_key:
  - abcdefg
```

- 安装一般操作步骤

`#yzp安装` → `#yzp安装插件miao` → `#yzp安装依赖` → `#yzp启动`

## 配置项

在 `alemon.config.yaml` 中配置：

```yaml
# https://alemonjs.com/docs/config
# 主人权限（必填，否则管理指令不可用）
master_key:
  - abcdefg
```

## 开发者

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
