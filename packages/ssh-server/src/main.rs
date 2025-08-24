use anyhow::Result;
use clap::Parser;
use std::path::PathBuf;
use tracing::{info, error};
use tracing_subscriber;

mod config;
mod server;
mod auth;
mod session;

use crate::config::Config;
use crate::server::SshServer;

#[derive(Parser, Debug)]
#[command(name = "rust-sshd")]
#[command(about = "A Rust SSH daemon for workspace connections")]
struct Args {
    /// Configuration file path
    #[arg(short, long, default_value = "/etc/rust-sshd/config.toml")]
    config: PathBuf,

    /// Port to listen on
    #[arg(short, long)]
    port: Option<u16>,

    /// Bind address
    #[arg(short, long)]
    bind: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    let args = Args::parse();
    
    // Load configuration
    let mut config = Config::from_file(&args.config).unwrap_or_else(|_| {
        info!("Using default configuration");
        Config::default()
    });

    // Override with command line arguments
    if let Some(port) = args.port {
        config.port = port;
    }
    if let Some(bind) = args.bind {
        config.bind_address = bind;
    }

    info!("Starting SSH server on {}:{}", config.bind_address, config.port);

    // Start the SSH server
    let server = SshServer::new(config).await?;
    server.run().await?;

    Ok(())
}
