# 训练记录 · 云端接入与部署说明

这个版本把数据从「浏览器本地」搬到了 **Supabase 云端**，并加上了**账号登录**：
- 每个人注册一个**固定账号（用户名 + 密码）**；
- 登录后数据自动同步，换手机 / 换电脑 / 换浏览器都能看到同一份记录；
- 每个人的数据互相隔离，别人看不到你的记录。

下面是一次性配置步骤，做完后网站就真正联网可用了。

---

## 一、创建 Supabase 项目（免费）

1. 打开 https://supabase.com ，注册并登录（可用 GitHub 登录）。
2. 点 **New project**，填：
   - 项目名（随意，如 `training-log`）；
   - 数据库密码（自己记住即可，程序用不到）；
   - 地区选离你近的（如 `Southeast Asia / Singapore` 或 `East Asia / Tokyo`）。
3. 等 1–2 分钟项目初始化完成。

## 二、执行建表脚本

1. 进入项目后，点左侧 **SQL Editor**。
2. 点 **New query**，把本目录下 **`supabase-setup.sql`** 的**全部内容**粘贴进去。
3. 点 **Run**（右下角）。看到 `Success` 即可。

## 三、关闭「邮箱确认」（关键！）

因为我们用「用户名 + 密码」登录、不依赖真实邮箱，必须关掉注册时的邮箱验证，否则无法注册。

1. 左侧 **Authentication** → **Providers** → **Email**。
2. 把 **Confirm email** 关掉（Toggle 置灰 / Off）。
3. 顺手确认 **Allow new users to sign up** 是开启的（默认开）。

> 关掉 Confirm email 后，注册会立即成功、无需收邮件。

## 四、把密钥填进 app.js

1. 左侧 **Project Settings**（底部齿轮）→ **API**。
2. 复制两个值：
   - **Project URL**（形如 `https://xxxx.supabase.co`）；
   - **anon public** 这一行的 key（`eyJ...` 开头，选 **anon** 不是 service_role）。
3. 打开本目录的 **`app.js`**，把最顶部两行改掉：

```js
const SUPABASE_URL = 'https://你的项目.supabase.co';   // 填 Project URL
const SUPABASE_ANON_KEY = '你的 anon public key';      // 填 anon public
```

## 五、把网站部署到公网（让它能联网访问）

现在是纯静态网页，任选一个免费静态托管即可：

- **Vercel**（推荐，最省事）：https://vercel.com → 用 GitHub 导入本目录 → 直接部署。
- **Netlify**：https://app.netlify.com/drop → 把整个文件夹拖进去即部署。
- **GitHub Pages**：把文件推到仓库 → Settings → Pages 开启。

部署后你会得到一个网址（如 `https://你的站点.vercel.app`）。

> 补充：在 Supabase **Authentication → URL Configuration → Site URL** 里填上这个网址（主要用于跳转回调，纯密码登录影响不大，但建议填上）。

## 六、使用

1. 打开网站，点「注册」，填用户名 + 密码。
2. 记录训练，数据即时存云端。
3. 换任何设备登录同一账号，数据都在；「导出/导入」仍可作离线备份。

---

## 常见问题

- **注册提示「用户名已被占用」**：换一个用户名即可。
- **登录提示「用户名或密码错误」**：确认用户名拼写与密码正确；忘记密码目前无自助找回（见下）。
- **保存提示「保存到云端失败」**：检查网络；断网时无法保存，可先用「导出」备份。
- **忘记密码**：当前用合成邮箱，暂不支持自助找回。后续可让管理员在 Supabase → Authentication → Users 里重置，或升级为邮箱登录。

## 安全说明

- `anon public key` 是**公开**的，可以放心放在前端（数据隔离靠 RLS 行级安全策略，不是靠这个 key）。
- 千万别把 **service_role key** 放进前端代码。
