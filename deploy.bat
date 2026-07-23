@echo off
chcp 65001 >nul
setlocal

:: 切换到项目目录
cd /d "G:\ccode\my-blog"

:: 设置 Node.js 22
set PATH=C:\Users\刘涛\AppData\Local\Temp\node-v22.12.0\node-v22.12.0-win-x64;%PATH%

:: 加载 Cloudflare API Token
for /f "tokens=2 delims==" %%i in ('findstr CLOUDFLARE_API_TOKEN .env.cf') do set CLOUDFLARE_API_TOKEN=%%i

echo ============================
echo   构建并部署到 Cloudflare Pages
echo ============================
echo.

:: 构建
echo [1/2] 构建静态站点...
call pnpm build
if %errorlevel% neq 0 (
    echo 构建失败！
    pause
    exit /b 1
)
echo 构建成功！
echo.

:: 部署
echo [2/2] 部署到 Cloudflare Pages...
npx wrangler pages deploy dist/ --project-name my-blog
if %errorlevel% neq 0 (
    echo 部署失败！
    pause
    exit /b 1
)
echo.
echo 部署成功！
pause
