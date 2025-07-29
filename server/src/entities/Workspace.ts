import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  name: string;

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

  // @Column()
  // sideCarContainerId: string;
}
