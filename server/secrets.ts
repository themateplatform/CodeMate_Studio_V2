import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, hkdfSync } from 'node:crypto';
import bcrypt from 'bcrypt';
import { db } from './db';
import { storage } from './storage';
import { 
  secrets, 
  secretAccess, 
  secretRotations, 
  secretTokens,
  type Secret, 
  type InsertSecret, 
  type SecretAccess as SecretAccessType,
  type InsertSecretAccess, 
  type SecretRotation, 
  type InsertSecretRotation,
  type SecretToken,
  type InsertSecretToken
} from '@shared/schema';
import { eq, and, lt, desc, asc } from 'drizzle-orm';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Keyring configuration
interface MasterKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  isActive: boolean;
}

interface Keyring {
  currentKeyId: string;
  keys: Map<string, MasterKey>;
}

// Token configuration
const DEFAULT_TOKEN_EXPIRY_HOURS = 24;
const MAX_TOKEN_EXPIRY_HOURS = 168; // 7 days

export interface SecretDecryptionResult {
  success: boolean;
  value?: string;
  error?: string;
}

export interface SecretRotationResult {
  success: boolean;
  secretId?: string;
  error?: string;
}

export interface TokenGenerationResult {
  success: boolean;
  token?: string;
  tokenId?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Comprehensive secrets management service with encryption, rotation, and audit trails
 */
export class SecretsService {
  private static instance: SecretsService;
  private encryptionKey: Buffer;
  private keyring!: Keyring;

  private constructor() {
    // SECURITY: Fail fast if encryption key is not set
    const masterKey = process.env.SECRETS_ENCRYPTION_KEY;
    if (!masterKey) {
      throw new Error('CRITICAL: SECRETS_ENCRYPTION_KEY environment variable must be set for security');
    }
    // Validate base64 key decodes to at least 32 bytes (256 bits for AES-256)
    try {
      const decodedKey = Buffer.from(masterKey, 'base64');
      if (decodedKey.length < 32) {
        throw new Error('CRITICAL: SECRETS_ENCRYPTION_KEY must decode to at least 32 bytes (256 bits)');
      }
    } catch (error) {
      throw new Error('CRITICAL: SECRETS_ENCRYPTION_KEY must be a valid base64 string');
    }
    this.encryptionKey = Buffer.from(masterKey, 'base64');
    
    // Initialize keyring with current master key
    this.initializeKeyring();
  }
  
  /**
   * Initialize keyring with the current master key
   */
  private initializeKeyring(): void {
    const currentKeyId = createHash('sha256').update(this.encryptionKey).digest('hex').substring(0, 16);
    
    this.keyring = {
      currentKeyId,
      keys: new Map([[
        currentKeyId,
        {
          id: currentKeyId,
          key: this.encryptionKey,
          createdAt: new Date(),
          isActive: true
        }
      ]])
    };
  }
  
