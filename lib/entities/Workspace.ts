import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  cpu: string;

  @Column()
  gpu: string;

  @Column()
  memory: string;

  @Column()
  storage: string;

  @Column()
  volumeMountPath: string;

  @Column()
  sshPort: number;

  @Column()
  dockerContainerId: string;

  @Column()
  status: string;
}
