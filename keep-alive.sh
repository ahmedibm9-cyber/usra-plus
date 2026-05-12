#!/bin/bash
cd /home/z/my-project
NODE_OPTIONS='--max-old-space-size=1024' node node_modules/.bin/next start -p 3000
