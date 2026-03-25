# 金豆芽 v7 - 火山引擎部署手册

### 1. 准备服务器
1. 购买火山引擎轻量服务器（或云服务器 ECS）。
2. 操作系统建议选择 **Ubuntu 22.04**（或更高版本）。

### 2. 上传并解压
1. 使用 SSH 登录到服务器（例如 root 用户）。
2. 将部署包 `gold-bean-sprout-v7-volcengine.zip` 上传到服务器（例如 `/root` 目录下）。
3. 解压文件：
   ```bash
   apt-get update
   apt-get install unzip -y
   unzip gold-bean-sprout-v7-volcengine.zip -d gold-bean-sprout-v7
   cd gold-bean-sprout-v7
   ```

### 3. 执行自动化部署
执行部署脚本（如果非 root 用户，可能需要 sudo）：
```bash
sudo bash setup.sh
```

在执行过程中，脚本会自动安装 Python、Nginx 等依赖，并配置系统服务。
按提示输入你的环境变量：
- `ARK_API_KEY_PRO`
- `ARK_API_KEY_LITE` 
- `ADMIN_PASSWORD`

### 4. 配置防火墙
进入火山引擎控制台，找到该服务器的“安全组”或“防火墙”设置，确保 **入方向开放 80 端口**。

### 5. 访问系统
部署完成后，直接在浏览器中访问服务器的 **公网 IP** 即可。

如果需要查看后台日志，可以使用以下命令：
```bash
journalctl -u gold-bean-sprout -f
```
