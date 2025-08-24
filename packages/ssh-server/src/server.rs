use anyhow::Result;
use std::sync::Arc;
use russh::server::{Config as RusshConfig, Server, Handle, Msg, Response};
use russh_keys::*;
use tokio::net::TcpListener;
use tracing::{info, error, warn};
use std::collections::HashMap;

use crate::config::Config;
use crate::session::SessionHandler;

pub struct SshServer {
    config: Arc<Config>,
}

impl SshServer {
    pub async fn new(config: Config) -> Result<Self> {
        Ok(Self {
            config: Arc::new(config),
        })
    }

    pub async fn run(&self) -> Result<()> {
        let addr = format!("{}:{}", self.config.bind_address, self.config.port);
        
        // Load or generate host key
        let host_key = Self::load_or_generate_host_key(&self.config.host_key_path).await?;
        
        let server_config = RusshConfig {
            inactivity_timeout: Some(std::time::Duration::from_secs(self.config.connection_timeout)),
            auth_rejection_time: std::time::Duration::from_secs(3),
            auth_rejection_time_initial: Some(std::time::Duration::from_secs(0)),
            keys: vec![host_key],
            ..Default::default()
        };

        info!("SSH server listening on {}", addr);

        let server = SshServerImpl {
            config: Arc::clone(&self.config),
        };

        russh::server::run(server_config, &addr, server).await?;
        
        Ok(())
    }

    async fn load_or_generate_host_key(path: &std::path::Path) -> Result<KeyPair> {
        match tokio::fs::read(path).await {
            Ok(data) => {
                info!("Loading existing host key from {:?}", path);
                load_secret_key(&data, None).map_err(|e| {
                    anyhow::anyhow!("Failed to decode host key: {}", e)
                })
            }
            Err(_) => {
                info!("Generating new host key at {:?}", path);
                let key = KeyPair::generate_ed25519().unwrap();
                
                // Ensure directory exists
                if let Some(parent) = path.parent() {
                    tokio::fs::create_dir_all(parent).await?;
                }
                
                // Save the key
                let encoded = encode_pkcs8_pem(&key)?;
                tokio::fs::write(path, encoded).await?;
                
                // Set proper permissions (600)
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let mut perms = tokio::fs::metadata(path).await?.permissions();
                    perms.set_mode(0o600);
                    tokio::fs::set_permissions(path, perms).await?;
                }
                
                Ok(key)
            }
        }
    }
}

struct SshServerImpl {
    config: Arc<Config>,
}

#[async_trait::async_trait]
impl Server for SshServerImpl {
    type Handler = SessionHandler;

    async fn new_client(&mut self, _peer_addr: Option<std::net::SocketAddr>) -> Self::Handler {
        SessionHandler::new(Arc::clone(&self.config))
    }
}
