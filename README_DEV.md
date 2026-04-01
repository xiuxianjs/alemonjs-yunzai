# 对于开发者

## 快速开始

```ts
import { YunzaiPlugin as Plugin } from 'alemonjs-yunzai';
```

## 导出一览

| 导出                | 说明                                                 |
| ------------------- | ---------------------------------------------------- |
| `YunzaiPlugin`      | 插件基类，等同于 Yunzai 的 `plugin`                  |
| `segment`           | 消息构建工具（text / image / at / face / button 等） |
| `loader`            | 全局插件加载器单例                                   |
| `createYunzaiEvent` | AlemonJS 事件 → Yunzai `e` 对象适配器                |
| `PluginLoader`      | 加载器类（通常使用 `loader` 单例即可）               |
| `cfg`               | 配置对象（masterQQ / package 等）                    |
| `common`            | 工具函数（sleep / downFile / makeForwardMsg）        |
| `Handler`           | 插件间通信机制（add / call / has）                   |
| `sleep`             | 休眠函数                                             |
| `downFile`          | 文件下载工具                                         |
| `makeForwardMsg`    | 转发消息构建                                         |
| `puppeteer`         | 截图渲染器（screenshot / screenshots）               |

## 迁移对照表

> 仅需修改 `import` 语句，插件逻辑代码**不需要改动**。

### plugin 基类

```diff
- import plugin from '../../lib/plugins/plugin.js'
- import plugin from '../../../lib/plugins/plugin.js'
- import plugin from '../../../../lib/plugins/plugin.js'
+ import { YunzaiPlugin as plugin } from 'alemonjs-yunzai'
```

也可以直接使用全局变量 `plugin`（加载器已自动注入），无需 import。

### cfg 配置

```diff
- import cfg from '../../lib/config/config.js'
- import cfg from '../../../lib/config/config.js'
- import cfg from '../../../../lib/config/config.js'
+ import { cfg } from 'alemonjs-yunzai'
```

支持的属性：`cfg.masterQQ`、`cfg.package`、`cfg.qq`、`cfg.getGroup()`、`cfg.getConfig()`、`cfg.getdefSet()`

### common 工具

```diff
- import common from '../../lib/common/common.js'
- import common from '../../../lib/common/common.js'
+ import { common } from 'alemonjs-yunzai'
```

支持的方法：`common.sleep()`、`common.downFile()`、`common.makeForwardMsg()`

### puppeteer 截图

```diff
- import puppeteer from '../../lib/puppeteer/puppeteer.js'
- import puppeteer from '../../../lib/puppeteer/puppeteer.js'
+ import { puppeteer } from 'alemonjs-yunzai'
```

支持的方法：`puppeteer.screenshot(name, data)`、`puppeteer.screenshots(name, data)`

### Handler 插件通信

```diff
- import Handler from '../../lib/plugins/handler.js'
+ import { Handler } from 'alemonjs-yunzai'
```

支持的方法：`Handler.add()`、`Handler.call()`、`Handler.has()`、`Handler.del()`

### segment 消息构建

```diff
- import { segment } from 'oicq'
- import { segment } from 'icqq'
+ import { segment } from 'alemonjs-yunzai'
```

> 非 QQ 平台上 button 会降级为 `[帮助 | 米游社 | Cookie帮助]` 文本提示。

## 全局变量

加载器启动后自动注入以下全局变量，**无需手动 import**：

| 全局变量  | 说明                                                                  |
| --------- | --------------------------------------------------------------------- |
| `plugin`  | 插件基类（`YunzaiPlugin`）                                            |
| `segment` | 消息构建工具                                                          |
| `logger`  | 日志（含 `.red` `.green` `.chalk` 颜色方法）                          |
| `redis`   | Redis 客户端（无 Redis 时自动内存兜底，支持 Hash/SortedSet/List/Set） |
| `Bot`     | Bot 实例桩对象                                                        |
| `cfg`     | 配置对象                                                              |
| `common`  | 工具函数                                                              |

## e 对象（事件上下文）

插件收到的 `e` 对象包含以下 Yunzai 兼容属性：

