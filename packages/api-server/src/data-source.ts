import "reflect-metadata";
import { DataSource } from "typeorm";
import { Workspace } from "./entities/Workspace";
import { Storage } from "./entities/Storage";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./dwm.db",
  synchronize: true,
  logging: false,
  entities: [Workspace, Storage],
});

export const initializeDataSource = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
  }
};