import c from "config";

import Conniebot from "./bot";

const token = "token";
const database = "database";

if (!c.has(token)) {
    throw new TypeError("Couldn't find a token to connect with.");
}

if (!c.has(database)) {
    throw new TypeError("No database filename listed.");
}

const conniebot = new Conniebot(c.get(token), c.get(database));
