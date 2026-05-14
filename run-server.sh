#!/bin/bash
trap "" SIGHUP SIGPIPE
cd /home/z/my-project
export PORT=3000
exec node .next/standalone/server.js
