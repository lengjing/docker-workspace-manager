import "reflect-metadata";
import { DataSource } from "typeorm";
import { Workspace } from "./entities/Workspace";
import { Storage } from "./entities/Storage";
import { User } from "./entities/User";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./dwm.db",
  synchronize: false,
  logging: false,
  entities: [Workspace, Storage, User],
  migrations: ["src/migrations/*.ts"],
});

export const initializeDataSource = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
  }
};