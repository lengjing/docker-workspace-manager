#!/bin/bash
set -e


# 启动 SSH 服务
/usr/sbin/sshd -D &

chroot business_root/

# 启动 code-server
code-server --auth none --bind-addr 0.0.0.0:8080 /business_root &

tail -f > /dev/null