import c from "config";

import Conniebot from "./conniebot.js";
import commands from "./helper/commands.js";

const conniebot = new Conniebot(c.get("conniebot"));
conniebot.registerCommands(commands);
