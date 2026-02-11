module.exports = {
    apps: [{
        name: "sistema-reportes",
        script: "./src/app.js",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        }
    }]
}
