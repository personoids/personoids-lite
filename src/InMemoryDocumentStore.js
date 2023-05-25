import { v4 as uuidv4 } from 'uuid';
import { chromaClient, chromaEmbedder } from "./chromaClient.js";

export class InMemoryDocumentStore {
  constructor(name, indexedFields) {
    // this.documents = {};
    this.name = name;
    this.indexedFields = indexedFields;

  }
  async initialize() {
    const collection = await chromaClient.getOrCreateCollection({ name: this.name, embeddingFunction: chromaEmbedder });
    this.collection = collection;
  }
  async getDocument(id) {
    // return this.documents[id];
    const results = await this.collection.get({
      ids: [id]
      // limit: 1,
    });
    const document = results.metadatas[0];

    return document;
  }
  async setDocument(id, document) {
    if (id === undefined) {
      id = uuidv4();
    }
    document.id = id;
    var onlyIndexedFields = {};
    this.indexedFields.forEach((field) => {
      onlyIndexedFields[field] = document[field];
    });
    if (this.indexedFields.length === 0)
      onlyIndexedFields = document;
    const txt = JSON.stringify(onlyIndexedFields);
    // const embeddings = await chromaEmbedder.generate(txt);
    const res = await this.collection.upsert({ ids: [id], embeddings: undefined, metadatas: [document], documents: [txt] });
    if (res.errors && res.errors.length > 0) {
      throw new Error(res.errors[0].message);
    }
    if (res.error) {
      throw new Error(res.error);
    }
    return id;
    // this.documents[id] = document;
  }

  async similarity_query(match_string, n = 3, structuredFilter = undefined) {
    const results = await this.collection.query({
      query_text: match_string,
      n_results: n,
      where_document: structuredFilter,
      include: ["document", "metadata"]
    }
    );
    return results.metadatas;
  }
  async structured_query(query, n = 3) {
    const results = await this.collection.get({
      limit: n,
      where_document: query,
      // include: ["document", "metadata"]
    });
    return results.metadatas;
  }
}