  /**
   * Add a new master key to the keyring
   */
  async addMasterKey(newKeyBase64: string, rotatedBy: string): Promise<{ success: boolean; keyId?: string; error?: string }> {
    try {
      const newKey = Buffer.from(newKeyBase64, 'base64');
      if (newKey.length < 32) {
        return { success: false, error: 'New key must be at least 32 bytes (256 bits)' };
      }
      
      const newKeyId = createHash('sha256').update(newKey).digest('hex').substring(0, 16);
      
      // Check if key already exists
      if (this.keyring.keys.has(newKeyId)) {
        return { success: false, error: 'Key already exists in keyring' };
      }
      
      // Add new key to keyring
      this.keyring.keys.set(newKeyId, {
        id: newKeyId,
        key: newKey,
        createdAt: new Date(),
        isActive: true
      });
      
      // Mark old key as inactive
      const oldKey = this.keyring.keys.get(this.keyring.currentKeyId);
      if (oldKey) {
        oldKey.isActive = false;
      }
      
      // Set new key as current
      this.keyring.currentKeyId = newKeyId;
      this.encryptionKey = newKey;
      
      console.log(`Added new master key ${newKeyId}, rotated by ${rotatedBy}`);
      return { success: true, keyId: newKeyId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Get master key by ID for decryption
   */
  private getMasterKey(keyId: string): Buffer | null {
    const masterKey = this.keyring.keys.get(keyId);
    return masterKey ? masterKey.key : null;
  }
  
  /**
   * Get current master key for encryption
   */
  private getCurrentMasterKey(): { id: string; key: Buffer } {
    const currentKey = this.keyring.keys.get(this.keyring.currentKeyId);
    if (!currentKey) {
      throw new Error('Current master key not found in keyring');
    }
    return { id: currentKey.id, key: currentKey.key };
  }

  static getInstance(): SecretsService {
    if (!SecretsService.instance) {
      SecretsService.instance = new SecretsService();
    }
    return SecretsService.instance;
  }

  /**
   * Derive a unique key for each secret using HKDF with deterministic salt
   */
  private deriveSecretKey(secretId: string, keyVersion: number = 1, masterKeyId?: string): Buffer {
    const info = `secret:${secretId}:v${keyVersion}`;
    // Use deterministic salt based on secretId and keyVersion to ensure consistent keys
    const saltInput = `${secretId}:v${keyVersion}:salt`;
    const salt = createHash('sha256').update(saltInput).digest();
    
    // Use specified master key or current master key
    const masterKey = masterKeyId ? this.getMasterKey(masterKeyId) : this.getCurrentMasterKey().key;
    if (!masterKey) {
      throw new Error(`Master key not found: ${masterKeyId}`);
    }
    
    return Buffer.from(hkdfSync('sha256', masterKey, salt, info, 32));
  }

  /**
   * Encrypt a secret value with AES-256-GCM using proper IV and per-secret key derivation
   */
  private encryptValue(value: string, secretId: string, keyVersion: number = 1): { encryptedValue: string; keyHash: string; keyVersion: number; masterKeyId: string } {
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Get current master key for encryption
    const { id: masterKeyId, key: masterKey } = this.getCurrentMasterKey();
    
    // Derive unique key for this secret
    const secretKey = this.deriveSecretKey(secretId, keyVersion, masterKeyId);
    
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, secretKey, iv);
    cipher.setAAD(salt); // Additional authenticated data
    
    let encrypted = cipher.update(value, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const tag = cipher.getAuthTag();
    
    // Validate tag length for security
    if (tag.length !== TAG_LENGTH) {
      throw new Error(`Invalid authentication tag length: expected ${TAG_LENGTH}, got ${tag.length}`);
    }
    
    // Combine masterKeyId + salt + iv + tag + encrypted data
    const masterKeyIdBuffer = Buffer.from(masterKeyId, 'hex');
    const combined = Buffer.concat([masterKeyIdBuffer, salt, iv, tag, encrypted]);
    const encryptedValue = combined.toString('base64');
    
    // Generate key hash for key rotation detection
    const keyHash = createHash('sha256').update(masterKey).digest('hex');
    
    return { encryptedValue, keyHash, keyVersion, masterKeyId };
  }

  /**
   * Decrypt a secret value using proper IV and per-secret key derivation
   */
  private decryptValue(encryptedValue: string, keyHash: string, secretId: string, keyVersion: number = 1, masterKeyId?: string): SecretDecryptionResult {
    try {
      const combined = Buffer.from(encryptedValue, 'base64');
      
      let extractedMasterKeyId: string;
      let dataOffset = 0;
      
      // Check if we have masterKeyId embedded in the data (new format)
      if (combined.length >= 8 && !masterKeyId) {
        extractedMasterKeyId = combined.subarray(0, 8).toString('hex');
        dataOffset = 8;
      } else if (masterKeyId) {
        extractedMasterKeyId = masterKeyId;
      } else {
        // Fallback to current master key for legacy data
        extractedMasterKeyId = this.keyring.currentKeyId;
      }
      
      // Get the appropriate master key
      const masterKey = this.getMasterKey(extractedMasterKeyId);
      if (!masterKey) {
        return { success: false, error: `Master key not found: ${extractedMasterKeyId}` };
      }
      
      // Verify key hash if provided
      if (keyHash) {
        const currentKeyHash = createHash('sha256').update(masterKey).digest('hex');
        if (keyHash !== currentKeyHash) {
          // Try all available keys for backward compatibility
          for (const [keyId, keyInfo] of Array.from(this.keyring.keys)) {
            const testKeyHash = createHash('sha256').update(keyInfo.key).digest('hex');
            if (testKeyHash === keyHash) {
              extractedMasterKeyId = keyId;
              break;
            }
          }
        }
      }
      
      // Validate minimum length
      const minLength = dataOffset + SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
      if (combined.length < minLength) {
        return { success: false, error: 'Invalid encrypted data: too short' };
      }
      
      // Extract components
      const salt = combined.subarray(dataOffset, dataOffset + SALT_LENGTH);
      const iv = combined.subarray(dataOffset + SALT_LENGTH, dataOffset + SALT_LENGTH + IV_LENGTH);
      const tag = combined.subarray(dataOffset + SALT_LENGTH + IV_LENGTH, dataOffset + SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.subarray(dataOffset + SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      
      // Validate tag length
      if (tag.length !== TAG_LENGTH) {
        return { success: false, error: `Invalid authentication tag length: expected ${TAG_LENGTH}, got ${tag.length}` };
      }
      
      // Derive the same secret key used for encryption
      const secretKey = this.deriveSecretKey(secretId, keyVersion, extractedMasterKeyId);
      
      const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, secretKey, iv);
      decipher.setAuthTag(tag);
      decipher.setAAD(salt);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return { success: true, value: decrypted.toString('utf8') };
    } catch (error) {
      return { success: false, error: `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Create a new secret with encryption
   */
  async createSecret(
    secretData: Omit<InsertSecret, 'encryptedValue' | 'keyHash'> & { value: string },
    createdBy: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<Secret> {
    const { value, ...baseData } = secretData;
    
    // First insert the secret to get the real ID
    const [tempSecret] = await db.insert(secrets).values({
      ...baseData,
      encryptedValue: 'placeholder', // Temporary placeholder
      keyHash: 'placeholder',
      keyVersion: 1,
      createdBy,
      updatedBy: createdBy,
    }).returning();

    try {
      // Now encrypt with the real secret ID
      const { encryptedValue, keyHash, keyVersion, masterKeyId } = this.encryptValue(value, tempSecret.id);

      // Update the secret with the real encrypted data
      const [secret] = await db.update(secrets)
        .set({
          encryptedValue,
          keyHash,
          keyVersion,
          // Note: masterKeyId would need to be added to schema
        })
        .where(eq(secrets.id, tempSecret.id))
        .returning();

      // Log the creation
      await this.logAccess({
        secretId: secret.id,
        userId: createdBy,
        accessType: 'write',
        accessMethod: 'api',
        success: true,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        metadata: { action: 'create', key: secret.key }
      });

      return secret;
    } catch (error) {
      // Clean up if encryption fails
      await db.delete(secrets).where(eq(secrets.id, tempSecret.id));
      throw error;
    }
  }

  /**
   * Get and decrypt a secret value
   */
  async getSecretValue(
    secretId: string,
    userId: string,
    context: { ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<SecretDecryptionResult> {
    try {
      const [secret] = await db.select().from(secrets).where(eq(secrets.id, secretId));
      
      if (!secret) {
        await this.logAccess({
          secretId,
          userId,
          accessType: 'read',
          accessMethod: 'api',
          success: false,
          errorMessage: 'Secret not found',
          ...context
        });
        return { success: false, error: 'Secret not found' };
      }

      if (!secret.isActive) {
        await this.logAccess({
          secretId,
          userId,
          accessType: 'read',
          accessMethod: 'api',
          success: false,
          errorMessage: 'Secret is inactive',
          ...context
        });
        return { success: false, error: 'Secret is inactive' };
      }

      const decryptResult = this.decryptValue(secret.encryptedValue, secret.keyHash, secret.id, secret.keyVersion || 1);
      
      await this.logAccess({
        secretId,
        userId,
        accessType: 'read',
        accessMethod: 'api',
        success: decryptResult.success,
        errorMessage: decryptResult.error,
        ...context,
        metadata: { key: secret.key }
      });

      return decryptResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logAccess({
        secretId,
        userId,
        accessType: 'read',
        accessMethod: 'api',
        success: false,
        errorMessage,
        ...context
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update a secret value with rotation tracking
   */
  async updateSecret(
    secretId: string,
    newValue: string,
    updatedBy: string,
    context: { reason?: string; ipAddress?: string; userAgent?: string; requestId?: string }
  ): Promise<SecretRotationResult> {
    try {
      const [existingSecret] = await db.select().from(secrets).where(eq(secrets.id, secretId));
      
      if (!existingSecret) {
        return { success: false, error: 'Secret not found' };
      }

      // Create rotation record
      const oldValueHash = createHash('sha256').update(existingSecret.encryptedValue).digest('hex');
      
      const [rotationRecord] = await db.insert(secretRotations).values({
        secretId,
        oldValueHash,
        rotationType: 'manual',
        rotatedBy: updatedBy,
        reason: context.reason || 'Manual update',
        status: 'pending'
      }).returning();

      try {
        // Encrypt new value with incremented key version
        const newKeyVersion = (existingSecret.keyVersion || 1) + 1;
        const { encryptedValue, keyHash, keyVersion } = this.encryptValue(newValue, secretId, newKeyVersion);

        // Update the secret
        await db.update(secrets)
          .set({
            encryptedValue,
            keyHash,
            keyVersion,
            updatedBy,
            lastRotated: new Date(),
            nextRotation: existingSecret.rotationEnabled && existingSecret.rotationInterval 
              ? new Date(Date.now() + existingSecret.rotationInterval * 24 * 60 * 60 * 1000)
              : undefined,
            updatedAt: new Date()
          })
          .where(eq(secrets.id, secretId));

        // Mark rotation as completed
        await db.update(secretRotations)
          .set({ status: 'completed' })
          .where(eq(secretRotations.id, rotationRecord.id));

        // Log the update
        await this.logAccess({
          secretId,
          userId: updatedBy,
          accessType: 'write',
          accessMethod: 'api',
          success: true,
          ...context,
          metadata: { action: 'rotate', reason: context.reason, rotationId: rotationRecord.id }
        });

        return { success: true, secretId };
      } catch (error) {
        // Mark rotation as failed
        await db.update(secretRotations)
          .set({ 
            status: 'failed', 
            errorMessage: error instanceof Error ? error.message : 'Unknown error' 
          })
          .where(eq(secretRotations.id, rotationRecord.id));
        
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logAccess({
        secretId,
        userId: updatedBy,
        accessType: 'write',
        accessMethod: 'api',
        success: false,
        errorMessage,
        ...context
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate a short-lived access token for service-to-service communication
   */
  async generateAccessToken(
    organizationId: string,
    createdBy: string,
    serviceId: string,
    scopedSecrets: string[],
    options: {
      expiryHours?: number;
      maxUsages?: number;
      ipRestrictions?: string[];
      permissions?: any;
    } = {}
  ): Promise<TokenGenerationResult> {
    try {
      const expiryHours = Math.min(options.expiryHours || DEFAULT_TOKEN_EXPIRY_HOURS, MAX_TOKEN_EXPIRY_HOURS);
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
      
      // Generate cryptographically secure token
      const token = randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(token, 12);

      const [tokenRecord] = await db.insert(secretTokens).values({
        tokenHash,
        organizationId,
        createdBy,
        serviceId,
        scopedSecrets,
        expiresAt,
        maxUsages: options.maxUsages,
        ipRestrictions: options.ipRestrictions,
        permissions: options.permissions || { read: true },
      }).returning();

      return {
        success: true,
        token: `st_${token}`, // Prefix for easy identification
        tokenId: tokenRecord.id,
        expiresAt
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token generation failed'
      };
    }
  }

  /**
   * Validate and use an access token
   */
  async validateAccessToken(
    token: string,
    context: { ipAddress?: string; serviceId?: string }
  ): Promise<{ valid: boolean; tokenRecord?: SecretToken; error?: string }> {
    try {
      // Remove prefix
      const cleanToken = token.startsWith('st_') ? token.substring(3) : token;
      
      // Get all non-revoked, non-expired tokens
      const tokenRecords = await db.select()
        .from(secretTokens)
        .where(
          and(
            eq(secretTokens.isRevoked, false),
            lt(secretTokens.expiresAt, new Date())
          )
        );

      // Find matching token by comparing hashes
      let validToken: SecretToken | undefined;
      for (const record of tokenRecords) {
        const isValid = await bcrypt.compare(cleanToken, record.tokenHash);
        if (isValid) {
          validToken = record;
          break;
        }
      }

      if (!validToken) {
        return { valid: false, error: 'Invalid or expired token' };
      }

      // Check usage limits
      if (validToken.maxUsages && (validToken.usageCount || 0) >= validToken.maxUsages) {
        return { valid: false, error: 'Token usage limit exceeded' };
      }

      // Check IP restrictions
      if (validToken.ipRestrictions && validToken.ipRestrictions.length > 0 && context.ipAddress) {
        if (!validToken.ipRestrictions.includes(context.ipAddress)) {
          return { valid: false, error: 'IP address not authorized' };
        }
      }

      // Update usage tracking
      await db.update(secretTokens)
        .set({
          lastUsed: new Date(),
          usageCount: (validToken.usageCount || 0) + 1
        })
        .where(eq(secretTokens.id, validToken.id));

      return { valid: true, tokenRecord: validToken };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  /**
   * Revoke an access token
   */
  async revokeAccessToken(tokenId: string, revokedBy: string): Promise<boolean> {
    try {
      const result = await db.update(secretTokens)
        .set({
          isRevoked: true,
          revokedAt: new Date(),
          revokedBy
        })
        .where(eq(secretTokens.id, tokenId));

      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }

  /**
   * Get secrets for an organization with decryption
   */
  async getOrganizationSecrets(
    organizationId: string,
    userId: string,
    options: { category?: string; environment?: string } = {}
  ): Promise<Secret[]> {
    try {
      const conditions = [eq(secrets.organizationId, organizationId)];
      
      if (options.category) {
        conditions.push(eq(secrets.category, options.category));
      }
      if (options.environment) {
        conditions.push(eq(secrets.environment, options.environment));
      }
      
      const query = db.select().from(secrets).where(and(...conditions));

      const secretsData = await query.orderBy(asc(secrets.name));

      // SECURITY: Never return decrypted values in list operations
      return secretsData;
    } catch (error) {
      console.error('Failed to get organization secrets:', error);
      return [];
    }
  }

  /**
   * Clean up expired tokens and rotation records
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      // Clean up expired tokens
      await db.delete(secretTokens)
        .where(
          and(
            lt(secretTokens.expiresAt, new Date()),
            eq(secretTokens.isRevoked, true)
          )
        );

      // Clean up old rotation records (keep 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      await db.delete(secretRotations)
        .where(lt(secretRotations.createdAt, ninetyDaysAgo));

      // Clean up old access logs (keep 180 days)
      const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      await db.delete(secretAccess)
        .where(lt(secretAccess.createdAt, oneEightyDaysAgo));

      console.log('Secrets cleanup completed');
    } catch (error) {
      console.error('Secrets cleanup failed:', error);
    }
  }

  /**
   * Log secret access for audit trail
   */
  private async logAccess(accessData: InsertSecretAccess): Promise<void> {
    try {
      await db.insert(secretAccess).values(accessData);
    } catch (error) {
      console.error('Failed to log secret access:', error);
      // Don't throw - logging failures shouldn't break secret operations
    }
  }

  /**
   * Get audit trail for a secret
   */
  async getSecretAuditTrail(secretId: string, limit: number = 100): Promise<SecretAccessType[]> {
    try {
      return await db.select()
        .from(secretAccess)
        .where(eq(secretAccess.secretId, secretId))
        .orderBy(desc(secretAccess.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Automatic rotation scheduler (to be called by cron job)
   */
  async processScheduledRotations(): Promise<void> {
    try {
      const now = new Date();
      const secretsToRotate = await db.select()
        .from(secrets)
        .where(
          and(
            eq(secrets.rotationEnabled, true),
            eq(secrets.isActive, true),
            lt(secrets.nextRotation, now)
          )
        );

      for (const secret of secretsToRotate) {
        console.log(`Processing scheduled rotation for secret: ${secret.key}`);
        
        // This would typically call an external rotation handler
        // For now, we just log and update the next rotation date
        await db.update(secrets)
          .set({
            nextRotation: new Date(Date.now() + (secret.rotationInterval || 30) * 24 * 60 * 60 * 1000)
          })
          .where(eq(secrets.id, secret.id));
      }
    } catch (error) {
      console.error('Scheduled rotation processing failed:', error);
    }
  }
}

// Singleton instance
export const secretsService = SecretsService.getInstance();