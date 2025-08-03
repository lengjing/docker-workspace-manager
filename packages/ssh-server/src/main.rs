use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

use rand_core::OsRng;
use russh::server::{Server as _, Session};
use russh::*;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

#[tokio::main]
async fn main() {
    env_logger::init();

    let config = russh::server::Config {
        keys: vec![
            russh::keys::PrivateKey::random(&mut OsRng, russh::keys::Algorithm::Ed25519).unwrap(),
        ],
        ..Default::default()
    };
    let config = Arc::new(config);
    let mut sh = Server {
        clients: Arc::new(Mutex::new(HashMap::new())),
        id: 0,
    };

    let socket = TcpListener::bind("0.0.0.0:2222").await.unwrap();
    sh.run_on_socket(config, &socket).await.unwrap();
}

#[derive(Clone)]
struct Server {
    clients: Arc<Mutex<HashMap<usize, (ChannelId, russh::server::Handle)>>>,
    id: usize,
}

impl server::Server for Server {
    type Handler = Self;
    fn new_client(&mut self, _: Option<std::net::SocketAddr>) -> Self {
        let s = self.clone();
        self.id += 1;
        s
    }
    fn handle_session_error(&mut self, _error: <Self::Handler as russh::server::Handler>::Error) {
        eprintln!("Session error: {:#?}", _error);
    }
}

impl server::Handler for Server {
    type Error = russh::Error;

    async fn channel_open_session(
        &mut self,
        channel: Channel<server::Msg>,
        session: &mut Session,
    ) -> Result<bool, Self::Error> {
        let handle = session.handle();
        let channel_id = channel.id();

        let mut clients = self.clients.lock().await;
        clients.insert(self.id, (channel_id, handle));

        // 目标 SSH 服务器的地址和端口
        let target_host = "127.0.0.1";
        let target_port = 22;

        tokio::spawn(async move {
            match TcpStream::connect((target_host, target_port)).await {
                Ok(mut target_stream) => {
                    let mut target_buffer = vec![0; 1024];

                    loop {
                        tokio::select! {
                            // 从客户端通道接收消息
                            event = channel.wait() => {
                                match event {
                                    Some(server::Msg::Data { data }) => {
                                        // 将客户端数据转发到目标服务器
                                        if let Err(e) = target_stream.write(&data).await {
                                            eprintln!("转发到目标服务器失败: {}", e);
                                            break;
                                        }
                                    }
                                    Some(server::Msg::Eof) => {
                                        // 客户端发送 EOF
                                        let _ = target_stream.shutdown().await;
                                        break;
                                    }
                                    _ => {
                                        // 其他消息（如关闭）或无消息
                                        break;
                                    }
                                }
                            }
                            // 从目标服务器读取数据
                            result = target_stream.read(&mut target_buffer) => {
                                match result {
                                    Ok(n) if n > 0 => {
                                        // 将目标服务器数据转发回客户端
                                        if let Err(e) = handle.data(channel_id, CryptoVec::from_slice(&target_buffer[..n])).await {
                                            eprintln!("转发到客户端失败: {}", e);
                                            break;
                                        }
                                    }
                                    Ok(_) => {
                                        // 目标服务器发送 EOF
                                        let _ = handle.eof(channel_id).await;
                                        break;
                                    }
                                    Err(e) => {
                                        eprintln!("从目标服务器读取失败: {}", e);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    eprintln!("连接目标 SSH 服务器失败: {}", e);
                    let _ = handle.close(channel_id).await;
                }
            }
        });

        Ok(true)
    }

    async fn auth_none(&mut self, _user: &str) -> Result<server::Auth, Self::Error> {
        Ok(server::Auth::Accept)
    }

    async fn data(
        &mut self,
        channel: ChannelId,
        data: &[u8],
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        // Sending Ctrl+C ends the session and disconnects the client
        if data == [3] {
            return Err(russh::Error::Disconnect);
        }

        let data = CryptoVec::from(format!("Got data: {}\r\n", String::from_utf8_lossy(data)));
        session.data(channel, data)?;
        Ok(())
    }
}
