import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column("varchar")
  name: string;

  @Column("varchar", { nullable: true })
  image: string

  // @Column()
  // cpu: string;

  // @Column()
  // gpu: string;

  // @Column()
  // memory: string;

  // @Column()
  // storage: string;

  // @Column()
  // volumeMountPath: string;

  @Column()
  sshPort: number;

  @Column()
  codeServerPort: number;

  @Column()
  containerId: string;

  @Column()
  status: string;

  @ManyToOne(() => User, { createForeignKeyConstraints: false })
  @JoinColumn({ name: "userId" })
  user: User

  @CreateDateColumn()
  createdAt: Date
}
