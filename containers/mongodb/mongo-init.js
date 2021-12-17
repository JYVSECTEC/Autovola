// Not in use
db.auth('root', 'example')

db = db.getSiblingDB('autovola')

db.createUser(
        {
            user: "root",
            pwd: "example",
            roles: [
                {
                    role: "readWrite",
                    db: "autovola"
                }
            ]
        }
);
