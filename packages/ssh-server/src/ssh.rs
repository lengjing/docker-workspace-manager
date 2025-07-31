impl Handler for ClientHandler {
    type Error = anyhow::Error;

    async fn auth_publickey(
        self,
        user: &str,
        public_key: &PublicKey,
    ) -> Result<(Self, russh::server::Auth), Self::Error> {
        println!("🔐 用户名：{}", user);
        // 例如 user = "alice__project1" → 提取 project1
        Ok((self, russh::server::Auth::Accept))
    }
}

use tokio::net::TcpStream;

impl Handler for ClientHandler {
    async fn channel_open_session(
        self,
        channel: ChannelId,
        session: Session,
    ) -> Result<(Self, Session), Self::Error> {
        // 假设你通过用户名获得目标 IP/port
        let target_host = "172.18.0.3:22";

        let mut target = TcpStream::connect(target_host).await?;

        // 然后使用 tokio::io::copy_bidirectional 转发
        tokio::spawn(async move {
            let mut ssh_channel = session.into_stream(channel).await.unwrap();
            let _ = tokio::io::copy_bidirectional(&mut ssh_channel, &mut target).await;
        });

        Ok((self, session))
    }
}
