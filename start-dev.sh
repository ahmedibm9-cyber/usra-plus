#!/bin/bash
cd /home/z/my-project
npx next dev -p 3000 --webpack > dev.log 2>&1 &
echo $! > /home/z/my-project/.next-dev.pid
disown
