export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

export interface Agent {
  id: string;
  public_key: string | null;
  encrypted_private_key: EncryptedData | null;
  encrypted_agent_key: EncryptedData | null;
  created_at: Date;
  max_spend: string;
}
