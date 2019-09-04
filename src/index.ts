import c from "config";

import Conniebot from "./conniebot";
import commands from "./helper/commands";

const conniebot = new Conniebot(c.get("conniebot"));
conniebot.registerCommands(commands);
