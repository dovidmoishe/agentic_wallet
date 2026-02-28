import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1771636704324 implements MigrationInterface {
    name = 'InitialSchema1771636704324'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "agents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "public_key" text, "encrypted_private_key" jsonb, "encrypted_agent_key" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "max_spend" numeric(20,8) NOT NULL, CONSTRAINT "UQ_89cb385e56f661250131f3fe9d0" UNIQUE ("public_key"), CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "agents"`);
    }

}
