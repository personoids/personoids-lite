import { chromaClient } from "./chromaClient.js";
import { InMemoryDocumentStore } from "./InMemoryDocumentStore.js";

export class InMemoryDocumentStores {
  constructor() {
    this.stores = {};
  }
  async getOrCreateStore(name, indexedFields = []) {
    if (!this.stores[name]) {
      const tempStore = new InMemoryDocumentStore(name, indexedFields);
      await tempStore.initialize();
      this.stores[name] = tempStore;
    }
    return this.stores[name];
  }
  async initialize() {
    global.inMemoryDocumentStore = await this.getOrCreateStore("global", ["text"]);
    global.inMemoryDocumentStoreForMethods = await this.getOrCreateStore("methods", ["name", "description"]);
  }
  async reset() {
    await chromaClient.reset();
    this.stores = {};
    await this.initialize();
  }
}
