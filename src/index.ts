import c from "config";

import commands from "./helper/commands.js";
import Conniebot from "./conniebot.js";

const conniebot = new Conniebot(c.get("conniebot"));
conniebot.registerCommands(commands);
