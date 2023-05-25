import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';
import { OpenAIApi, Configuration } from 'openai';

const OPENAI_API_KEY = process.env["OPENAI_API_KEY"];
export const serpAPIKey = process.env["SERPAPI_API_KEY"];
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable not set");
}
const chroma_url = process.env["CHROMA_SERVER_URL"] || "http://localhost:8000";
console.log("chroma_url", chroma_url);
export const chromaClient = new ChromaClient({
  path: chroma_url,
});
export const chromaEmbedder = new OpenAIEmbeddingFunction({
  openai_api_key: OPENAI_API_KEY,
});
const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);
