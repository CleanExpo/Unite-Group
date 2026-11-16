@echo off
rem UNI-2951 service checks: vitest for restoration-world, then a strict type check of the new files only.
cd /d %~dp0\..\..\..\..
call node_modules\.bin\vitest.cmd run src/lib/restoration-world
if errorlevel 1 exit /b 1
call node_modules\.bin\tsc.cmd --noEmit --strict --target ES2022 --module esnext --moduleResolution bundler --types node --skipLibCheck --resolveJsonModule src/lib/restoration-world/scenario.ts src/lib/restoration-world/workforce.ts src/lib/restoration-world/service/world-service.ts src/lib/restoration-world/service/http-server.ts src/lib/restoration-world/service/serve.ts src/lib/restoration-world/schema/gen-gdscript.ts
if errorlevel 1 exit /b 1
echo CHECKS PASSED
