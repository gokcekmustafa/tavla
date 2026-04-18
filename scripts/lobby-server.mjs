process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.PORT = process.env.PORT || "1234";

await import("@y/websocket-server/server");
