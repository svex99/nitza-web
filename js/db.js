async function initDB() {
    // Load sqj.js module and database
    const sqlPromise = initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.7.0/${file}`
        });
    const dataPromise = fetch("data/database.db").then(res => res.arrayBuffer());
    const [SQL, buf] = await Promise.all([sqlPromise, dataPromise])
    return new SQL.Database(new Uint8Array(buf));
}
