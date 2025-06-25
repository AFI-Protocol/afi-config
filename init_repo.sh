#!/bin/bash
git init
git remote add origin git@github.com:AFI-Protocol/afi-config.git
git add .
git commit -m "Initial commit for afi-config"
git push -u origin main
