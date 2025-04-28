import mongoose from "mongoose";
import { l } from "../../common/utils";

export class DatabaseClient {
  private client: typeof mongoose;
  private uri: string;
  private dbName: string;

  constructor(uri: string, dbName: string) {
    this.client = mongoose;
    this.uri = uri;
    this.dbName = dbName;
  }

  async connect() {
    try {
      await this.client.connect(this.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        dbName: this.dbName,
      });
      l("Connected to MongoDB");
    } catch (error) {
      l("MongoDB connection error:", error);
    }
  }

  async disconnect() {
    await this.client.disconnect();
    l("Disconnected from MongoDB");
  }

  isConnected() {
    // 0 = disconnected
    // 1 = connected
    // 2 = connecting
    // 3 = disconnecting
    return this.client.connection.readyState === 1;
  }
}
