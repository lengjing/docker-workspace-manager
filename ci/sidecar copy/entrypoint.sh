#!/bin/bash
set -e

echo "Generating sshd_config..."

# sshd_config=/etc/ssh/sshd_config

# cat > "$sshd_config" <<EOF
# PermitRootLogin yes
# PasswordAuthentication yes
# ChallengeResponseAuthentication no
# UsePAM no
# X11Forwarding yes
# PrintMotd no
# AcceptEnv LANG LC_*
# Subsystem sftp /usr/lib/openssh/sftp-server
# EOF

# for port in $(seq 22001 22100); do
#   echo "Port $port" >> "$sshd_config"
# done

echo "Starting sshd..."
/usr/sbin/sshd -D
