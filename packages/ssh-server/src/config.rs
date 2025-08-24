use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub bind_address: String,
    pub port: u16,
    pub host_key_path: PathBuf,
    pub authorized_keys_dir: PathBuf,
    pub shell: String,
    pub max_connections: usize,
    pub connection_timeout: u64,
    pub authentication: AuthConfig,
    pub sftp_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthConfig {
    pub password_auth: bool,
    pub pubkey_auth: bool,
    pub keyboard_interactive: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            bind_address: "0.0.0.0".to_string(),
            port: 2222,
            host_key_path: PathBuf::from("/etc/rust-sshd/host_key"),
            authorized_keys_dir: PathBuf::from("/etc/rust-sshd/authorized_keys"),
            shell: "/bin/bash".to_string(),
            max_connections: 100,
            connection_timeout: 300,
            sftp_enabled: true,
            authentication: AuthConfig {
                password_auth: true,
                pubkey_auth: true,
                keyboard_interactive: false,
            },
        }
    }
}

impl Config {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let content = toml::to_string_pretty(self)?;
        fs::write(path, content)?;
        Ok(())
    }
}
