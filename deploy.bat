@echo off
chcp 65001 >nul
setlocal

:: 切换到项目目录
cd /d "G:\ccode\my-blog"

echo ============================
echo   一键部署：git push 触发 GitHub Actions
echo ============================
echo.

git add .
git commit -m "auto deploy"
git push origin master

if %errorlevel% equ 0 (
    echo.
    echo 部署已触发！查看进度：https://github.com/MisakaMikato0/my-blog/actions
) else (
    echo 部署失败！
)
pause
