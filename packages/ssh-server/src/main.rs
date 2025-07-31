use std::sync::Arc;
use russh::{server::{Session, Handler}, ChannelId, ChannelStream};
use russh_keys::key::{KeyPair, PublicKey};

pub struct SSHServer {
    // 可放连接信息、容器路由表等
}

#[derive(Clone)]
pub struct ClientHandler;

impl Handler for ClientHandler {
    type Error = std::io::Error;

    fn auth_password(
        self,
        user: &str,
        password: &str,
    ) -> std::future::Ready<Result<(Self, bool), Self::Error>> {
        // 简单的密码验证示例
        std::future::ready(Ok((self, user == "test" && password == "test")))
    }
}

#[tokio::main]
async fn main() {
    let config = russh::server::Config {
        auth_rejection_time: std::time::Duration::from_secs(3),
        ..Default::default()
    };
    let config = Arc::new(config);

    // russh::server::run_stream(config, stream, handler)
    russh::server::run_stream(config, "0.0.0.0:2222", ClientHandler {}).await.unwrap();
}
