@echo off
set /p repo_url="Nhap link GitHub Repository cua Dai Ca (vd: https://github.com/user/repo.git): "

echo.
echo [+] Dang chuan bi code...
git add .
git commit -m "Initial commit - Gmail Manager Cloud"
git branch -M main

echo.
echo [+] Dang ket noi voi GitHub...
git remote add origin %repo_url%
git push -u origin main --force

echo.
echo [!] XONG! Dai Ca vao GitHub Settings -> Pages -> Chon branch main de kich hoat Link Web nhe.
pause
