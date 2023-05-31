import express from "express";
import cors from "cors";
import {createRouter} from "./router.js";
function createServer(plugins) {
    const app = express();
    app.use(express.json());
    app.use(cors());
    app.use(async (req, res, next) => {
        const host = req.headers['host'];        
        const plugin = plugins[host] || plugins['*'];
        if (plugin) {
            const pluginRouter = await createRouter(plugin);
            pluginRouter(req, res, next);
        }
        else {
            res.status(404).send(`No plugin found for host: ${host}`);
        }
    });
    return app;
}

export { createServer }