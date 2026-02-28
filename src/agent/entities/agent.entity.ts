import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true, nullable: true })
  public_key: string | null;

  @Column({ type: 'jsonb', nullable: true })
  encrypted_private_key: EncryptedData | null;

  @Column({ type: 'jsonb', nullable: true })
  encrypted_agent_key: EncryptedData | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'numeric', precision: 20, scale: 8 })
  max_spend: string;
}
