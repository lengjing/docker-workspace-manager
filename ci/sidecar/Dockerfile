FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y ca-certificates && \
    sed -i 's|http://.*archive.ubuntu.com|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list && \
    sed -i 's|http://.*security.ubuntu.com|https://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
    
RUN apt-get update && apt-get install -y \
    curl openssh-server libstdc++6 libgcc-s1 \
    && apt-get clean

RUN echo 'root:root' | chpasswd

RUN curl -L https://github.com/coder/code-server/releases/download/v4.102.2/code-server-4.102.2-linux-amd64.tar.gz -o code-server.tar.gz && \
    tar -xvzf code-server.tar.gz && \
    rm code-server.tar.gz
    
RUN ln -sf /code-server-4.102.2-linux-amd64/bin/code-server /usr/bin/code-server

COPY sshd_config /etc/ssh/sshd_config
COPY start.sh .

RUN chmod +x *.sh

CMD [ "./start.sh" ]
