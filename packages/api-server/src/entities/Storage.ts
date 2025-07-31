import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Storage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  volumePath: string;

  @Column()
  size: string;

  @Column()
  createdAt: Date;
}
