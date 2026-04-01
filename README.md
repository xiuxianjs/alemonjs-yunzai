# 阿柠檬-Yunzai胶水层

它可以加载 Yunzai 风格的插件（不依赖Yunzai运行时）

适合用这个仓库的是？

- 立即快速兼容的开发者。

- 追求功能简洁性的朋友。

不适合用这个仓库的是？

- 严重依靠Yunzai米游API的插件

## 安装说明

### alemongo/alemondesk

- 地址

```sh
https://github.com/xiuxianjs/alemonjs-yunzai.git
```

- branch

```sh
release
```

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

[README_DEV.md](./README_DEV.md)

## 免责声明

- 勿用于以盈利为目的的场景

- 代码开放，无需征得特殊同意，可任意使用。能备注来源最好，但不强求

- 图片与其他素材均来自于网络，仅供交流学习使用，如有侵权请联系，会立即删除
