FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y ca-certificates && \
    sed -i 's|http://.*archive.ubuntu.com|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list && \
    sed -i 's|http://.*security.ubuntu.com|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list && \
    apt-get update && apt-get install -y \
    openssh-server \
    iproute2 \
    procps \
    util-linux \
    docker.io \
    python3-pip && \
    mkdir -p /var/run/sshd

RUN mkdir -p /etc/pip && \
    echo "[global]\nindex-url = https://pypi.tuna.tsinghua.edu.cn/simple" > /etc/pip.conf

RUN pip3 install notebook jupyterlab

COPY enter.sh /opt/enter.sh
COPY config /etc/ssh/sshd_config
COPY entrypoint.sh /opt/entrypoint.sh

RUN chmod +x /opt/*.sh

RUN echo 'root:root' | chpasswd

EXPOSE 22001-22100

CMD ["/opt/entrypoint.sh"]