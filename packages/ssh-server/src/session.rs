use anyhow::Result;
use async_trait::async_trait;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use russh::server::{Auth, Session, Handler, Msg, Response};
use russh::{Channel, ChannelId, CryptoVec, Disconnect, MethodSet, Pty};
use russh_keys::key::PublicKey;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};
use futures::FutureExt;

use crate::auth::authenticate_user;
use crate::config::Config;

pub struct SessionHandler {
    config: Arc<Config>,
    authenticated_user: Option<String>,
    channels: Arc<Mutex<HashMap<ChannelId, ChannelState>>>,
}

struct ChannelState {
    process: Option<Child>,
    env: HashMap<String, String>,
    term: Option<String>,
    pty: Option<Pty>,
}

impl SessionHandler {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            authenticated_user: None,
            channels: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl Handler for SessionHandler {
    type Error = anyhow::Error;

    async fn channel_open_session(
        &mut self,
        channel: Channel<Msg>,
        session: &mut Session,
    ) -> Result<bool, Self::Error> {
        debug!("Opening session channel: {:?}", channel.id());
        
        let mut channels = self.channels.lock().await;
        channels.insert(channel.id(), ChannelState {
            process: None,
            env: HashMap::new(),
            term: None,
            pty: None,
        });
        
        Ok(true)
    }

    async fn auth_publickey(
        &mut self,
        user: &str,
        public_key: &PublicKey,
    ) -> Result<Auth, Self::Error> {
        if !self.config.authentication.pubkey_auth {
            return Ok(Auth::Reject {
                proceed_with_methods: None,
            });
        }

        debug!("Public key authentication attempt for user: {}", user);
        
        match authenticate_user(user, Some(public_key), None, &self.config).await {
            Ok(true) => {
                info!("Public key authentication successful for user: {}", user);
                self.authenticated_user = Some(user.to_string());
                Ok(Auth::Accept)
            }
            Ok(false) => {
                warn!("Public key authentication failed for user: {}", user);
                Ok(Auth::Reject {
                    proceed_with_methods: Some(MethodSet::PASSWORD),
                })
            }
            Err(e) => {
                error!("Authentication error: {}", e);
                Ok(Auth::Reject {
                    proceed_with_methods: None,
                })
            }
        }
    }

    async fn auth_password(
        &mut self,
        user: &str,
        password: &str,
    ) -> Result<Auth, Self::Error> {
        if !self.config.authentication.password_auth {
            return Ok(Auth::Reject {
                proceed_with_methods: None,
            });
        }

        debug!("Password authentication attempt for user: {}", user);
        
        match authenticate_user(user, None, Some(password), &self.config).await {
            Ok(true) => {
                info!("Password authentication successful for user: {}", user);
                self.authenticated_user = Some(user.to_string());
                Ok(Auth::Accept)
            }
            Ok(false) => {
                warn!("Password authentication failed for user: {}", user);
                Ok(Auth::Reject {
                    proceed_with_methods: None,
                })
            }
            Err(e) => {
                error!("Authentication error: {}", e);
                Ok(Auth::Reject {
                    proceed_with_methods: None,
                })
            }
        }
    }

    async fn channel_close(
        &mut self,
        channel: ChannelId,
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!("Closing channel: {:?}", channel);
        
        let mut channels = self.channels.lock().await;
        if let Some(mut channel_state) = channels.remove(&channel) {
            if let Some(mut process) = channel_state.process.take() {
                let _ = process.kill().await;
            }
        }
        
        Ok(())
    }

    async fn channel_eof(
        &mut self,
        channel: ChannelId,
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!("Channel EOF: {:?}", channel);
        Ok(())
    }

    async fn pty_request(
        &mut self,
        channel: ChannelId,
        term: &str,
        col_width: u32,
        row_height: u32,
        pix_width: u32,
        pix_height: u32,
        modes: &[(Pty, u32)],
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!(
            "PTY request for channel {:?}: term={}, size={}x{}",
            channel, term, col_width, row_height
        );
        
        let mut channels = self.channels.lock().await;
        if let Some(channel_state) = channels.get_mut(&channel) {
            channel_state.term = Some(term.to_string());
            channel_state.env.insert("TERM".to_string(), term.to_string());
            channel_state.env.insert("COLUMNS".to_string(), col_width.to_string());
            channel_state.env.insert("LINES".to_string(), row_height.to_string());
            
            let pty = Pty {
                term: term.to_string(),
                col_width,
                row_height,
                pix_width,
                pix_height,
                modes: modes.to_vec(),
            };
            channel_state.pty = Some(pty);
        }
        
        Ok(())
    }

    async fn env_request(
        &mut self,
        channel: ChannelId,
        variable_name: &str,
        variable_value: &str,
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!(
            "Environment variable request for channel {:?}: {}={}",
            channel, variable_name, variable_value
        );
        
        let mut channels = self.channels.lock().await;
        if let Some(channel_state) = channels.get_mut(&channel) {
            channel_state.env.insert(
                variable_name.to_string(),
                variable_value.to_string(),
            );
        }
        
        Ok(())
    }

    async fn shell_request(
        &mut self,
        channel: ChannelId,
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!("Shell request for channel: {:?}", channel);
        
        let user = self.authenticated_user.as_ref().ok_or_else(|| {
            anyhow::anyhow!("User not authenticated")
        })?;

        let mut channels = self.channels.lock().await;
        let channel_state = channels.get_mut(&channel).ok_or_else(|| {
            anyhow::anyhow!("Channel not found")
        })?;

        // Start shell process
        let mut cmd = Command::new(&self.config.shell);
        cmd.stdin(Stdio::piped())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped())
           .env_clear();

        // Set environment variables
        for (key, value) in &channel_state.env {
            cmd.env(key, value);
        }

        // Set default environment
        cmd.env("USER", user)
           .env("HOME", format!("/home/{}", user))
           .env("PATH", "/usr/local/bin:/usr/bin:/bin")
           .env("SHELL", &self.config.shell);

        let mut process = cmd.spawn()?;
        
        // Handle process I/O
        let mut stdin = process.stdin.take().unwrap();
        let mut stdout = process.stdout.take().unwrap();
        let mut stderr = process.stderr.take().unwrap();

        channel_state.process = Some(process);
        drop(channels); // Release the lock
        
        // Spawn tasks to handle I/O
        let session_handle = session.handle();
        
        // Stdout handling
        let session_handle_stdout = session_handle.clone();
        tokio::spawn(async move {
            let mut buffer = [0; 4096];
            
            loop {
                match stdout.read(&mut buffer).await {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = CryptoVec::from_slice(&buffer[..n]);
                        if session_handle_stdout.data(channel, data).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
            
            let _ = session_handle_stdout.eof(channel).await;
        });

        // Stderr handling
        let session_handle_stderr = session_handle.clone();
        tokio::spawn(async move {
            let mut buffer = [0; 4096];
            
            loop {
                match stderr.read(&mut buffer).await {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = CryptoVec::from_slice(&buffer[..n]);
                        if session_handle_stderr.extended_data(channel, 1, data).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(())
    }

    async fn exec_request(
        &mut self,
        channel: ChannelId,
        data: &[u8],
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        let command = String::from_utf8_lossy(data);
        debug!("Exec request for channel {:?}: {}", channel, command);
        
        let user = self.authenticated_user.as_ref().ok_or_else(|| {
            anyhow::anyhow!("User not authenticated")
        })?;

        let mut channels = self.channels.lock().await;
        let channel_state = channels.get_mut(&channel).ok_or_else(|| {
            anyhow::anyhow!("Channel not found")
        })?;

        // Execute command
        let mut cmd = Command::new("sh");
        cmd.arg("-c")
           .arg(command.as_ref())
           .stdin(Stdio::piped())
           .stdout(Stdio::piped())
           .stderr(Stdio::piped())
           .env_clear();

        // Set environment variables
        for (key, value) in &channel_state.env {
            cmd.env(key, value);
        }

        // Set default environment
        cmd.env("USER", user)
           .env("HOME", format!("/home/{}", user))
           .env("PATH", "/usr/local/bin:/usr/bin:/bin")
           .env("SHELL", &self.config.shell);

        let mut process = cmd.spawn()?;
        
        // Handle process I/O
        let mut stdout = process.stdout.take().unwrap();
        let mut stderr = process.stderr.take().unwrap();

        channel_state.process = Some(process);
        drop(channels); // Release the lock
        
        let session_handle = session.handle();
        
        // Handle stdout
        let session_handle_stdout = session_handle.clone();
        let stdout_task = tokio::spawn(async move {
            let mut buffer = [0; 4096];
            
            loop {
                match stdout.read(&mut buffer).await {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = CryptoVec::from_slice(&buffer[..n]);
                        if session_handle_stdout.data(channel, data).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        // Handle stderr
        let session_handle_stderr = session_handle.clone();
        let stderr_task = tokio::spawn(async move {
            let mut buffer = [0; 4096];
            
            loop {
                match stderr.read(&mut buffer).await {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        let data = CryptoVec::from_slice(&buffer[..n]);
                        if session_handle_stderr.extended_data(channel, 1, data).await.is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        // Wait for process to complete
        tokio::spawn(async move {
            let _ = futures::future::join(stdout_task, stderr_task).await;
            let _ = session_handle.eof(channel).await;
            let _ = session_handle.close(channel).await;
        });

        Ok(())
    }

    async fn data(
        &mut self,
        channel: ChannelId,
        data: &[u8],
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!("Received data for channel {:?}: {} bytes", channel, data.len());
        
        let channels = self.channels.lock().await;
        if let Some(channel_state) = channels.get(&channel) {
            if let Some(process) = &channel_state.process {
                if let Some(ref mut stdin) = process.stdin.as_ref() {
                    // Write data to process stdin
                    // Note: This is simplified - you'd want proper async handling
                    tokio::spawn({
                        let data = data.to_vec();
                        async move {
                            // In practice, you'd need to store stdin handle properly
                            // This is just a demonstration
                        }
                    });
                }
            }
        }
        
        Ok(())
    }

    async fn window_change_request(
        &mut self,
        channel: ChannelId,
        col_width: u32,
        row_height: u32,
        pix_width: u32,
        pix_height: u32,
        session: &mut Session,
    ) -> Result<(), Self::Error> {
        debug!(
            "Window change request for channel {:?}: {}x{}",
            channel, col_width, row_height
        );
        
        let mut channels = self.channels.lock().await;
        if let Some(channel_state) = channels.get_mut(&channel) {
            // Update environment variables
            channel_state.env.insert("COLUMNS".to_string(), col_width.to_string());
            channel_state.env.insert("LINES".to_string(), row_height.to_string());
            
            // In a full implementation, you'd send SIGWINCH to the process
            // using libc::kill() or similar system call
            #[cfg(unix)]
            {
                if let Some(process) = &channel_state.process {
                    let pid = process.id();
                    if let Some(pid) = pid {
                        // Send SIGWINCH signal to process
                        unsafe {
                            libc::kill(pid as i32, libc::SIGWINCH);
                        }
                    }
                }
            }
        }
        
        Ok(())
    }

    async fn tcpip_forward(
        &mut self,
        address: &str,
        port: &mut u32,
        session: &mut Session,
    ) -> Result<bool, Self::Error> {
        debug!("TCP/IP forward request: {}:{}", address, port);
        // For security, you might want to restrict port forwarding
        // Return false to deny the request
        Ok(false)
    }

    async fn cancel_tcpip_forward(
        &mut self,
        address: &str,
        port: u32,
        session: &mut Session,
    ) -> Result<bool, Self::Error> {
        debug!("Cancel TCP/IP forward request: {}:{}", address, port);
        Ok(true)
    }
}
