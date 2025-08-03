use async_trait::async_trait;
use russh::server::{self, Handle, Server as _, Session};
use russh::{Channel, ChannelId, SftpSession};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

// 定义服务器结构体
#[derive(Clone)]
struct SimpleServer;

impl server::Server for SimpleServer {
    type Handler = SimpleHandler;
    fn new_client(&mut self, _: Option<std::net::SocketAddr>) -> SimpleHandler {
        SimpleHandler
    }
}

// 定义处理客户端请求的 Handler
struct SimpleHandler;

#[async_trait]
impl server::Handler for SimpleHandler {
    type Error = anyhow::Error;

    // 跳过认证，直接返回 true 允许连接
    async fn auth_none(&mut self, _user: &str, _session: &mut Session) -> Result<bool, Self::Error> {
        Ok(true) // 允许无认证登录
    }

    // 处理通道打开请求
    async fn channel_open_session(&mut self, channel: Channel<server::Msg>, _session: &mut Session) -> Result<bool, Self::Error> {
        println!("New session channel opened: {:?}", channel.id());
        Ok(true)
    }

    // 处理客户端执行命令的请求
    async fn exec_request(&mut self, channel: ChannelId, data: &[u8], session: &mut Session) -> Result<(), Self::Error> {
        let command = String::from_utf8_lossy(data).to_string();
        println!("Executing command: {}", command);

        // 获取通道的句柄
        let mut channel = session.channel(channel).await.unwrap();

        // 模拟命令执行结果
        let output = format!("Echo: {}\n", command);
        channel.data(output.as_bytes()).await?;
        channel.eof().await?;
        channel.close().await?;

        Ok(())
    }

    // 处理 shell 请求
    async fn shell_request(&mut self, channel: ChannelId, session: &mut Session) -> Result<(), Self::Error> {
        println!("Shell requested on channel: {:?}", channel);

        let mut channel = session.channel(channel).await.unwrap();
        channel.data(b"Welcome to the simple SSH server shell!\n").await?;
        channel.eof().await?;
        channel.close().await?;

        Ok(())
    }

    // 处理 SFTP 请求
    async fn sftp_request(&mut self, channel: ChannelId, session: &mut Session) -> Result<(), Self::Error> {
        println!("SFTP requested on channel: {:?}", channel);

        // 创建 SFTP 会话（使用内存文件系统）
        let sftp = SftpSession::default();
        session.request_subsystem(true, channel, b"sftp", Some(sftp)).await?;

        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    // 绑定到本地地址
    let listener = TcpListener::bind("127.0.0.1:2222").await?;
    println!("SSH server listening on 127.0.0.1:2222");

    // 创建服务器实例
    let mut server = SimpleServer;

    loop {
        let (stream, addr) = listener.accept().await?;
        println!("New connection from: {}", addr);

        // 启动服务器处理
        tokio::spawn(async move {
            let config = Arc::new(russh::server::Config {
                ..Default::default()
            });

            if let Err(e) = server.run_on_socket(config, stream).await {
                eprintln!("Error handling connection: {}", e);
            }
        });
    }
}