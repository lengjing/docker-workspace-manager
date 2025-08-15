import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("varchar", { length: 64, unique: true, comment: "用户名" })
  username: string;

  @Column("varchar", { length: 255, nullable: true, comment: "密码摘要" })
  passwordDigest: string;

  @Index()
  @Column("tinyint", { default: 1, comment: "状态，0 -> 停用 1 -> 启用"})
  status: 0 | 1;

  @CreateDateColumn()
  createdAt: Date;
}
