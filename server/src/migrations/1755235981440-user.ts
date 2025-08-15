import { MigrationInterface, QueryRunner } from "typeorm";

export class User1755235981440 implements MigrationInterface {
    name = 'User1755235981440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar(64) NOT NULL, "passwordDigest" varchar(255), "status" tinyint NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3d44ccf43b8a0d6b9978affb88" ON "user" ("status") `);
        await queryRunner.query(`DROP INDEX "IDX_406f56fc2a42ad5f541973cdbe"`);
        await queryRunner.query(`CREATE TABLE "temporary_workspace" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "sshPort" integer NOT NULL, "codeServerPort" integer NOT NULL, "containerId" varchar NOT NULL, "status" varchar NOT NULL, "image" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "userId" integer)`);
        await queryRunner.query(`INSERT INTO "temporary_workspace"("id", "name", "sshPort", "codeServerPort", "containerId", "status") SELECT "id", "name", "sshPort", "codeServerPort", "containerId", "status" FROM "workspace"`);
        await queryRunner.query(`DROP TABLE "workspace"`);
        await queryRunner.query(`ALTER TABLE "temporary_workspace" RENAME TO "workspace"`);
        await queryRunner.query(`CREATE INDEX "IDX_406f56fc2a42ad5f541973cdbe" ON "workspace" ("name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_406f56fc2a42ad5f541973cdbe"`);
        await queryRunner.query(`ALTER TABLE "workspace" RENAME TO "temporary_workspace"`);
        await queryRunner.query(`CREATE TABLE "workspace" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "sshPort" integer NOT NULL, "codeServerPort" integer NOT NULL, "containerId" varchar NOT NULL, "status" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "workspace"("id", "name", "sshPort", "codeServerPort", "containerId", "status") SELECT "id", "name", "sshPort", "codeServerPort", "containerId", "status" FROM "temporary_workspace"`);
        await queryRunner.query(`DROP TABLE "temporary_workspace"`);
        await queryRunner.query(`CREATE INDEX "IDX_406f56fc2a42ad5f541973cdbe" ON "workspace" ("name") `);
        await queryRunner.query(`DROP INDEX "IDX_3d44ccf43b8a0d6b9978affb88"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
