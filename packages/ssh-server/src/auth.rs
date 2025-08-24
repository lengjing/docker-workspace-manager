use anyhow::Result;
use base64::Engine;
use sha2::{Sha256, Digest};
use std::path::Path;
use russh_keys::key::PublicKey;
use tokio::fs;
use tracing::{debug, warn};

use crate::config::Config;

pub async fn authenticate_user(
    username: &str,
    public_key: Option<&PublicKey>,
    password: Option<&str>,
    config: &Config,
) -> Result<bool> {
    // For demonstration, we'll implement basic authentication
    // In production, you'd integrate with your user management system
    
    if let Some(public_key) = public_key {
        return authenticate_public_key(username, public_key, config).await;
    }
    
    if let Some(password) = password {
        return authenticate_password(username, password, config).await;
    }
    
    Ok(false)
}

async fn authenticate_public_key(
    username: &str,
    public_key: &PublicKey,
    config: &Config,
) -> Result<bool> {
    let authorized_keys_path = config.authorized_keys_dir.join(format!("{}.pub", username));
    
    if !authorized_keys_path.exists() {
        debug!("No authorized keys file for user: {}", username);
        return Ok(false);
    }
    
    let authorized_keys_content = fs::read_to_string(&authorized_keys_path).await?;
    
    // Parse authorized keys file
    for line in authorized_keys_content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
        // Simple parsing - in production, you'd want more robust parsing
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let key_type = parts[0];
            let key_data = parts[1];
            
            // Compare with provided key
            if let Ok(auth_key) = decode_public_key(key_type, key_data) {
                if keys_equal(public_key, &auth_key) {
                    return Ok(true);
                }
            }
        }
    }
    
    Ok(false)
}

async fn authenticate_password(
    username: &str,
    password: &str,
    config: &Config,
) -> Result<bool> {
    // This is a very basic implementation
    // In production, you'd integrate with PAM, LDAP, database, etc.
    
    // For demo purposes, accept any password for user "demo"
    if username == "demo" && password == "demo123" {
        return Ok(true);
    }
    
    // You could also check against a password file, database, etc.
    Ok(false)
}

fn decode_public_key(key_type: &str, key_data: &str) -> Result<PublicKey> {
    use base64::engine::general_purpose::STANDARD;
    let decoded = STANDARD.decode(key_data)?;
    
    match key_type {
        "ssh-rsa" | "ssh-ed25519" | "ecdsa-sha2-nistp256" => {
            russh_keys::parse_public_key(&decoded)
                .map_err(|e| anyhow::anyhow!("Failed to parse {} key: {}", key_type, e))
        }
        _ => Err(anyhow::anyhow!("Unsupported key type: {}", key_type)),
    }
}

fn keys_equal(key1: &PublicKey, key2: &PublicKey) -> bool {
    // Compare key fingerprints
    let fingerprint1 = key_fingerprint(key1);
    let fingerprint2 = key_fingerprint(key2);
    fingerprint1 == fingerprint2
}

fn key_fingerprint(key: &PublicKey) -> String {
    let public_key_bytes = key.public_key_bytes();
    let mut hasher = Sha256::new();
    hasher.update(&public_key_bytes);
    let result = hasher.finalize();
    base64::engine::general_purpose::STANDARD_NO_PAD.encode(result)
}