| 属性 / 方法      | 说明                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e.msg`          | 消息文本                                                                                                                                           |
| `e.original_msg` | 原始消息（修改 e.msg 前的备份）                                                                                                                    |
| `e.user_id`      | 用户 ID                                                                                                                                            |
| `e.group_id`     | 群 ID                                                                                                                                              |
| `e.group_name`   | 群名（当前为空字符串桩）                                                                                                                           |
| `e.sender`       | 发送者信息                                                                                                                                         |
| `e.isGroup`      | 是否群聊                                                                                                                                           |
| `e.isMaster`     | 是否主人                                                                                                                                           |
| `e.reply(msg)`   | 回复消息                                                                                                                                           |
| `e.img`          | 图片 URL 数组                                                                                                                                      |
| `e.source`       | 消息来源（seq / time / fid）— 桩：null                                                                                                             |
| `e.member`       | 成员对象（含 `getAvatarUrl()`）                                                                                                                    |
| `e.group`        | 群对象（sendMsg / makeForwardMsg / getChatHistory / sendFile / pickMember / getMemberMap / getFileUrl / quit / setCard / muteMember / kickMember） |
| `e.friend`       | 好友对象（sendMsg / makeForwardMsg / getChatHistory / sendFile / getAvatarUrl）                                                                    |
| `e.runtime`      | 渲染接口（render / getUid / cfg）                                                                                                                  |
| `e.post_type`    | 事件类型                                                                                                                                           |
| `e.platform`     | 平台标识                                                                                                                                           |
| `e.toString()`   | 返回 e.msg                                                                                                                                         |

## plugin 基类方法

| 方法                       | 说明                       |
| -------------------------- | -------------------------- |
| `this.reply(msg)`          | 回复消息                   |
| `this.setContext(type)`    | 设置多步交互上下文         |
| `this.getContext(type)`    | 获取上下文                 |
| `this.finish(type)`        | 清除上下文                 |
| `this.awaitContext()`      | Promise 风格等待用户回复   |
| `this.resolveContext(ctx)` | 解析 awaitContext          |
| `this.makeForwardMsg()`    | 构建转发消息               |
| `this.renderImg()`         | 渲染图片（调用 puppeteer） |

## 定时任务

与 Yunzai 写法完全一致：

```js
export class MyPlugin extends plugin {
  constructor() {
    super({
      name: '示例',
      task: {
        cron: '0 0 8 * * *', // 每天 8 点
        fnc: 'daily'
      }
    });
  }
  async daily() {
    // ...
  }
}
```

## Redis 内存兜底

无 Redis 时自动使用内存 Map 兜底，支持以下全部命令：

| 分类       | 方法                                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| String     | `get` / `set` / `del` / `keys` / `incr` / `expire` / `exists` / `setEx`                                                                                            |
| Hash       | `hGet` / `hSet` / `hDel` / `hGetAll`                                                                                                                               |
| Sorted Set | `zAdd` / `zScore` / `zRange` / `zRangeWithScores` / `zRevRange` / `zRevRank` / `zRem` / `zCard` / `zRangeByScore` / `zRangeByScoreWithScores` / `zRemRangeByScore` |
| List       | `lPush` / `lRange`                                                                                                                                                 |
| Set        | `sAdd` / `sMembers`                                                                                                                                                |

## Bot 桩对象

全局 `Bot` 对象提供以下桩方法（避免插件报错）：

| 方法                     | 说明                                 |
| ------------------------ | ------------------------------------ |
| `Bot.pickUser(uid)`      | 返回含 sendMsg / getAvatarUrl 的对象 |
| `Bot.pickGroup(gid)`     | 返回完整群对象桩                     |
| `Bot.pickFriend(uid)`    | 返回含 sendMsg 等的好友对象桩        |
| `Bot.getGroupMemberInfo` | 返回成员信息对象                     |
| `Bot.getGroupMemberList` | 返回空数组                           |
| `Bot.getGroupInfo`       | 返回群信息对象                       |
| `Bot.getFriendList`      | 返回空数组                           |
| `Bot.sendGroupMsg`       | 发送群消息（桩）                     |
| `Bot.sendPrivateMsg`     | 发送私聊消息（桩）                   |

## 不兼容项

以下模块因强依赖 Miao-Yunzai 运行时或米游社 API，**不提供兼容**：

| 模块           | 原因                                 |
| -------------- | ------------------------------------ |
| `Runtime`      | 强依赖原神/星铁 MysApi               |
| `#miao`        | miao-plugin 内部模块（App / Cfg 等） |
| `#miao.models` | 游戏数据模型（Character / Weapon）   |
| `e.runtime`    | 仅提供 render 桩，完整功能需 MysInfo |
| `Restart` 类   | 依赖 pm2 进程管理                    |
